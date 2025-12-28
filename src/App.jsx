// src/App.jsx
import React from 'react';
import './App.css';
// Importera din profilvy
import ProfileSelectionView from './features/userProfiles/View/ProfileSelectionView';

function App() {
  return (
    <div className="App">
      {/* Här renderas din profilvy som appens huvudvyn */}
      <ProfileSelectionView />
    </div>
  );
}

export default App;
