import React, { useState, useEffect, useRef } from 'react';
import apiService from '../services/api';
import Suggestions from './Suggestions';
import Results from './Results';

const HangoutGuide = () => {
  // State management
  const [query, setQuery] = useState('');
  const [criteria, setCriteria] = useState({
    groupSize: null,
    isIndoor: null,
    region: null,
    activityType: null
  });
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const inputRef = useRef(null);
  
  // Effect to focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Effect to fetch suggestions whenever query changes
  useEffect(() => {
    fetchOpenAISuggestions(query);
  }, [query]);
  
  /**
   * Fetch suggestions from OpenAI API based on current query
   * @param {string} inputQuery - Current user input query
   */
  const fetchOpenAISuggestions = async (inputQuery) => {
    if (!inputQuery || inputQuery.trim() === '') {
      setSuggestions([]);
      return;
    }
    try {
      const openAISuggestions = await apiService.getOpenAISuggestions(inputQuery);
      // Map suggestions to objects with text and value for Suggestions component
      const mappedSuggestions = openAISuggestions.map(s => ({ text: s, value: s }));
      setSuggestions(mappedSuggestions);
    } catch (error) {
      console.error('Failed to fetch OpenAI suggestions:', error);
      setSuggestions([]);
    }
  };
  
  /**
   * Append a suggestion to the user input
   * @param {string} suggestion - Suggestion text to append
   */
  const appendSuggestion = (suggestion) => {
    // Add space if needed
    const separator = query && !query.endsWith(' ') ? ' ' : '';
    
    // Append the suggestion
    setQuery(query + separator + suggestion);
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Get a list of missing criteria that are required for search
   * @returns {Array} - Array of missing criteria descriptions
   */
  const getMissingCriteria = () => {
    const missing = [];
    
    // Make groupSize and isIndoor optional for search
    // Require only region and activityType
    if (!criteria.region) missing.push('region in Singapore');
    if (!criteria.activityType) missing.push('activity type');
    
    return missing;
  };

  /**
   * Handle input changes
   * @param {Event} event - Input change event
   */
  const handleInputChange = (event) => {
    setQuery(event.target.value);
  };
  
  /**
   * Handle search button click or Enter key press
   */
  const handleSearch = async () => {
    if (!query || query.trim() === '') {
      setError('Please enter a search query.');
      return;
    }
    
    // Set loading state
    setIsLoading(true);
    setError(null);
    
    try {
      // Call the API to find hangout spots using natural query
      const hangoutSpots = await apiService.findHangoutSpots(query);
      
      // Update state with results
      setResults(hangoutSpots);
    } catch (error) {
      console.error('Error searching for hangout spots:', error);
      setError('Failed to find hangout spots. Please try again.');
    } finally {
      // Clear loading state
      setIsLoading(false);
    }
  };
  
  /**
   * Handle Enter key press in input field
   * @param {Event} event - Keyboard event
   */
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };
  
  return (
    <div className="chat-container">
      <div className="input-container">
        <input
          type="text"
          className="user-input"
          value={query}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="I want to go to..."
          ref={inputRef}
          disabled={isLoading}
        />
        <button
          className="send-button"
          onClick={handleSearch}
          disabled={isLoading}
        >
          Search
        </button>
      </div>
      
      <Suggestions suggestions={suggestions} onSuggestionClick={appendSuggestion} />
      
      <Results results={results} isLoading={isLoading} error={error} />
    </div>
  );
};

export default HangoutGuide;
