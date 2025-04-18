import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../services/api';
import Suggestions from './Suggestions';
import Results from './Results';
import debounce from 'lodash/debounce';

const HangoutGuide = () => {
  // State management
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [suggestedFilters, setSuggestedFilters] = useState(null);
  const [rawCriteria, setRawCriteria] = useState(null);
  const [parsedCriteria, setParsedCriteria] = useState(null);
  const [grammarCorrection, setGrammarCorrection] = useState(null);
  const [prevResults, setPrevResults] = useState([]);
  const [resultsChanged, setResultsChanged] = useState(false);
  const [typing, setTyping] = useState(false);
  const [suggestionClicked, setSuggestionClicked] = useState(false);
  
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Reference to track the latest request
  const latestRequestRef = useRef(0);
  
  // Effect to focus input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  /**
   * Fetch suggestions and results from API based on current query
   * @param {string} inputQuery - Current user input query
   */
  const fetchDataFromAPI = async (inputQuery) => {
    if (!inputQuery || inputQuery.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Generate a timestamp for this request
    const requestTimestamp = Date.now();
    latestRequestRef.current = requestTimestamp;
    
    try {
      // Set loading state for real-time feedback
      setIsLoading(true);
      
      // Make a single API call instead of three parallel calls to the same endpoint
      const response = await apiService.findHangoutSpots(inputQuery);
      
      // Only update state if this is still the latest request
      if (requestTimestamp === latestRequestRef.current) {
        // Extract data from the single response
        const hangoutSpots = response.results || [];
        const openAISuggestions = response.suggestions || [];
        
        // Store raw OpenAI response if available
        if (response.rawCriteria) {
          setRawCriteria(response.rawCriteria);
        }
        
        // Store parsed criteria if available
        if (response.parsedCriteria) {
          setParsedCriteria(response.parsedCriteria);
        }
        
        // Store grammar correction if available
        if (response.grammarCorrection) {
          setGrammarCorrection(response.grammarCorrection);
        } else {
          setGrammarCorrection(null);
        }
        
        // Map suggestions to objects with text and value for Suggestions component
        const mappedSuggestions = openAISuggestions.map(s => ({ text: s, value: s }));
        setSuggestions(mappedSuggestions);
        
        // Check if results changed compared to previous
        const newResults = hangoutSpots.slice(0, 10);
        const changed = JSON.stringify(newResults) !== JSON.stringify(prevResults);
        setResultsChanged(changed);
        setPrevResults(newResults);
        
        // Update results
        setResults(newResults);
        
        // Extract filter information from the first result if available
        if (hangoutSpots.length > 0) {
          const suggestedFilterOptions = {
            activityType: hangoutSpots[0].category || null,
            region: hangoutSpots[0].address?.split(',').pop()?.trim() || null,
            groupSize: null,
            environment: null
          };
          setSuggestedFilters(suggestedFilterOptions);
        }
        
        setError(null);
        
        console.log('Updated UI with latest results from request:', requestTimestamp);
      } else {
        console.log('Ignoring outdated results from request:', requestTimestamp);
      }
    } catch (error) {
      // Only update error state if this is still the latest request
      if (requestTimestamp === latestRequestRef.current) {
        console.error('Failed to fetch data from API:', error);
        setSuggestions([]);
        setError('Failed to find hangout spots. Please try again.');
      }
    } finally {
      // Only update loading state if this is still the latest request
      if (requestTimestamp === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Create a debounced version of fetchDataFromAPI with a longer delay
  const debouncedFetchData = useCallback(
    debounce((inputQuery) => {
      fetchDataFromAPI(inputQuery);
    }, 500), // Wait for 0.5 seconds of inactivity before sending requests
    []
  );
  
  // Effect to fetch data whenever query changes
  useEffect(() => {
    debouncedFetchData(query);
    
    // Cleanup function to cancel any pending debounced calls
    return () => {
      debouncedFetchData.cancel();
    };
  }, [query, debouncedFetchData]);
  
  /**
   * Append a suggestion to the user input and check for grammar errors
   * @param {string} suggestion - Suggestion text to append
   */
  const appendSuggestion = async (suggestion) => {
    // Add space if needed
    const separator = query && !query.endsWith(' ') ? ' ' : '';
    
    // Create the new query with the suggestion
    const newQuery = query + separator + suggestion;
    
    // First, check for grammar errors in the new query and get the corrected query
    const correctedQuery = await checkGrammarAndApply(newQuery);
    
    // Then, fetch data with the corrected query
    fetchDataFromAPI(correctedQuery);
    
    // Focus back on input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };
  
  /**
   * Check grammar in the query and apply correction if needed
   * @param {string} inputQuery - Query to check
   * @returns {Promise<string>} - Promise resolving to the corrected query or original query if no correction needed
   */
  const checkGrammarAndApply = async (inputQuery) => {
    try {
      // Set loading state
      setIsLoading(true);
      
      // Call the API to check grammar
      const response = await apiService.checkGrammar(inputQuery);
      
      // If there's a grammar correction, apply it automatically
      if (response.grammarCorrection) {
        setQuery(response.grammarCorrection);
        return response.grammarCorrection;
      } else {
        // If no correction needed, just set the original query
        setQuery(inputQuery);
        return inputQuery;
      }
    } catch (error) {
      console.error('Failed to check grammar:', error);
      // If there's an error, just set the original query
      setQuery(inputQuery);
      return inputQuery;
    } finally {
      setIsLoading(false);
    }
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
   * This now acts as a manual trigger for the same functionality
   * that happens automatically when typing
   */
  const handleSearch = () => {
    if (!query || query.trim() === '') {
      setError('Please enter a search query.');
      return;
    }
    
    // Force an immediate fetch without waiting for debounce
    fetchDataFromAPI(query);
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
          // Remove the disabled attribute to allow typing while loading
        />
      </div>
      
      <Suggestions suggestions={suggestions} onSuggestionClick={appendSuggestion} />
      
      <Results results={results} isLoading={isLoading} error={error} />
    </div>
  );
};

export default HangoutGuide;
