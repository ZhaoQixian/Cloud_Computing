import React from 'react';

/**
 * Suggestions component displays clickable suggestion buttons
 * @param {Object} props - Component props
 * @param {Array} props.suggestions - Array of suggestion objects
 * @param {Function} props.onSuggestionClick - Function to handle suggestion clicks
 */
const Suggestions = ({ suggestions, onSuggestionClick }) => {
  // If no suggestions, don't render anything
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="suggestions-container">
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.text}-${index}`}
          className="suggestion-button"
          onClick={() => onSuggestionClick(suggestion.value)}
        >
          {suggestion.text}
        </button>
      ))}
    </div>
  );
};

export default Suggestions;
