# SG Hangout Guide

A React-based conversational widget that helps users find hangout spots in Singapore through natural language interaction, powered by OpenAI and OneMap API.

## Features

- **Natural Language Input**: Users can type queries in natural language (e.g., "I want to go to a cafe in the east with friends")
- **AI-Powered Query Parsing**: Uses OpenAI to understand and extract search criteria
- **Progressive Prompt Suggestions**: Dynamically suggests missing information as users type
- **OneMap API Integration**: Uses Singapore's OneMap API to find relevant venues
- **Comprehensive Results**: Returns multiple matching venues with details and descriptions
- **Intelligent Venue Selection**: Randomizes and filters results for diverse recommendations
- **Responsive Design**: Works on both desktop and mobile devices
- **React Frontend**: Modern component-based UI with React
- **Express Backend**: Robust server with API proxying and error handling

## Recent Updates

- Improved OneMap API endpoint to use the latest `/common/elastic/search`
- Enhanced search result generation with more diverse and randomized results
- Added robust error handling for OpenAI response parsing
- Improved logging and debugging capabilities

## Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- OpenAI API Key
- OneMap API Access (if required)

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd sg-hangout-guide
   ```

2. Install dependencies:
   ```
   npm install
   npm run client-install
   ```

3. Create a `.env` file in the root directory and add:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the application:
   ```
   npm run dev-full
   ```

5. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## Usage

1. Type your query in the input field (e.g., "Looking for a place to hang out")
2. The widget will analyze your input and suggest missing information
3. Click on suggestions to add them to your query or continue typing
4. Once you've provided enough information, click "Search" or press Enter
5. View the results showing matching hangout spots in Singapore

## Example Queries

- "I want to go to a cafe"
- "Looking for outdoor activities in the west"
- "Places to eat with a large group in Orchard"
- "Indoor activities for two people in the east"

## Project Structure

```
sg-hangout-guide/
├── client/                     # React client application
│   ├── public/                 # Public assets
│   │   ├── index.html          # HTML entry point
│   │   └── manifest.json       # Web app manifest
│   ├── src/                    # Source code
│   │   ├── components/         # React components
│   │   │   ├── HangoutGuide.js # Main widget component
│   │   │   ├── Suggestions.js  # Suggestions component
│   │   │   └── Results.js      # Results display component
│   │   ├── services/           # Service modules
│   │   │   └── api.js          # API service for OneMap
│   │   ├── styles/             # CSS styles
│   │   │   ├── App.css         # App-specific styles
│   │   │   └── index.css       # Global styles
│   │   ├── App.js              # Main App component
│   │   └── index.js            # React entry point
│   └── package.json            # Client dependencies
├── server.js                   # Express server for API proxying
├── package.json                # Server dependencies and scripts
└── .env                        # Environment configuration
```

## Technologies Used

- React.js for the frontend UI components
- OpenAI GPT for natural language processing
- Express.js for the backend server
- OneMap API for Singapore location data
- Node.js runtime environment
- HTML5, CSS3, JavaScript (ES6+)

## Troubleshooting

- Ensure your OpenAI API key is valid and has sufficient credits
- Check console logs for detailed error messages
- Verify network connectivity to OneMap and OpenAI APIs

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Contact

Project Link: [Your Project Repository URL]
