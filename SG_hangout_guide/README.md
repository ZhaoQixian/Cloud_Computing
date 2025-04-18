# SG Hangout Guide

![Website Image](./Website_Image.png)

SG Hangout Guide is a web application that helps users find the perfect hangout spots in Singapore based on natural language queries. It leverages the OneMap API for location data and OpenAI's GPT models to parse user queries, generate suggestions, check grammar, and rank recommended venues.

## Features

- Natural language search for hangout spots such as cafes, restaurants, parks, shopping malls, bars, museums, libraries, cinemas, and more.
- Intelligent query parsing to extract search criteria like region, activity type, group size, and indoor/outdoor preference.
- Real-time suggestions to help users refine their search queries.
- Grammar checking and automatic correction of user queries.
- Ranking of search results based on relevance to the query using OpenAI.
- Proxying of OneMap API requests to avoid CORS issues.
- Responsive React frontend with an interactive search interface.

## Cloud Computing and Query Processing

The SG Hangout Guide leverages cloud computing services to process user queries efficiently and intelligently:

- **OpenAI API Integration:** The backend server uses OpenAI's GPT-4.1-mini model hosted in the cloud to parse natural language queries into structured search criteria. This allows the app to understand complex user inputs such as activity type, region, group size, and indoor/outdoor preferences.

- **Cloud-based Ranking and Suggestions:** OpenAI is also used to generate real-time suggestions for query refinement and to rank search results based on relevance, popularity, and location. This offloads heavy natural language processing and ranking computations to the cloud, ensuring fast and scalable responses.

- **OneMap API for Location Data:** The app queries the OneMap API, a cloud-based geospatial service provided by Singapore's government, to retrieve venue data such as cafes, parks, and restaurants. The backend proxies these requests to avoid CORS issues and caches results to optimize performance.

- **Server as a Cloud Gateway:** The Express server acts as a gateway between the frontend and these cloud services, managing API keys securely, handling request throttling, caching, and error handling to provide a seamless user experience.

This architecture allows the SG Hangout Guide to provide intelligent, context-aware hangout spot recommendations without requiring heavy local computation, leveraging cloud resources for scalability and advanced AI capabilities.
## Project Structure

- `server.js`: Express backend server handling API requests, OpenAI integration, and serving the React frontend.
- `client/`: React frontend application.
  - `src/components/HangoutGuide.js`: Main component managing user input, fetching suggestions and results, and displaying them.
  - `src/components/Suggestions.js`: Component to display query suggestions.
  - `src/components/Results.js`: Component to display search results.
  - `src/services/api.js`: API service module for frontend-backend communication.
- `.env`: Environment variables including `OPENAI_API_KEY` and optional `PORT`.

## Getting Started

### Prerequisites

- Node.js (v14 or later recommended)
- npm or yarn
- OpenAI API key (sign up at [OpenAI](https://openai.com) to get an API key)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd SG_hangout_guide
   ```

2. Install server dependencies:

   ```bash
   npm install
   ```

3. Install client dependencies:

   ```bash
   cd client
   npm install
   cd ..
   ```

4. Create a `.env` file in the `SG_hangout_guide` directory with the following content:

   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=5000
   ```

### Running the Application

1. Start the server (which also serves the React frontend):

   ```bash
   npm start
   ```

2. Open your browser and navigate to `http://localhost:5000`.

3. Use the search input to type natural language queries like:

   - "Find a cafe in Orchard for two"
   - "Looking for a park with outdoor seating"
   - "Best restaurants in Marina Bay for family"

4. The app will provide suggestions to refine your query and display ranked hangout spots based on your input.

## API Endpoints

- `GET /api/onemap/search`: Proxy to OneMap search API.
- `GET /api/onemap/revgeocode`: Proxy to OneMap reverse geocode API.
- `POST /api/hangout/search`: Parses natural language query, searches for hangout spots, ranks results, and returns suggestions.
- `POST /api/grammar/check`: Checks grammar of a query and returns corrections.
- `POST /api/openai/chat`: Provides next word suggestions and grammar corrections (used internally).

## Technologies Used

- Node.js and Express for backend server.
- React for frontend UI.
- OpenAI GPT-4.1-mini model for natural language processing.
- OneMap API for Singapore location data.
- Axios for HTTP requests.
- Lodash debounce for input throttling.

## Notes

- The app uses caching to reduce redundant API calls to OneMap.
- The backend enriches venue data with images and formatted addresses.
- The app supports both development and production modes.
- CORS is enabled on the server to allow frontend-backend communication.

## License

This project is licensed under the MIT License.

---

- Ensure your OpenAI API key is valid and has sufficient credits
- Check console logs for detailed error messages
- Verify network connectivity to OneMap and OpenAI APIs

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Deployed Application and Documentation

- The SG Hangout Guide web application is deployed and accessible at: [https://singapore-hangout-guide.onrender.com](https://singapore-hangout-guide.onrender.com)

- Additional documentation files included in this repository:
  - Report: `SG_hangout_guide.pdf`
  - Presentation: `SG_hangout_guide.pptx`

## Highlights from the Report and Presentation

The SG Hangout Guide is an interactive web platform that transforms casual, free-form queries into precise, location-based recommendations across Singapore. Key highlights include:

- Advanced natural language processing powered by OpenAI’s GPT-4.1-mini for real-time grammar corrections and AI-aided suggestions.
- Seamless integration of geospatial data via Singapore’s OneMap API, providing up-to-date venue information.
- Cloud-native architecture combining containerized microservices with serverless components and managed cloud databases for scalability and high availability.
- User-friendly React-based frontend with intelligent query parsing and real-time suggestions.
- Efficient backend handling with a single unified API call for grammar checking, NLP parsing, venue search, and ranking, keeping costs low.
- Robust fault-tolerant design managing API rate limits, caching, and error handling to ensure consistent performance.
- Future-ready design supporting extensibility and potential applications in conversational data access and generative search engines.

For more detailed information, please refer to the full report (`SG_hangout_guide.pdf`) and presentation (`SG_hangout_guide.pptx`) included in this repository.
