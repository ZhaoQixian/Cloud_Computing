
import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Search for places using OneMap API
 * @param {Object} params - Search parameters
 * @param {string} params.searchVal - Search value (e.g., "cafe", "park")
 * @param {number} params.pageNum - Page number for pagination
 * @param {string} [params.returnGeom=Y] - Return geometry (Y/N)
 * @param {string} [params.getAddrDetails=Y] - Get address details (Y/N)
 * @returns {Promise<Object>} - Promise resolving to search results
 */
export const searchOneMap = async (params) => {
  try {
    const response = await api.get('/api/onemap/search', { params });
    return response.data;
  } catch (error) {
    console.error('Error searching OneMap:', error);
    throw error;
  }
};

/**
 * Get venue details based on latitude and longitude
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<Object>} - Promise resolving to venue details
 */
export const getVenueDetails = async (latitude, longitude) => {
  try {
    const response = await api.get('/api/onemap/revgeocode', {
      params: {
        location: `${latitude},${longitude}`,
        buffer: 50,
        addressType: 'All',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error getting venue details:', error);
    throw error;
  }
};

/**
 * Search for hangout spots based on natural query using backend parsing and search
 * @param {string} query - Natural language user query
 * @returns {Promise<Array>} - Promise resolving to array of venue objects
 */
export const findHangoutSpots = async (query) => {
  try {
    const response = await api.post('/api/hangout/search', { query });
    return response.data;
  } catch (error) {
    console.error('Error finding hangout spots:', error);
    throw error;
  }
};

/**
 * Filter and format venue results based on user criteria
 * @param {Object} searchResults - Raw search results from OneMap
 * @param {Object} criteria - User criteria for filtering
 * @returns {Array} - Array of formatted venue objects
 */
const formatVenueResults = (searchResults, criteria) => {
  if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
    return [];
  }

  // Extract relevant information from search results
  return searchResults.results.map(result => {
    // Generate a description based on the venue type and user criteria
    let description = generateDescription(result, criteria);
    
    return {
      name: result.BUILDING || result.SEARCHVAL || 'Unnamed Location',
      description: description,
      address: formatAddress(result),
      latitude: parseFloat(result.LATITUDE),
      longitude: parseFloat(result.LONGITUDE)
    };
  });
};

/**
 * Generate a description for a venue based on its attributes and user criteria
 * @param {Object} venue - Venue data from OneMap
 * @param {Object} criteria - User criteria
 * @returns {string} - Generated description
 */
const generateDescription = (venue, criteria) => {
  // This is a simplified version - in a real app, you would have more sophisticated logic
  // based on venue attributes and user preferences
  
  const venueType = determineVenueType(venue);
  const groupSize = criteria.groupSize || 'any size group';
  const isIndoor = criteria.isIndoor;
  const region = criteria.region || 'Singapore';
  
  let description = `A ${venueType} suitable for ${groupSize}`;
  
  if (isIndoor !== undefined) {
    description += isIndoor ? ' in an indoor setting' : ' with outdoor space';
  }
  
  if (region && region.toLowerCase() !== 'singapore') {
    description += ` located in ${region}`;
  }
  
  return description + '.';
};

/**
 * Determine the type of venue based on its attributes
 * @param {Object} venue - Venue data
 * @returns {string} - Venue type description
 */
const determineVenueType = (venue) => {
  // This is a simplified implementation
  // In a real app, you would have more sophisticated logic to determine venue types
  
  const name = (venue.BUILDING || venue.SEARCHVAL || '').toLowerCase();
  
  if (name.includes('park') || name.includes('garden')) {
    return 'park';
  } else if (name.includes('cafe') || name.includes('coffee')) {
    return 'café';
  } else if (name.includes('restaurant') || name.includes('eatery')) {
    return 'restaurant';
  } else if (name.includes('mall') || name.includes('shopping')) {
    return 'shopping mall';
  } else if (name.includes('library')) {
    return 'library';
  } else if (name.includes('museum')) {
    return 'museum';
  } else {
    return 'hangout spot';
  }
};

/**
 * Format address from venue data
 * @param {Object} venue - Venue data
 * @returns {string} - Formatted address
 */
const formatAddress = (venue) => {
  const parts = [];
  
  if (venue.BLK_NO) parts.push(`Block ${venue.BLK_NO}`);
  if (venue.ROAD_NAME) parts.push(venue.ROAD_NAME);
  if (venue.BUILDING) parts.push(venue.BUILDING);
  if (venue.POSTAL) parts.push(`Singapore ${venue.POSTAL}`);
  
  return parts.length > 0 ? parts.join(', ') : 'Address unavailable';
};

/**
 * Get next word or phrase suggestions from OpenAI chat completions
 * @param {string} query - Current user input query
 * @returns {Promise<Array<string>>} - Promise resolving to array of suggestion strings
 */
export const getOpenAISuggestions = async (query) => {
  try {
    const response = await api.post('/api/openai/chat', { query });
    return response.data.suggestions || [];
  } catch (error) {
    console.error('Error getting OpenAI suggestions:', error);
    return [];
  }
};

export default {
  searchOneMap,
  getVenueDetails,
  findHangoutSpots,
  getOpenAISuggestions
};
