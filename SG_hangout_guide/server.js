/**
 * SG Hangout Guide - Server
 * A simple Express server to serve the SG Hangout Guide application
 */

// Load environment variables from .env file if present
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import cors from 'cors';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Helper function to format an address from venue data
 * @param {Object} venue - The venue object
 * @returns {string} - Formatted address string
 */
function formatAddress(venue) {
  const parts = [];
  if (venue.BLK_NO) parts.push(`Block ${venue.BLK_NO}`);
  if (venue.ROAD_NAME) parts.push(venue.ROAD_NAME);
  if (venue.BUILDING) parts.push(venue.BUILDING);
  if (venue.POSTAL) parts.push(`Singapore ${venue.POSTAL}`);
  return parts.length > 0 ? parts.join(', ') : 'Address unavailable';
}

/**
 * Helper function to determine venue type from venue data
 * @param {Object} venue - The venue object
 * @param {Object} criteria - The search criteria
 * @returns {string} - Determined venue type
 */
function determineVenueType(venue, criteria) {
  const name = (venue.BUILDING || venue.SEARCHVAL || '').toLowerCase();
  
  // More comprehensive venue type detection
  if (name.includes('park') || name.includes('garden')) return 'park';
  if (name.includes('cafe') || name.includes('coffee')) return 'café';
  if (name.includes('restaurant') || name.includes('eatery') || name.includes('dining')) return 'restaurant';
  if (name.includes('mall') || name.includes('shopping')) return 'shopping mall';
  if (name.includes('library')) return 'library';
  if (name.includes('museum')) return 'museum';
  if (name.includes('bar') || name.includes('pub') || name.includes('lounge')) return 'bar';
  if (name.includes('club') || name.includes('disco')) return 'nightclub';
  
  // Religious venue detection
  if (name.includes('church') || name.includes('cathedral') || name.includes('chapel')) return 'church';
  if (name.includes('temple') || name.includes('shrine')) return 'temple';
  if (name.includes('mosque') || name.includes('masjid')) return 'mosque';
  if (name.includes('synagogue')) return 'synagogue';
  
  // Use the activity type from criteria if available
  if (criteria && criteria.activityType) return criteria.activityType.toLowerCase();
  
  return 'hangout spot';
}

/**
 * Helper function to get a default image URL based on venue type
 * @param {string} venueType - The type of venue
 * @returns {string} - URL for a default image
 */
function getDefaultImageUrl(venueType) {
  // Default image URLs based on venue type
  const defaultImages = {
    'restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
    'café': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&q=80',
    'park': 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?w=500&q=80',
    'shopping mall': 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?w=500&q=80',
    'library': 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=500&q=80',
    'museum': 'https://images.unsplash.com/photo-1566127992631-137a642a90f4?w=500&q=80',
    'bar': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=500&q=80',
    'nightclub': 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=500&q=80',
    'church': 'https://images.unsplash.com/photo-1518972559570-7cc1309f3229?w=500&q=80',
    'temple': 'https://images.unsplash.com/photo-1609619385002-f40f1df9b7eb?w=500&q=80',
    'mosque': 'https://images.unsplash.com/photo-1564121211835-e88c852648ab?w=500&q=80',
    'synagogue': 'https://images.unsplash.com/photo-1594970484107-dbf0e1537a8c?w=500&q=80'
  };
  
  // Return the default image URL for the venue type, or a generic one if not found
  return defaultImages[venueType.toLowerCase()] || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&q=80';
}

/**
 * Function to enrich venue data with additional information
 * @param {Object} venue - The venue object
 * @param {Object} criteria - The search criteria
 * @returns {Promise<Object>} - Promise resolving to enriched venue data
 */
async function enrichVenueData(venue, criteria) {
  // Extract all available data from the venue object
  const venueType = determineVenueType(venue, criteria);
  const name = venue.BUILDING || venue.SEARCHVAL || 'Unnamed Location';
  const address = formatAddress(venue);
  const coordinates = {
    latitude: parseFloat(venue.LATITUDE),
    longitude: parseFloat(venue.LONGITUDE)
  };
  
  // Extract additional details from the venue object
  const additionalDetails = {
    postalCode: venue.POSTAL || 'N/A',
    blockNumber: venue.BLK_NO || 'N/A',
    roadName: venue.ROAD_NAME || 'N/A',
    building: venue.BUILDING || 'N/A'
  };
  
  // Use only the venue type determined from the venue name
  let category = venueType;
  
  // Include ranking information if available (without reason)
  const rankInfo = {
    rank: venue.rank || null
  };
  
  // Include image URL if available from OpenAI ranking
  const imageUrl = venue.imageUrl || getDefaultImageUrl(venueType);
  
  // Create a rich result object
  return {
    name: name,
    address: address,
    coordinates: coordinates,
    details: additionalDetails,
    venueType: venueType,
    ranking: rankInfo,
    imageUrl: imageUrl
  };
}

/**
 * Helper function to extract criteria from a query using OpenAI
 * @param {string} query - The user's query
 * @returns {Promise<Object>} - Promise resolving to criteria object
 */
async function extractCriteriaFromQuery(query) {
  const parseMessages = [
    {
      role: 'system',
      content: 'You are an assistant that extracts structured search criteria from a natural language query for a hangout guide in Singapore. Extract the following fields if present: region (one of Singapore regions or neighborhoods), activityType (cafe, restaurant, park, shopping, bar, museum, library, cinema, sports), groupSize (number or range), isIndoor (true/false). Return a JSON object with these fields. If a field is not present, set it to null. For context-based inference: if terms like "romantic", "date", "couple", "anniversary" are present, infer groupSize as 2. If terms like "family" are present without a specific number, infer groupSize as 4. For indoor/outdoor preferences: if terms like "outdoors", "outdoor", "open-air", "alfresco", "rooftop", "garden", "patio" are present, set isIndoor to false. If terms like "indoors", "indoor", "air-conditioned", "sheltered", "inside" are present, set isIndoor to true.'
    },
    {
      role: 'user',
      content: `Extract criteria from this query: "${query}"`
    }
  ];

  const parseCompletion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: parseMessages,
    max_tokens: 150,
    temperature: 0,
    n: 1,
    stop: null,
  });

  // Parse JSON from OpenAI response with more robust error handling
  let criteria = {
    activityType: null,
    region: null,
    groupSize: null,
    isIndoor: null
  };

  try {
    // Try direct parse
    const parseText = parseCompletion.choices[0].message.content.trim();
    const parsedCriteria = JSON.parse(parseText);
    
    // Merge parsed criteria with default object, ensuring type safety
    criteria.activityType = parsedCriteria.activityType || null;
    criteria.region = parsedCriteria.region || null;
    criteria.groupSize = parsedCriteria.groupSize || null;
    criteria.isIndoor = parsedCriteria.isIndoor || null;
  } catch (e) {
    // Try to extract JSON substring from response
    const parseText = parseCompletion.choices[0].message.content.trim();
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
      console.error('Failed to parse criteria JSON:', e);
    }
  }

  return criteria;
}

/**
 * Helper function to create a targeted prompt based on criteria
 * @param {Object} criteria - The extracted criteria
 * @returns {string} - The targeted prompt
 */
function createTargetedPrompt(criteria) {
  let targetedPrompt = 'You are a helpful assistant specialized in suggesting next possible words or phrases specifically for a hangout guide in Singapore.';
  
  // Identify missing criteria to prioritize in suggestions
  const missingCriteria = [];
  if (!criteria.activityType) missingCriteria.push('activity type');
  if (!criteria.region) missingCriteria.push('region');
  if (!criteria.groupSize) missingCriteria.push('group size');
  if (criteria.isIndoor === null) missingCriteria.push('indoor/outdoor preference');
  
  // Add context based on what we've already parsed and what's missing
  targetedPrompt += ' Based on the current query, the following criteria are missing: ' + 
                    (missingCriteria.length > 0 ? missingCriteria.join(', ') : 'none') + '.';
  
  if (criteria.activityType) {
    targetedPrompt += ` The user is looking for ${criteria.activityType} places.`;
  } else {
    targetedPrompt += ' Prioritize suggesting specific activity types like cafe, restaurant, park, shopping, bar, museum, library, cinema, or sports.';
  }
  
  if (criteria.region) {
    targetedPrompt += ` They're interested in the ${criteria.region} region.`;
  } else {
    targetedPrompt += ' Prioritize suggesting specific regions like Central, North, South, East, West, Orchard, Marina Bay, Chinatown, Little India, Sentosa, Jurong, Tampines, or Woodlands.';
  }
  
  if (criteria.groupSize) {
    targetedPrompt += ` They're planning for a group of ${criteria.groupSize}.`;
  } else {
    targetedPrompt += ' Prioritize suggesting group sizes or occasions like "with friends", "for couples", "family-friendly", etc.';
  }
  
  if (criteria.isIndoor !== null) {
    targetedPrompt += criteria.isIndoor ? ' They prefer indoor venues.' : ' They prefer outdoor venues.';
  } else {
    targetedPrompt += ' Prioritize suggesting indoor/outdoor preferences.';
  }
  
  targetedPrompt += ' Provide 3-5 concise, relevant suggestions that help complete the missing criteria in the query. Each suggestion should be a short phrase like "with friends", "in the east", "for dinner", etc. Focus on helping the user specify the missing criteria you identified.';

  return targetedPrompt;
}

/**
 * Helper function to parse suggestions from OpenAI response
 * @param {string} text - The raw text from OpenAI
 * @param {Object} criteria - The extracted criteria
 * @returns {Array} - Array of suggestion strings
 */
function parseSuggestions(text, criteria) {
  // Parse suggestions with more lenient filtering
  let suggestions = text.split(/[,.\n]/)
    .map((s) => s.trim())
    .filter(s => s.length > 0);
    
  // If we have numbered suggestions (like "1. with friends"), extract just the suggestion part
  if (suggestions.some(s => /^\d+\./.test(s))) {
    suggestions = suggestions.map(s => s.replace(/^\d+\.\s*/, '').trim());
  }
  
  // Apply light filtering to ensure quality
  suggestions = suggestions
    .filter(s => s.length >= 2 && s.length <= 30 && !/^\d+$/.test(s))
    .slice(0, 5);
  
  // If no suggestions were found after filtering, provide targeted default ones
  if (suggestions.length === 0) {
    console.log('No valid suggestions found, using targeted defaults');
    
    // Create targeted defaults based on what's missing in the criteria
    const defaults = [];
    
    if (!criteria.activityType) {
      defaults.push('at a cafe', 'at a restaurant', 'in a park', 'for shopping');
    }
    
    if (!criteria.region) {
      defaults.push('in the east', 'in central', 'near Orchard', 'in Chinatown');
    }
    
    if (!criteria.groupSize) {
      defaults.push('with friends', 'for couples', 'with family');
    }
    
    if (criteria.isIndoor === null) {
      defaults.push('indoor', 'outdoor');
    }
    
    // Use the targeted defaults or fall back to generic ones if somehow we still have none
    suggestions = defaults.length > 0 ? defaults.slice(0, 5) : ['with friends', 'in the east', 'for dinner', 'near MRT', 'on weekend'];
  }

  return suggestions;
}

/**
 * Helper function to check grammar in a query
 * @param {string} query - The query to check
 * @returns {Promise<string|null>} - Promise resolving to corrected query or null
 */
async function checkGrammar(query) {
  const grammarMessages = [
    {
      role: 'system',
      content: 'You are a helpful assistant that checks for grammar errors in search queries. If there are grammar errors, suggest a corrected version. If there are no errors, return null. Only focus on actual grammar errors, not style or word choice preferences. Return a JSON object with a "correction" field that contains the corrected query or null if no correction is needed.'
    },
    {
      role: 'user',
      content: `Check this query for grammar errors: "${query}"`
    }
  ];

  const grammarCompletion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: grammarMessages,
    max_tokens: 100,
    temperature: 0,
    n: 1,
    stop: null,
  });

  const grammarText = grammarCompletion.choices[0].message.content.trim();
  
  // Parse grammar correction
  let grammarCorrection = null;
  try {
    const parsedGrammar = JSON.parse(grammarText);
    grammarCorrection = parsedGrammar.correction;
  } catch (e) {
    // Try to extract JSON from the response if direct parsing fails
    const jsonMatch = grammarText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsedGrammar = JSON.parse(jsonMatch[0]);
        grammarCorrection = parsedGrammar.correction;
      } catch (e2) {
        console.error('Failed to parse extracted JSON grammar correction:', e2);
      }
    }
  }

  return grammarCorrection;
}

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
 * POST route for OpenAI chat completions to get next word suggestions and grammar corrections
 */
app.post('/api/openai/chat', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body' });
    }

    console.log('Generating suggestions for query:', query);

    // Extract criteria using the shared function
    const criteria = await extractCriteriaFromQuery(query);

    // Create a targeted prompt based on the criteria we've extracted
    const targetedPrompt = createTargetedPrompt(criteria);

    // Construct messages for chat completion with context for hangout guide in Singapore
    const messages = [
      {
        role: 'system',
        content: targetedPrompt
      },
      {
        role: 'user',
        content: `Suggest the next possible words or short phrases to continue this query: "${query}"`
      }
    ];

    console.log('Using targeted prompt for suggestions:', targetedPrompt);

    // Call OpenAI chat completion for suggestions
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: messages,
      max_tokens: 50,
      temperature: 0.7,
      n: 1,
      stop: null,
    });

    const text = completion.choices[0].message.content.trim();
    console.log('Raw suggestion text from /api/openai/chat:', text);

    // Parse suggestions
    const suggestions = parseSuggestions(text, criteria);

    // Check for grammar errors in the query
    const grammarCorrection = await checkGrammar(query);

    res.json({ 
      suggestions,
      grammarCorrection
    });
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

/**
 * POST route to parse natural query into structured criteria using OpenAI,
 * then search OneMap for hangout spots based on parsed criteria.
 * Also checks for grammar errors in the query.
 */
app.post('/api/hangout/search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body' });
    }

    console.log('Processing hangout search for query:', query);

    // Use OpenAI to parse natural query into structured criteria
    const parseMessages = [
      {
        role: 'system',
        content: 'You are an assistant that extracts structured search criteria from a natural language query for a hangout guide in Singapore. Extract the following fields if present: region (one of Singapore regions or neighborhoods), activityType (cafe, restaurant, park, shopping, bar, museum, library, cinema, sports), groupSize (number or range), isIndoor (true/false). Return a JSON object with these fields. If a field is not present, set it to null. For context-based inference: if terms like "romantic", "date", "couple", "anniversary" are present, infer groupSize as 2. If terms like "family" are present without a specific number, infer groupSize as 4. For indoor/outdoor preferences: if terms like "outdoors", "outdoor", "open-air", "alfresco", "rooftop", "garden", "patio" are present, set isIndoor to false. If terms like "indoors", "indoor", "air-conditioned", "sheltered", "inside" are present, set isIndoor to true.'
      },
      {
        role: 'user',
        content: `Extract criteria from this query: "${query}"`
      }
    ];

    const parseCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: parseMessages,
      max_tokens: 150,
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

    // Create more targeted search terms based on criteria
    let searchTerms = [];
    
    // Construct primary search term
    let primaryTerm = '';
    
    // Add activity type if available
    if (criteria.activityType && typeof criteria.activityType === 'string') {
      primaryTerm = criteria.activityType;
      
      // For bars specifically, add variations to improve results
      if (criteria.activityType.toLowerCase() === 'bar') {
        searchTerms.push('pub');
        searchTerms.push('lounge');
        searchTerms.push('cocktail bar');
      }
    } else {
      // Default to a generic term if no activity type specified
      primaryTerm = 'hangout';
    }
    
    // Add region if available
    if (criteria.region) {
      primaryTerm += ` ${criteria.region}`;
    }
    
    // Add indoor/outdoor if specified
    if (criteria.isIndoor !== null) {
      primaryTerm += criteria.isIndoor ? ' indoor' : ' outdoor';
    }
    
    // Add the primary term to the search terms list
    searchTerms.unshift(primaryTerm);
    
    console.log('Using search terms:', searchTerms);
    
    // Simple in-memory cache for API responses (moved to global scope for persistence between requests)
    if (!global.apiCache) {
      global.apiCache = new Map();
    }
    const apiCache = global.apiCache;
    
    // Function to search OneMap with a specific term
    const searchOneMap = async (term) => {
      // Check if we have a cached response for this term
      const cacheKey = term.toLowerCase().trim();
      if (apiCache.has(cacheKey)) {
        console.log(`Using cached results for "${term}"`);
        return apiCache.get(cacheKey);
      }
      
      const params = new URLSearchParams({
        searchVal: term,
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: '1'
      });
      
      try {
        // Add a timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(
          `https://www.onemap.gov.sg/api/common/elastic/search?${params.toString()}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId); // Clear the timeout if the request completes
        
        if (!response.ok) {
          throw new Error(`OneMap API responded with status ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.results) {
          console.log(`Found ${data.results.length} results for search term "${term}"`);
          
          // Cache the results
          apiCache.set(cacheKey, data.results);
          
          return data.results;
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.error(`Request for "${term}" timed out after 3 seconds`);
        } else {
          console.error(`Error searching OneMap with term "${term}":`, error);
        }
      }
      
      return [];
    };
    
    // Function to get theme-based results for more targeted searches
    const getThemeBasedResults = async (criteria) => {
      // This would normally use the OneMap Theme API with authentication
      // Since we don't have authentication tokens, we'll simulate theme-based results
      // with more targeted search terms based on the activity type
      
      // Map of activity types to potential OneMap themes
      const activityToThemes = {
        'cafe': ['FOOD & BEVERAGE', 'CAFE', 'COFFEE', 'RESTAURANTS'],
        'restaurant': ['FOOD & BEVERAGE', 'RESTAURANTS', 'DINING'],
        'bar': ['FOOD & BEVERAGE', 'NIGHTLIFE', 'BARS', 'PUBS', 'LOUNGES'],
        'park': ['PARKS', 'GARDENS', 'RECREATION', 'NATURE'],
        'shopping': ['SHOPPING', 'RETAIL', 'MALLS', 'MARKETS'],
        'museum': ['CULTURE', 'MUSEUMS', 'GALLERIES', 'ATTRACTIONS'],
        'library': ['EDUCATION', 'LIBRARIES', 'LEARNING'],
        'cinema': ['ENTERTAINMENT', 'CINEMAS', 'THEATRES'],
        'sports': ['SPORTS', 'RECREATION', 'FITNESS'],
        'church': ['RELIGIOUS', 'WORSHIP', 'CHURCHES', 'CATHOLIC', 'CHRISTIAN'],
        'temple': ['RELIGIOUS', 'WORSHIP', 'TEMPLES', 'BUDDHIST', 'HINDU', 'TAOIST'],
        'mosque': ['RELIGIOUS', 'WORSHIP', 'MOSQUES', 'MUSLIM', 'ISLAMIC'],
        'synagogue': ['RELIGIOUS', 'WORSHIP', 'SYNAGOGUES', 'JEWISH']
      };
      
      // Get relevant themes based on activity type
      let relevantThemes = ['PLACES OF INTEREST'];
      if (criteria.activityType && activityToThemes[criteria.activityType.toLowerCase()]) {
        relevantThemes = activityToThemes[criteria.activityType.toLowerCase()];
      }
      
      console.log(`Using theme-based search with themes: ${relevantThemes.join(', ')}`);
      
      // Construct search terms using themes and region, but limit the number
      let themeSearchTerms = [];
      
      // If region is specified, prioritize that region with all themes
      if (criteria.region) {
        // Use only the most relevant theme with the region for better focus
        const primaryTheme = relevantThemes[0]; // Use the first (most relevant) theme
        themeSearchTerms.push(`${primaryTheme} ${criteria.region}`);
      } else if (criteria.activityType) {
        // Without a region but with activity type, use the primary theme with the most popular region
        const primaryTheme = relevantThemes[0];
        themeSearchTerms.push(`${primaryTheme} Orchard`); // Orchard is a popular area
      }
      
      // Use the already defined searchTerms from earlier in the code
      // This avoids duplicating the search terms construction logic
      
      // Combine with theme-based search terms - use a Set to eliminate duplicates
      const allSearchTermsSet = new Set([...searchTerms, ...themeSearchTerms]);
      const allSearchTerms = [...allSearchTermsSet];
      console.log('Using combined search terms:', allSearchTerms);
      
      // Search with all terms in parallel, but check cache first
      console.log('Making parallel API calls for all search terms');
      
      // First, check which terms are already cached to avoid unnecessary API calls
      const cachedTerms = [];
      const uncachedTerms = [];
      
      for (const term of allSearchTerms) {
        const cacheKey = term.toLowerCase().trim();
        if (apiCache.has(cacheKey)) {
          cachedTerms.push(term);
        } else {
          uncachedTerms.push(term);
        }
      }
      
      console.log(`Found ${cachedTerms.length} cached terms and ${uncachedTerms.length} uncached terms`);
      
      // Get cached results first
      const cachedResults = cachedTerms.map(term => {
        const cacheKey = term.toLowerCase().trim();
        console.log(`Using cached results for "${term}"`);
        return apiCache.get(cacheKey);
      });
      
      // Only make API calls for uncached terms
      let newResults = [];
      if (uncachedTerms.length > 0) {
        console.log(`Making API calls for ${uncachedTerms.length} uncached terms`);
        const searchPromises = uncachedTerms.map(term => searchOneMap(term));
        newResults = await Promise.all(searchPromises);
      }
      
      // Combine cached and new results
      const searchResults = [...cachedResults, ...newResults];
      
      // Combine all results into a single array and remove duplicates
      const allResultsMap = new Map();
      for (const results of searchResults) {
        for (const result of results) {
          const key = result.BUILDING || result.SEARCHVAL || '';
          if (key) {
            allResultsMap.set(key.toLowerCase(), result);
          }
        }
      }
      
      // Convert map values to array
      const allResults = [...allResultsMap.values()];
      
      // Limit to first 20 results if we have more
      if (allResults.length > 20) {
        allResults.slice(0, 20);
      }
      
      return allResults;
    };
    
    // Get results using theme-based search
    let allResults = await getThemeBasedResults(criteria);
    
    // If still no results, try a more generic search
    if (allResults.length === 0) {
      console.log('No results found, trying more generic search');
      
      // Check if the query contains religious terms
      const religiousTerms = ['church', 'temple', 'mosque', 'synagogue', 'cathedral', 'chapel', 'worship', 'religious'];
      const isReligiousQuery = query.toLowerCase().split(' ').some(word => religiousTerms.includes(word));
      
      // For religious queries, use more specific search terms
      if (isReligiousQuery) {
        // Extract specific religion from query if possible
        let religion = null;
        if (query.toLowerCase().includes('catholic') || query.toLowerCase().includes('christian')) {
          religion = 'catholic church';
        } else if (query.toLowerCase().includes('buddhist') || query.toLowerCase().includes('hindu') || 
                  query.toLowerCase().includes('taoist')) {
          religion = 'temple';
        } else if (query.toLowerCase().includes('muslim') || query.toLowerCase().includes('islam')) {
          religion = 'mosque';
        } else if (query.toLowerCase().includes('jewish') || query.toLowerCase().includes('judaism')) {
          religion = 'synagogue';
        } else if (query.toLowerCase().includes('church')) {
          religion = 'church';
        }
        
        // Use the specific religion term or a generic religious term
        const religiousTerm = religion || 'place of worship';
        console.log(`Using religious search term: "${religiousTerm}"`);
        const religiousResults = await searchOneMap(religiousTerm);
        allResults = [...allResults, ...religiousResults];
      } else {
        // For non-religious queries, use the generic approach
        const genericTerm = criteria.activityType || 'hangout spot';
        const genericResults = await searchOneMap(genericTerm);
        allResults = [...allResults, ...genericResults];
      }
    }
    
    // Generic filtering to improve result relevance for all search types
    const filterIrrelevantResults = (results, criteria) => {
      // Define categories of infrastructure that are typically not hangout spots
      const infrastructureKeywords = ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'CAR PARK', 'CARPARK'];
      
      // Define category-specific filters
      const categoryFilters = {
        'bar': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'SCHOOL', 'HOSPITAL'],
        'cafe': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE'],
        'restaurant': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE'],
        'park': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'BUILDING'],
        'shopping': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'SCHOOL', 'HOSPITAL'],
        'museum': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE'],
        'library': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE'],
        'cinema': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE'],
        'sports': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE'],
        'church': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'SPORTS', 'FIRE', 'POLICE'],
        'temple': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'SPORTS', 'FIRE', 'POLICE'],
        'mosque': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'SPORTS', 'FIRE', 'POLICE'],
        'synagogue': ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'SPORTS', 'FIRE', 'POLICE']
      };
      
      // Get the appropriate filter keywords based on activity type
      let filterKeywords = infrastructureKeywords;
      if (criteria.activityType && categoryFilters[criteria.activityType.toLowerCase()]) {
        filterKeywords = categoryFilters[criteria.activityType.toLowerCase()];
      }
      
      // Apply the filter
      const filteredResults = results.filter(result => {
        const name = (result.BUILDING || result.SEARCHVAL || '').toUpperCase();
        // Check if the name contains any of the filter keywords
        return !filterKeywords.some(keyword => name.includes(keyword));
      });
      
      console.log(`After filtering out irrelevant results, ${filteredResults.length} of ${results.length} results remain`);
      return filteredResults;
    };
    
    // Apply the generic filter
    allResults = filterIrrelevantResults(allResults, criteria);
    
    // Count occurrences of each place and keep track of unique results
    const uniqueResults = [];
    const seenNames = new Set();
    const occurrenceCounts = new Map();
    
    for (const result of allResults) {
      const name = result.BUILDING || result.SEARCHVAL || '';
      const normalizedName = name.toLowerCase().trim();
      
      // Skip empty names
      if (!normalizedName) continue;
      
      // Increment occurrence count
      if (occurrenceCounts.has(normalizedName)) {
        occurrenceCounts.set(normalizedName, occurrenceCounts.get(normalizedName) + 1);
      } else {
        occurrenceCounts.set(normalizedName, 1);
      }
      
      // Only add to unique results if we haven't seen this name before
      if (!seenNames.has(normalizedName)) {
        seenNames.add(normalizedName);
        // Add occurrence count to the result object for sorting later
        result.occurrenceCount = occurrenceCounts.get(normalizedName);
        uniqueResults.push(result);
      } else {
        // Update the occurrence count for the existing result
        const existingResult = uniqueResults.find(r => {
          const existingName = (r.BUILDING || r.SEARCHVAL || '').toLowerCase().trim();
          return existingName === normalizedName;
        });
        if (existingResult) {
          existingResult.occurrenceCount = occurrenceCounts.get(normalizedName);
        }
      }
    }
    
    // Ensure consistent number of results (always return 5 or all available if less than 5)
    const maxResults = 5;
    
    // Only search for additional terms if we don't have enough results
    // We need at least maxResults unique results
    if (uniqueResults.length < maxResults) {
      console.log(`Search returned only ${uniqueResults.length} results (need ${maxResults}), adding more flexible search terms`);
      
      // Add more generic search terms to find additional results
      let additionalTerms = [];
      
      // Add terms based on activity type
      if (criteria.activityType) {
        if (criteria.activityType.toLowerCase() === 'shopping') {
          additionalTerms = ['mall', 'plaza', 'centre', 'center', 'shopping complex', 'retail', 'outlet', 'store'];
        } else if (criteria.activityType.toLowerCase() === 'cafe') {
          additionalTerms = ['coffee', 'bistro', 'bakery', 'brunch', 'tea'];
        } else if (criteria.activityType.toLowerCase() === 'restaurant') {
          additionalTerms = ['dining', 'eatery', 'food', 'cuisine', 'bistro'];
        } else if (criteria.activityType.toLowerCase() === 'park') {
          additionalTerms = ['garden', 'nature', 'reserve', 'outdoor', 'recreation'];
        } else if (criteria.activityType.toLowerCase() === 'church' || query.toLowerCase().includes('church')) {
          additionalTerms = ['catholic church', 'cathedral', 'chapel', 'christian', 'catholic', 'parish'];
        } else if (criteria.activityType.toLowerCase() === 'temple' || query.toLowerCase().includes('temple')) {
          additionalTerms = ['buddhist temple', 'hindu temple', 'taoist temple', 'shrine'];
        } else if (criteria.activityType.toLowerCase() === 'mosque' || query.toLowerCase().includes('mosque')) {
          additionalTerms = ['masjid', 'islamic center', 'muslim'];
        } else if (criteria.activityType.toLowerCase() === 'synagogue' || query.toLowerCase().includes('synagogue')) {
          additionalTerms = ['jewish', 'judaism'];
        } else {
          // Generic terms for other activity types
          additionalTerms = ['place', 'spot', 'location', 'venue', 'destination'];
        }
      } else {
        // Check if query contains religious terms
        if (query.toLowerCase().includes('church') || query.toLowerCase().includes('catholic') || 
            query.toLowerCase().includes('christian')) {
          additionalTerms = ['catholic church', 'cathedral', 'chapel', 'christian', 'catholic', 'parish'];
        } else if (query.toLowerCase().includes('temple') || query.toLowerCase().includes('buddhist') || 
                  query.toLowerCase().includes('hindu') || query.toLowerCase().includes('taoist')) {
          additionalTerms = ['buddhist temple', 'hindu temple', 'taoist temple', 'shrine'];
        } else if (query.toLowerCase().includes('mosque') || query.toLowerCase().includes('muslim') || 
                  query.toLowerCase().includes('islam')) {
          additionalTerms = ['masjid', 'islamic center', 'muslim'];
        } else if (query.toLowerCase().includes('synagogue') || query.toLowerCase().includes('jewish') || 
                  query.toLowerCase().includes('judaism')) {
          additionalTerms = ['jewish', 'judaism'];
        } else {
          // Generic terms for no activity type
          additionalTerms = ['place', 'spot', 'location', 'venue', 'destination', 'mall', 'plaza'];
        }
      }
      
      // Add region-specific terms if a region is specified, but be more selective
      if (criteria.region) {
        // Get region variations but limit to just a few
        const regionVariations = getRegionVariations(criteria.region).slice(0, 2);
        
        // Only use the first few additional terms to reduce combinations
        const limitedAdditionalTerms = additionalTerms.slice(0, 2);
        
        // Create a limited set of region-specific terms
        const regionTerms = [];
        for (const term of limitedAdditionalTerms) {
          for (const region of regionVariations) {
            regionTerms.push(`${term} ${region}`);
          }
        }
        
        // Add a limited number of region variations to additional terms
        additionalTerms = [...additionalTerms.slice(0, 3), ...regionTerms.slice(0, 3)];
      } else {
        // Without a region, just limit the number of additional terms
        additionalTerms = additionalTerms.slice(0, 3);
      }
      
      // Limit the number of additional terms to search based on how many more results we need
      const neededResults = maxResults - uniqueResults.length;
      const termsToSearch = additionalTerms.slice(0, Math.min(additionalTerms.length, neededResults));
      
      if (termsToSearch.length > 0) {
        console.log(`Making parallel API calls for ${termsToSearch.length} additional search terms to find ${neededResults} more results`);
        
        // Search with additional terms in parallel
        const searchPromises = termsToSearch.map(term => searchOneMap(term));
        const searchResults = await Promise.all(searchPromises);
        
        // Process all results
        for (const results of searchResults) {
          // Use less strict filtering for additional results
          const filteredResults = results.filter(result => {
            const name = (result.BUILDING || result.SEARCHVAL || '').toUpperCase();
            // Only filter out obvious infrastructure
            const infrastructureKeywords = ['MRT STATION', 'BUS TERMINAL', 'BUS INTERCHANGE', 'CAR PARK'];
            return !infrastructureKeywords.some(keyword => name.includes(keyword));
          });
          
          // Add unique results until we reach the maximum
          for (const result of filteredResults) {
            if (uniqueResults.length >= maxResults) break;
            
            const name = result.BUILDING || result.SEARCHVAL || '';
            const normalizedName = name.toLowerCase().trim();
            
            // Skip empty names
            if (!normalizedName) continue;
            
            // Only add if we haven't seen this name before
            if (!seenNames.has(normalizedName)) {
              seenNames.add(normalizedName);
              uniqueResults.push(result);
            }
          }
          
          // If we have enough results, stop processing
          if (uniqueResults.length >= maxResults) break;
        }
      }
    } else {
      console.log(`Already have ${uniqueResults.length} results, no need for additional search terms`);
    }
    
    // Helper function to get variations of a region name
    function getRegionVariations(region) {
      const variations = [region];
      
      // Add common variations for Singapore regions
      if (region.toLowerCase() === 'orchard') {
        variations.push('Somerset', 'Dhoby Ghaut', 'Scotts Road');
      } else if (region.toLowerCase() === 'marina bay') {
        variations.push('Downtown', 'Raffles Place', 'Bayfront');
      } else if (region.toLowerCase() === 'chinatown') {
        variations.push('Outram', 'Tanjong Pagar', 'Telok Ayer');
      } else if (region.toLowerCase() === 'woodlands') {
        variations.push('Marsiling', 'Admiralty', 'Woodlands North');
      } else if (region.toLowerCase() === 'jurong') {
        variations.push('Jurong East', 'Jurong West', 'Boon Lay', 'Lakeside');
      }
      
      return variations;
    }
    
    // Filter out obvious infrastructure to ensure we have quality places to rank
    const placesToRank = uniqueResults.filter(result => {
      const name = (result.BUILDING || result.SEARCHVAL || '').toUpperCase();
      
      // Define terms to filter out
      const infrastructureTerms = ['MRT', 'STATION', 'EXIT', 'BUS', 'TERMINAL', 'INTERCHANGE', 'CAR PARK'];
      
      // For religious queries, also filter out sports centers, fire posts, and police posts
      if (query.toLowerCase().includes('church') || query.toLowerCase().includes('temple') || 
          query.toLowerCase().includes('mosque') || query.toLowerCase().includes('synagogue') ||
          query.toLowerCase().includes('catholic') || query.toLowerCase().includes('christian') ||
          query.toLowerCase().includes('buddhist') || query.toLowerCase().includes('hindu') ||
          query.toLowerCase().includes('muslim') || query.toLowerCase().includes('jewish')) {
        infrastructureTerms.push('SPORTS', 'FIRE', 'POLICE', 'NEIGHBOURHOOD', 'NEIGHBORHOOD');
      }
      
      return !infrastructureTerms.some(term => name.includes(term));
    });
    
    console.log(`Sending ${placesToRank.length} unique results to OpenAI for ranking`);
    
    // Variable to store enriched results
    let enrichedResults = null;
    
    // If we have places to rank, use OpenAI to rank them
    if (placesToRank.length > 0) {
      try {
        // Prepare place information for OpenAI
        const placeInfos = placesToRank.map(place => {
          const name = place.BUILDING || place.SEARCHVAL || 'Unnamed Location';
          const address = place.ROAD_NAME ? `${place.ROAD_NAME}` : '';
          const postalCode = place.POSTAL ? `Singapore ${place.POSTAL}` : '';
          return `${name}${address ? ', ' + address : ''}${postalCode ? ', ' + postalCode : ''}`;
        });
        
        // Create a prompt for OpenAI to rank the places (without images or reasons)
        let rankingPrompt = `
        I'm looking for places that match this query: "${query}"
        
        Here are some places found:
        ${placeInfos.map((info, index) => `${index + 1}. ${info}`).join('\n')}
        
        Please rank these places based on how well they match the query. Consider factors like relevance to the query, popularity, and location most significantly.
        
        For religious queries (like churches, temples, mosques), prioritize actual places of worship over other venues with similar names.
        For "catholic church" queries, prioritize actual Catholic churches over other types of buildings.
        
        Return a JSON array with objects containing:
        1. "index": the original index (1-based) from the list above
        2. "rank": your ranking (1 is best)
        
        Example response format:
        [
          {"index": 3, "rank": 1},
          {"index": 1, "rank": 2},
          ...
        ]
        `;
        
        // Call OpenAI to rank the places
        const rankingMessages = [
          {
            role: 'system',
            content: 'You are a helpful assistant that ranks places based on how well they match a search query. You also provide representative image URLs for each place.'
          },
          {
            role: 'user',
            content: rankingPrompt
          }
        ];
        
        const rankingCompletion = await openai.chat.completions.create({
          model: "gpt-4.1-mini",
          messages: rankingMessages,
          max_tokens: 1000,
          temperature: 0.2,
          n: 1,
          stop: null,
        });
        
        const rankingText = rankingCompletion.choices[0].message.content.trim();
        console.log('Raw ranking response from OpenAI:', rankingText);
        
        // Extract JSON from the response
        let rankingData = [];
        try {
          // Try to parse the entire response as JSON
          rankingData = JSON.parse(rankingText);
        } catch (e) {
          // If that fails, try to extract JSON from the response
          const jsonMatch = rankingText.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            try {
              rankingData = JSON.parse(jsonMatch[0]);
            } catch (e2) {
              console.error('Failed to parse extracted JSON ranking:', e2);
            }
          } else {
            console.error('Failed to parse ranking JSON:', e);
          }
        }
        
        // If we successfully parsed the ranking data, sort the results
        if (rankingData && rankingData.length > 0) {
          // Map the ranking data back to the original places
          const rankedPlaces = rankingData
            .sort((a, b) => a.rank - b.rank) // Sort by rank (1 is best)
            .map(rankInfo => {
              const originalIndex = rankInfo.index - 1; // Convert 1-based to 0-based
              if (originalIndex >= 0 && originalIndex < placesToRank.length) {
                const place = placesToRank[originalIndex];
                // Add ranking info to the place
                place.rank = rankInfo.rank;
                place.rankReason = rankInfo.reason;
                place.imageUrl = rankInfo.imageUrl;
                return place;
              }
              return null;
            })
            .filter(place => place !== null); // Remove any nulls
          
          // Get the top ranked places
          const topRankedPlaces = rankedPlaces.slice(0, maxResults);
          
          console.log(`Places ranked by OpenAI, returning top ${topRankedPlaces.length} results`);
          
          // Process all venues to add rich information
          enrichedResults = await Promise.all(
            topRankedPlaces.map(venue => enrichVenueData(venue, criteria))
          );
        } else {
          // If ranking failed, fall back to basic sorting
          console.log('Ranking failed, falling back to basic sorting');
          uniqueResults.sort((a, b) => {
            const nameA = (a.BUILDING || a.SEARCHVAL || '').toUpperCase();
            const nameB = (b.BUILDING || b.SEARCHVAL || '').toUpperCase();
            return nameA.localeCompare(nameB);
          });
        }
      } catch (error) {
        console.error('Error ranking places with OpenAI:', error);
        // Fall back to basic sorting
        uniqueResults.sort((a, b) => {
          const nameA = (a.BUILDING || a.SEARCHVAL || '').toUpperCase();
          const nameB = (b.BUILDING || b.SEARCHVAL || '').toUpperCase();
          return nameA.localeCompare(nameB);
        });
      }
    } else {
      console.log('No suitable places to rank, using basic sorting');
      // Fall back to basic sorting
      uniqueResults.sort((a, b) => {
        const nameA = (a.BUILDING || a.SEARCHVAL || '').toUpperCase();
        const nameB = (b.BUILDING || b.SEARCHVAL || '').toUpperCase();
        return nameA.localeCompare(nameB);
      });
    }

    // Generate a description for the venue (not used in the current implementation)
    const generateDescription = (venue) => {
      const venueType = determineVenueType(venue, criteria);
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
    
    
    // If ranking failed or no places to rank, fall back to basic sorting and limiting
    if (!enrichedResults || enrichedResults.length === 0) {
      console.log('Ranking failed or no places to rank, using basic sorting');
      
      // Sort by name
      uniqueResults.sort((a, b) => {
        const nameA = (a.BUILDING || a.SEARCHVAL || '').toUpperCase();
        const nameB = (b.BUILDING || b.SEARCHVAL || '').toUpperCase();
        return nameA.localeCompare(nameB);
      });
      
      // Get top results
      const topResults = uniqueResults.slice(0, maxResults);
      
      // Process these venues to add rich information
      enrichedResults = await Promise.all(
        topResults.map(venue => enrichVenueData(venue, criteria))
      );
      
      // Continue with the rest of the function using enrichedResults
    }

    // Generate suggestions for next words based on parsed criteria
    // Create a more targeted prompt based on the criteria we've extracted
    let targetedPrompt = 'You are a helpful assistant generating suggestions for continuing a hangout search query in Singapore.';
    
    // Identify missing criteria to prioritize in suggestions
    const missingCriteria = [];
    if (!criteria.activityType) missingCriteria.push('activity type');
    if (!criteria.region) missingCriteria.push('region');
    if (!criteria.groupSize) missingCriteria.push('group size');
    if (criteria.isIndoor === null) missingCriteria.push('indoor/outdoor preference');
    
    // Add context based on what we've already parsed and what's missing
    targetedPrompt += ' Based on the current query, the following criteria are missing: ' + 
                      (missingCriteria.length > 0 ? missingCriteria.join(', ') : 'none') + '.';
    
    if (criteria.activityType) {
      targetedPrompt += ` The user is looking for ${criteria.activityType} places.`;
    } else {
      targetedPrompt += ' Prioritize suggesting specific activity types like cafe, restaurant, park, shopping, bar, museum, library, cinema, or sports.';
    }
    
    if (criteria.region) {
      targetedPrompt += ` They're interested in the ${criteria.region} region.`;
    } else {
      targetedPrompt += ' Prioritize suggesting specific regions like Central, North, South, East, West, Orchard, Marina Bay, Chinatown, Little India, Sentosa, Jurong, Tampines, or Woodlands.';
    }
    
    if (criteria.groupSize) {
      targetedPrompt += ` They're planning for a group of ${criteria.groupSize}.`;
    } else {
      targetedPrompt += ' Prioritize suggesting group sizes or occasions like "with friends", "for couples", "family-friendly", etc.';
    }
    
    if (criteria.isIndoor !== null) {
      targetedPrompt += criteria.isIndoor ? ' They prefer indoor venues.' : ' They prefer outdoor venues.';
    } else {
      targetedPrompt += ' Prioritize suggesting indoor/outdoor preferences.';
    }
    
    targetedPrompt += ' Provide 3-5 concise, relevant suggestions that help complete the missing criteria in the query. Each suggestion should be a short phrase like "with friends", "in the east", "for dinner", etc. Focus on helping the user specify the missing criteria you identified.';
    
    const suggestMessages = [
      {
        role: 'system',
        content: targetedPrompt
      },
      {
        role: 'user',
        content: `Suggest ways to complete this query: "${query}"`
      }
    ];

    console.log('Using targeted prompt for suggestions:', targetedPrompt);

    const suggestionCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: suggestMessages,
      max_tokens: 50,
      temperature: 0.7,
      n: 1,
      stop: null,
    });

    const suggestionText = suggestionCompletion.choices[0].message.content.trim();
    console.log('Raw suggestion text from /api/hangout/search:', suggestionText);
    
    // Parse suggestions with more lenient filtering
    let suggestions = suggestionText.split(/[,.\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
      
    // If we have numbered suggestions (like "1. with friends"), extract just the suggestion part
    if (suggestions.some(s => /^\d+\./.test(s))) {
      suggestions = suggestions.map(s => s.replace(/^\d+\.\s*/, '').trim());
    }
    
    // Apply light filtering to ensure quality
    suggestions = suggestions
      .filter(s => s.length >= 2 && s.length <= 30 && !/^\d+$/.test(s))
      .slice(0, 5);
      
    console.log('Processed suggestions from /api/hangout/search:', suggestions);

    // If no suggestions were found after filtering, provide targeted default ones
    if (suggestions.length === 0) {
      console.log('No valid suggestions found, using targeted defaults');
      
      // Create targeted defaults based on what's missing in the criteria
      const defaults = [];
      
      if (!criteria.activityType) {
        defaults.push('at a cafe', 'at a restaurant', 'in a park', 'for shopping');
      }
      
      if (!criteria.region) {
        defaults.push('in the east', 'in central', 'near Orchard', 'in Chinatown');
      }
      
      if (!criteria.groupSize) {
        defaults.push('with friends', 'for couples', 'with family');
      }
      
      if (criteria.isIndoor === null) {
        defaults.push('indoor', 'outdoor');
      }
      
      // Use the targeted defaults or fall back to generic ones if somehow we still have none
      suggestions = defaults.length > 0 ? defaults.slice(0, 5) : ['with friends', 'in the east', 'for dinner', 'near MRT', 'on weekend'];
    }

    // Fix grammar in suggestions to ensure they work well when appended to the query
    const fixSuggestionGrammar = (suggestion, query) => {
      // Remove leading articles if they would create redundancy
      if (suggestion.startsWith('a ') || suggestion.startsWith('an ') || suggestion.startsWith('the ')) {
        suggestion = suggestion.replace(/^(a|an|the) /, '');
      }
      
      // If the suggestion starts with a verb and the query already has a verb, adjust
      const commonVerbs = ['go', 'find', 'visit', 'looking', 'want', 'need', 'search'];
      const hasVerb = commonVerbs.some(verb => query.toLowerCase().includes(verb));
      const startsWithVerb = commonVerbs.some(verb => suggestion.toLowerCase().startsWith(verb));
      
      if (hasVerb && startsWithVerb) {
        // Remove the verb from the suggestion
        for (const verb of commonVerbs) {
          if (suggestion.toLowerCase().startsWith(verb)) {
            suggestion = suggestion.substring(verb.length).trim();
            // Remove "for" or "to" if they follow the verb
            suggestion = suggestion.replace(/^(for|to) /, '');
            break;
          }
        }
      }
      
      // Ensure the suggestion starts with appropriate preposition if needed
      if (!suggestion.startsWith('with ') && !suggestion.startsWith('in ') && 
          !suggestion.startsWith('at ') && !suggestion.startsWith('for ') && 
          !suggestion.startsWith('near ') && !suggestion.startsWith('by ')) {
        
        // Check if we need to add a preposition based on context
        if (suggestion.includes('friends') || suggestion.includes('family') || 
            suggestion.includes('couples') || suggestion.includes('group')) {
          suggestion = 'with ' + suggestion;
        } else if (suggestion.includes('view') || suggestion.includes('atmosphere') || 
                  suggestion.includes('seating') || suggestion.includes('ambiance')) {
          suggestion = 'with ' + suggestion;
        }
      }
      
      return suggestion;
    };
    
    // Apply grammar fixes to all suggestions
    const fixedSuggestions = suggestions.map(s => fixSuggestionGrammar(s, query));
    
    // Check for grammar errors in the query
    const grammarMessages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that checks for grammar errors in search queries. If there are grammar errors, suggest a corrected version. If there are no errors, return null. Only focus on actual grammar errors, not style or word choice preferences. Return a JSON object with a "correction" field that contains the corrected query or null if no correction is needed.'
      },
      {
        role: 'user',
        content: `Check this query for grammar errors: "${query}"`
      }
    ];

    const grammarCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: grammarMessages,
      max_tokens: 100,
      temperature: 0,
      n: 1,
      stop: null,
    });

    const grammarText = grammarCompletion.choices[0].message.content.trim();
    console.log('Raw grammar check text:', grammarText);

    // Parse grammar correction
    let grammarCorrection = null;
    try {
      const parsedGrammar = JSON.parse(grammarText);
      grammarCorrection = parsedGrammar.correction;
    } catch (e) {
      console.error('Failed to parse grammar correction JSON:', e);
      // Try to extract JSON from the response if direct parsing fails
      const jsonMatch = grammarText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedGrammar = JSON.parse(jsonMatch[0]);
          grammarCorrection = parsedGrammar.correction;
        } catch (e2) {
          console.error('Failed to parse extracted JSON grammar correction:', e2);
        }
      }
    }

    // Use the enriched results instead of the basic formatted results
    // Include the raw OpenAI response for debugging
    res.json({
      results: enrichedResults,
      suggestions: fixedSuggestions,
      rawCriteria: parseText, // Include the raw OpenAI response
      parsedCriteria: criteria, // Include the parsed criteria
      grammarCorrection // Include grammar correction if available
    });

  } catch (error) {
    console.error('Error in /api/hangout/search:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    }
    res.status(500).json({ 
      error: 'Failed to perform hangout search',
      suggestions: ['with friends', 'in the east', 'for dinner', 'near MRT', 'on weekend'] // Default suggestions on error
    });
  }
});

/**
 * POST route for grammar checking
 * Only checks grammar when a suggestion is selected
 */
app.post('/api/grammar/check', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Missing query in request body' });
    }

    console.log('Checking grammar for query:', query);

    // Check for grammar errors in the query
    const grammarMessages = [
      {
        role: 'system',
        content: 'You are a helpful assistant that checks for grammar errors in search queries. If there are grammar errors, suggest a corrected version. If there are no errors, return null. Only focus on actual grammar errors, not style or word choice preferences. Return a JSON object with a "correction" field that contains the corrected query or null if no correction is needed.'
      },
      {
        role: 'user',
        content: `Check this query for grammar errors: "${query}"`
      }
    ];

    const grammarCompletion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: grammarMessages,
      max_tokens: 100,
      temperature: 0,
      n: 1,
      stop: null,
    });

    const grammarText = grammarCompletion.choices[0].message.content.trim();
    console.log('Raw grammar check text:', grammarText);

    // Parse grammar correction
    let grammarCorrection = null;
    try {
      const parsedGrammar = JSON.parse(grammarText);
      grammarCorrection = parsedGrammar.correction;
    } catch (e) {
      console.error('Failed to parse grammar correction JSON:', e);
      // Try to extract JSON from the response if direct parsing fails
      const jsonMatch = grammarText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsedGrammar = JSON.parse(jsonMatch[0]);
          grammarCorrection = parsedGrammar.correction;
        } catch (e2) {
          console.error('Failed to parse extracted JSON grammar correction:', e2);
        }
      }
    }

    res.json({ grammarCorrection });
  } catch (error) {
    console.error('Error in grammar check:', error);
    res.status(500).json({ error: 'Failed to check grammar' });
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

// Start server
const server = app.listen(PORT, () => {
  console.log(`SG Hangout Guide server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server');
});

// Export for potential testing or module usage
export { app, server };
