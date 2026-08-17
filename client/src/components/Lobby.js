import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function Lobby({ socket }) {
  const [playerName, setPlayerName] = useState('');
  const [playerAge, setPlayerAge] = useState('');
  const [lobbyId, setLobbyId] = useState('');
  const [joined, setJoined] = useState(false);
  const [currentLobbyId, setCurrentLobbyId] = useState('');
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [expectedPlayerCount, setExpectedPlayerCount] = useState(2);
  const [gameState, setGameState] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check URL parameters for auto-join
    const urlLobbyId = searchParams.get('room');
    const urlName = searchParams.get('name');
    const urlAge = searchParams.get('age');
    
    if (urlLobbyId) {
      setLobbyId(urlLobbyId);
    }
    if (urlName) {
      setPlayerName(urlName);
    }
    if (urlAge) {
      setPlayerAge(urlAge);
    }

    // Auto-join if all parameters are present
    if (urlLobbyId && urlName && urlAge) {
      setTimeout(() => {
        socket.emit('join_lobby', { 
          lobbyId: urlLobbyId, 
          playerName: urlName, 
          age: urlAge 
        });
      }, 100);
    }

    socket.on('lobby_joined', ({ lobbyId }) => {
      setCurrentLobbyId(lobbyId);
      setJoined(true);
      // Update URL without navigating
      window.history.pushState({}, '', `/game/${lobbyId}`);
    });

    socket.on('game_state_update', (game) => {
      setPlayers(game.players);
      setGameState(game);
      setIsHost(game.players.length > 0 && game.players[0].id === socket.id);
      if (game.expectedPlayerCount) {
        setExpectedPlayerCount(game.expectedPlayerCount);
      }
      
      if (game.gameState === 'PLAYING') {
        navigate(`/game/${game.lobbyId}`);
      }
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('lobby_joined');
      socket.off('game_state_update');
      socket.off('error');
    };
  }, [socket, navigate]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    if (!playerAge.trim() || parseInt(playerAge) < 1) {
      alert('Please enter a valid age');
      return;
    }
    socket.emit('join_lobby', { lobbyId: lobbyId.trim() || null, playerName, age: playerAge });
  };

  const handleStartGame = () => {
    socket.emit('start_game', { lobbyId: currentLobbyId });
  };

  const handleSetPlayerCount = (count) => {
    setExpectedPlayerCount(count);
    socket.emit('set_player_count', { lobbyId: currentLobbyId, count });
  };

  const handleToggleReady = () => {
    socket.emit('toggle_ready', { lobbyId: currentLobbyId });
  };

  const getCurrentPlayer = () => {
    return players.find(p => p.id === socket.id);
  };

  const handleCreateNew = () => {
    setLobbyId('');
    setJoined(false);
    setCurrentLobbyId('');
    setPlayers([]);
  };

  const handleCopyInviteLink = () => {
    const currentPlayer = getCurrentPlayer();
    if (currentPlayer) {
      const inviteUrl = `${window.location.origin}/?room=${currentLobbyId}&name=${encodeURIComponent(playerName)}&age=${playerAge}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        alert('Invite link copied to clipboard!');
      }).catch(() => {
        alert('Failed to copy link. Please copy the URL manually.');
      });
    }
  };

  if (joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <h1 className="text-3xl font-bold text-white mb-6 text-center">
            🪳 Švábí salát
          </h1>
          
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-gray-300 text-sm mb-2">Lobby ID:</p>
            <p className="text-2xl font-mono font-bold text-green-400 text-center">
              {currentLobbyId}
            </p>
            <button
              onClick={handleCopyInviteLink}
              className="w-full mt-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-all"
            >
              📋 Copy Invite Link
            </button>
          </div>

          {isHost && (
            <div className="mb-6">
              <h2 className="text-white font-semibold mb-3">Set Number of Players:</h2>
              <div className="flex gap-2">
                {[2, 3, 4, 5, 6].map(count => (
                  <button
                    key={count}
                    onClick={() => handleSetPlayerCount(count)}
                    className={`flex-1 py-2 px-4 rounded-lg font-bold transition-all ${
                      expectedPlayerCount === count
                        ? 'bg-green-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-white font-semibold mb-3">
              Players ({players.length}/{expectedPlayerCount}):
            </h2>
            <div className="space-y-2">
              {players.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg p-3 ${
                    player.ready ? 'bg-green-500/20 border border-green-500/50' : 'bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white">
                      {index === 0 && '👑 '}
                      {player.name}
                    </span>
                    <span className="text-gray-400 text-sm">({player.age}y)</span>
                    {player.ready && (
                      <span className="text-green-400 text-sm">✓ Ready</span>
                    )}
                  </div>
                  {player.id === socket.id && (
                    <span className="text-green-400 text-sm">(You)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleToggleReady}
            disabled={!getCurrentPlayer()}
            className={`w-full py-3 px-6 rounded-xl font-bold transition-all ${
              getCurrentPlayer()?.ready
                ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {getCurrentPlayer()?.ready ? 'NOT READY' : 'READY'}
          </button>

          {isHost && (
            <>
              {players.length === expectedPlayerCount && players.every(p => p.ready) ? (
                <button
                  onClick={handleStartGame}
                  className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
                >
                  Start Game
                </button>
              ) : (
                <div className="mt-4">
                  {players.length !== expectedPlayerCount && (
                    <p className="text-yellow-400 text-center text-sm">
                      Waiting for {expectedPlayerCount - players.length} more player(s)...
                    </p>
                  )}
                  {players.length === expectedPlayerCount && !players.every(p => p.ready) && (
                    <p className="text-yellow-400 text-center text-sm">
                      Waiting for all players to be ready...
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {!isHost && (
            <p className="text-gray-400 text-center text-sm mt-4">
              Waiting for host to start the game...
            </p>
          )}

          <button
            onClick={handleCreateNew}
            className="w-full mt-4 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
          >
            Create New Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          🪳 Švábí salát
        </h1>
        
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-2 text-sm">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">Your Age</label>
            <input
              type="number"
              value={playerAge}
              onChange={(e) => setPlayerAge(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Enter your age"
              min={1}
              max={120}
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2 text-sm">
              Lobby ID (optional - leave empty to create new)
            </label>
            <input
              type="text"
              value={lobbyId}
              onChange={(e) => setLobbyId(e.target.value.toUpperCase())}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              placeholder="Enter lobby ID"
              maxLength={5}
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
          >
            {lobbyId ? 'Join Lobby' : 'Create Lobby'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Lobby;
