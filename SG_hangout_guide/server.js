/**
 * SG Hangout Guide - Server
 * A simple Express server to serve the SG Hangout Guide application
 */

// Load environment variables from .env file if present
require('dotenv').config();

const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const cors = require('cors');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
} else {
  app.use(express.static(path.join(__dirname, 'client/public')));
}

/**
 * Proxy route for OneMap API to avoid CORS issues
 * This allows the frontend to make requests to the OneMap API through our server
 */
app.get('/api/onemap/search', async (req, res) => {
  try {
    const { searchVal, returnGeom, getAddrDetails, pageNum } = req.query;

    // Construct OneMap API URL with updated endpoint
    const oneMapUrl = `https://www.onemap.gov.sg/api/common/elastic/search`
      + `?searchVal=${encodeURIComponent(searchVal)}`
      + `&returnGeom=${returnGeom || 'Y'}`
      + `&getAddrDetails=${getAddrDetails || 'Y'}`
      + `&pageNum=${pageNum || 1}`;

    // Fetch data from OneMap API
    const response = await fetch(oneMapUrl);
    if (!response.ok) throw new Error(`OneMap API responded with status ${response.status}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying OneMap search request:', error);
    res.status(500).json({ error: 'Failed to fetch data from OneMap API' });
  }
});

/**
 * POST route for OpenAI chat completions to get next word suggestions
 */
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body' });
    }

    // Construct messages for chat completion with context for hangout guide in Singapore
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant specialized in suggesting next possible words or phrases specifically for a hangout guide in Singapore. Your suggestions should be relevant to activities, places, events, and experiences in Singapore. Provide 3 concise suggestions separated by commas.'
      },
      {
        role: 'user',
        content: `Suggest the next possible words or short phrases to continue this query: "${query}"`
      }
    ];

    // Call OpenAI chat completion
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: messages,
      max_completion_tokens: 30,
      temperature: 0.7,
      n: 1,
      stop: null,
    });

    const text = completion.choices[0].message.content.trim();

    // Parse suggestions from response text (assumed comma separated)
    const suggestions = text.split(",").map((s) => s.trim()).filter((s) => s.length > 0);

    res.json({ suggestions });
  } catch (error) {
    console.error('Error in OpenAI chat completion:', error);
    res.status(500).json({ error: 'Failed to get suggestions from OpenAI' });
  }
});

/**
 * Proxy route for OneMap reverse geocoding API
 */
app.get('/api/onemap/revgeocode', async (req, res) => {
    try {
        const { location, buffer, addressType } = req.query;
        
        // Construct OneMap API URL
        const oneMapUrl = `https://developers.onemap.sg/privateapi/commonsvc/revgeocode?location=${encodeURIComponent(location)}&buffer=${buffer || 50}&addressType=${addressType || 'All'}`;
        
        // Fetch data from OneMap API
        const response = await fetch(oneMapUrl);
        const data = await response.json();
        
        // Return data to client
        res.json(data);
    } catch (error) {
        console.error('Error proxying OneMap reverse geocode request:', error);
        res.status(500).json({ error: 'Failed to fetch data from OneMap API' });
    }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'client/public', 'index.html'));
    }
});

/**
 * POST route to parse natural query into structured criteria using OpenAI,
 * then search OneMap for hangout spots based on parsed criteria.
 */
app.post('/api/hangout/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body' });
    }

    // Use OpenAI to parse natural query into structured criteria
    const parseMessages = [
      {
        role: 'system',
        content: 'You are an assistant that extracts structured search criteria from a natural language query for a hangout guide in Singapore. Extract the following fields if present: region (one of Singapore regions or neighborhoods), activityType (cafe, restaurant, park, shopping, bar, museum, library, cinema, sports), groupSize (number or range), isIndoor (true/false). Return a JSON object with these fields. If a field is not present, set it to null.'
      },
      {
        role: 'user',
        content: `Extract criteria from this query: "${query}"`
      }
    ];

    const parseCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: parseMessages,
      max_completion_tokens: 150,
      temperature: 0,
      n: 1,
      stop: null,
    });

    // Log the raw OpenAI response for debugging
    const parseText = parseCompletion.choices[0].message.content.trim();
    console.log('Raw OpenAI response:', parseText);

    // Parse JSON from OpenAI response with more robust error handling
    let criteria = {
      activityType: null,
      region: null,
      groupSize: null,
      isIndoor: null
    };

    try {
      // Try direct parse
      const parsedCriteria = JSON.parse(parseText);
      
      // Merge parsed criteria with default object, ensuring type safety
      criteria.activityType = parsedCriteria.activityType || null;
      criteria.region = parsedCriteria.region || null;
      criteria.groupSize = parsedCriteria.groupSize || null;
      criteria.isIndoor = parsedCriteria.isIndoor || null;
    } catch (e) {
      // Try to extract JSON substring from response
      const jsonMatch = parseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedCriteria = JSON.parse(jsonMatch[0]);
          
          // Merge parsed criteria with default object, ensuring type safety
          criteria.activityType = parsedCriteria.activityType || null;
          criteria.region = parsedCriteria.region || null;
          criteria.groupSize = parsedCriteria.groupSize || null;
          criteria.isIndoor = parsedCriteria.isIndoor || null;
        } catch (e2) {
          console.error('Failed to parse extracted JSON criteria:', e2, jsonMatch[0]);
        }
      } else {
        console.error('Failed to parse criteria JSON:', e, parseText);
      }
    }

    // Log the final parsed criteria
    console.log('Parsed Criteria:', criteria);

    const singaporeRegions = [
      'Central', 'North', 'South', 'East', 'West', 
      'Orchard', 'Marina Bay', 'Chinatown', 'Little India', 
      'Sentosa', 'Jurong', 'Tampines', 'Woodlands'
    ];

    const activityTypeMap = {
      'cafe': ['cafe', 'coffee shop', 'coffee house', 'tea house', 'bakery'],
      'restaurant': ['restaurant', 'eatery', 'food centre', 'dining', 'bistro', 'cuisine'],
      'park': ['park', 'garden', 'nature reserve', 'green space', 'recreational area'],
      'shopping': ['mall', 'shopping centre', 'retail', 'marketplace', 'shopping district'],
      'bar': ['bar', 'pub', 'cocktail bar', 'lounge', 'nightclub'],
      'museum': ['museum', 'gallery', 'exhibition', 'cultural centre', 'art space'],
      'library': ['library', 'reading room', 'study space', 'book centre'],
      'cinema': ['cinema', 'movie theatre', 'film centre', 'screening room'],
      'sports': ['sports centre', 'gym', 'fitness centre', 'recreation club', 'stadium']
    };

    // Determine search terms based on activity type
    let searchTerms = [];
    if (criteria.activityType && typeof criteria.activityType === 'string') {
      const lowercaseType = criteria.activityType.toLowerCase();
      searchTerms = activityTypeMap[lowercaseType] || [lowercaseType];
    } else {
      // If no specific activity type, use a mix of diverse terms
      searchTerms = [
        ...activityTypeMap['cafe'], 
        ...activityTypeMap['restaurant'], 
        ...activityTypeMap['park'], 
        ...activityTypeMap['shopping']
      ];
    }

    // Add region specificity if provided
    if (criteria.region) {
      const regionLower = criteria.region.toLowerCase();
      const matchedRegion = singaporeRegions.find(r => r.toLowerCase() === regionLower);
      
      if (matchedRegion) {
        searchTerms = searchTerms.map(term => `${term} near ${matchedRegion}`);
      } else {
        searchTerms = searchTerms.map(term => `${term} ${criteria.region}`);
      }
    }

    // Add some randomness to search terms
    searchTerms = searchTerms.sort(() => 0.5 - Math.random()).slice(0, 5);

    console.log('Search Terms:', searchTerms);

    // Perform searches for each term and combine results
    const searchPromises = searchTerms.map(term => {
      const params = new URLSearchParams({
        searchVal: term,
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: '1'
      });
      return fetch(`https://www.onemap.gov.sg/api/common/elastic/search?${params.toString()}`)
        .then(res => {
          if (!res.ok) {
            console.error(`Search failed for term: ${term}, status: ${res.status}`);
            return null;
          }
          return res.json();
        })
        .catch(error => {
          console.error(`Error searching for term: ${term}`, error);
          return null;
        });
    });

    const searchResults = await Promise.all(searchPromises);

    // Combine and deduplicate results with more sophisticated filtering
    let allResults = [];
    let seenNames = new Set();
    let seenLocations = new Set();

    searchResults.forEach((result, index) => {
      if (result && result.results) {
        console.log(`Results for search term "${searchTerms[index]}":`, result.results.length);
        
        result.results.forEach(venue => {
          const venueName = venue.BUILDING || venue.SEARCHVAL || 'Unnamed Location';
          const venueLocation = `${venue.LATITUDE},${venue.LONGITUDE}`;
          
          // More complex deduplication
          const isUnique = 
            !seenNames.has(venueName) && 
            !seenLocations.has(venueLocation);
          
          if (isUnique) {
            seenNames.add(venueName);
            seenLocations.add(venueLocation);
            allResults.push(venue);
          }
        });
      }
    });

    // If results are too few, relax filtering
    if (allResults.length < 5) {
      console.log('Few results found, relaxing filtering');
      seenNames.clear();
      seenLocations.clear();
      
      searchResults.forEach(result => {
        if (result && result.results) {
          result.results.forEach(venue => {
            const venueName = venue.BUILDING || venue.SEARCHVAL || 'Unnamed Location';
            if (!seenNames.has(venueName)) {
              seenNames.add(venueName);
              allResults.push(venue);
            }
          });
        }
      });
    }

    // Randomize and limit results
    allResults = allResults
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(allResults.length, 15));

    console.log(`Total unique results found: ${allResults.length}`);

    // Format results similar to existing formatVenueResults
    const formatAddress = (venue) => {
      const parts = [];
      if (venue.BLK_NO) parts.push(`Block ${venue.BLK_NO}`);
      if (venue.ROAD_NAME) parts.push(venue.ROAD_NAME);
      if (venue.BUILDING) parts.push(venue.BUILDING);
      if (venue.POSTAL) parts.push(`Singapore ${venue.POSTAL}`);
      return parts.length > 0 ? parts.join(', ') : 'Address unavailable';
    };

    const determineVenueType = (venue) => {
      const name = (venue.BUILDING || venue.SEARCHVAL || '').toLowerCase();
      if (name.includes('park') || name.includes('garden')) return 'park';
      if (name.includes('cafe') || name.includes('coffee')) return 'café';
      if (name.includes('restaurant') || name.includes('eatery')) return 'restaurant';
      if (name.includes('mall') || name.includes('shopping')) return 'shopping mall';
      if (name.includes('library')) return 'library';
      if (name.includes('museum')) return 'museum';
      return 'hangout spot';
    };

    const generateDescription = (venue) => {
      const venueType = determineVenueType(venue);
      const groupSize = criteria.groupSize || 'any size group';
      const isIndoor = criteria.isIndoor;
      const region = criteria.region || 'Singapore';
      let description = `A ${venueType} suitable for ${groupSize}`;
      if (isIndoor !== undefined && isIndoor !== null) {
        description += isIndoor ? ' in an indoor setting' : ' with outdoor space';
      }
      if (region && region.toLowerCase() !== 'singapore') {
        description += ` located in ${region}`;
      }
      return description + '.';
    };

    const formattedResults = allResults.map(venue => ({
      name: venue.BUILDING || venue.SEARCHVAL || 'Unnamed Location',
      description: generateDescription(venue),
      address: formatAddress(venue),
      latitude: parseFloat(venue.LATITUDE),
      longitude: parseFloat(venue.LONGITUDE)
    }));

    res.json(formattedResults);

  } catch (error) {
    console.error('Error in /api/hangout/search:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    res.status(500).json({ error: 'Failed to perform hangout search' });
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`SG Hangout Guide server running at http://localhost:${PORT}`);
    console.log('Press Ctrl+C to stop the server');
});
