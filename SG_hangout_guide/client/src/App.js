import React from 'react';
import './styles/App.css';
import HangoutGuide from './components/HangoutGuide';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>SG Hangout Guide</h1>
        <p>Find the perfect hangout spot in Singapore</p>
      </header>
      <HangoutGuide />
    </div>
  );
}

export default App;
