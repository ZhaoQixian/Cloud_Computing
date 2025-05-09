import React from 'react';

/**
 * Results component displays search results, loading state, or error messages
 * @param {Object} props - Component props
 * @param {Array} props.results - Array of result objects
 * @param {boolean} props.isLoading - Whether results are loading
 * @param {string} props.error - Error message, if any
 */
const Results = ({ results, isLoading, error }) => {
  // If loading, show loading indicator
  if (isLoading) {
    return (
      <div className="results-container">
        <div className="loading">Finding the perfect hangout spots...</div>
      </div>
    );
  }
  
  // If error, show error message
  if (error) {
    return (
      <div className="results-container">
        <div className="error">{error}</div>
      </div>
    );
  }
  
  // If no results yet, don't render anything
  if (!results || results.length === 0) {
    return null;
  }
  
  // Render results with fade-in animation
  return (
    <div className="results-container">
      <div className="results-summary">
        Found {results.length} hangout spots matching your criteria.
      </div>
      
      {results.map((result, index) => (
        <div key={`result-${index}`} className="result-card fade-in">
          <div>
            <div className="result-name">{result.name}</div>
            
            <div className="result-address">{result.address}</div>
            
            {/* Display additional details if available */}
            {result.details && (
              <div className="result-details">
                {result.details.postalCode !== 'N/A' && (
                  <div className="detail-item">
                    <span className="detail-label">Postal Code:</span> {result.details.postalCode}
                  </div>
                )}
              </div>
            )}
            
            <div className="result-coordinates">
              Coordinates: {result.coordinates ? 
                `${result.coordinates.latitude}, ${result.coordinates.longitude}` : 
                `${result.latitude}, ${result.longitude}`}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Results;
