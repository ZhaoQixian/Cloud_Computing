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
 * @returns {Promise<Object>} - Promise resolving to object with results, suggestions, and grammar correction
 */
export const findHangoutSpots = async (query) => {
  try {
    const response = await api.post('/api/hangout/search', { query });
    
    // Log suggestions for debugging
    if (response.data.suggestions) {
      console.log('OpenAI Suggestions:', response.data.suggestions);
    }
    
    // Log grammar correction if available
    if (response.data.grammarCorrection) {
      console.log('Grammar Correction:', response.data.grammarCorrection);
    }
    
    // Return the complete response data with results, suggestions, and grammar correction
    return {
      results: response.data.results || [],
      suggestions: response.data.suggestions || [],
      grammarCorrection: response.data.grammarCorrection || null,
      rawCriteria: response.data.rawCriteria || null,
      parsedCriteria: response.data.parsedCriteria || null
    };
  } catch (error) {
    console.error('Error finding hangout spots:', error);
    // Return empty arrays for both results and suggestions on error
    return { results: [], suggestions: [] };
  }
};

/**
 * Check grammar in a query and get correction if needed
 * @param {string} query - Query to check for grammar errors
 * @returns {Promise<Object>} - Promise resolving to object with grammar correction
 */
export const checkGrammar = async (query) => {
  try {
    const response = await api.post('/api/grammar/check', { query });
    
    // Log grammar correction if available
    if (response.data.grammarCorrection) {
      console.log('Grammar Correction:', response.data.grammarCorrection);
    }
    
    return {
      grammarCorrection: response.data.grammarCorrection || null
    };
  } catch (error) {
    console.error('Error checking grammar:', error);
    return { grammarCorrection: null };
  }
};

export default {
  searchOneMap,
  getVenueDetails,
  findHangoutSpots,
  checkGrammar
};
