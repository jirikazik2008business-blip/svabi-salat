import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';

const socket = io.connect(process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001');

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Lobby socket={socket} />} />
          <Route path="/game/:lobbyId" element={<Game socket={socket} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
