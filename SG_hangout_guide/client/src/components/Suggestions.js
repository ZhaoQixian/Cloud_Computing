import React, { useState } from 'react';

/**
 * Suggestions component displays clickable suggestion buttons
 * @param {Object} props - Component props
 * @param {Array} props.suggestions - Array of suggestion objects
 * @param {Function} props.onSuggestionClick - Function to handle suggestion clicks
 */

const Suggestions = ({ suggestions, onSuggestionClick }) => {
  const [clickedIndex, setClickedIndex] = useState(null);

  // If no suggestions, don't render anything
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const handleClick = (value, index) => {
    setClickedIndex(index);
    onSuggestionClick(value);
    setTimeout(() => {
      setClickedIndex(null);
    }, 500); // Reset animation state after 500ms
  };

  return (
    <div className="suggestions-container">
      {suggestions.map((suggestion, index) => (
        <button
          key={`${suggestion.text}-${index}`}
          className={`suggestion-button ${clickedIndex === index ? 'clicked' : ''}`}
          onClick={() => handleClick(suggestion.value, index)}
        >
          {suggestion.text}
        </button>
      ))}
    </div>
  );
};

export default Suggestions;
