import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

function Game({ socket }) {
  const { lobbyId } = useParams();
  const navigate = useNavigate();
  
  const [gameState, setGameState] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [selectedPlayerForPenalty, setSelectedPlayerForPenalty] = useState(null);

  useEffect(() => {
    socket.on('game_state_update', (game) => {
      setGameState(game);
      const player = game.players.find(p => p.id === socket.id);
      setCurrentPlayer(player);
    });

    socket.on('error', ({ message }) => {
      alert(message);
    });

    return () => {
      socket.off('game_state_update');
      socket.off('error');
    };
  }, [socket]);

  const handleFlipCard = () => {
    if (gameState && gameState.players[gameState.activePlayerIndex].id === socket.id) {
      socket.emit('flip_card', { lobbyId });
    }
  };

  const handlePlayerError = () => {
    if (selectedPlayerForPenalty && gameState) {
      socket.emit('player_error', { lobbyId, penalizedPlayerId: selectedPlayerForPenalty });
      setSelectedPlayerForPenalty(null);
    }
  };

  const getVegetableColor = (vegetable) => {
    const colors = {
      tomato: 'bg-red-500',
      pepper: 'bg-yellow-500',
      cauliflower: 'bg-white',
      salad: 'bg-green-500'
    };
    return colors[vegetable] || 'bg-gray-500';
  };

  const getVegetableEmoji = (vegetable) => {
    const emojis = {
      tomato: '🍅',
      pepper: '🌶️',
      cauliflower: '🥦',
      salad: '🥬'
    };
    return emojis[vegetable] || '🃏';
  };

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading game...</div>
      </div>
    );
  }

  const isMyTurn = gameState.players[gameState.activePlayerIndex]?.id === socket.id;
  const topCard = gameState.discardPile[0];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            🪳 Švábí salát
          </h1>
          <p className="text-gray-400">Lobby: {lobbyId}</p>
        </div>

        {/* Taboo Warning */}
        {gameState.tabooCard && (
          <div className="bg-red-600/20 border-2 border-red-500 rounded-xl p-4 mb-6 animate-pulse">
            <div className="flex items-center justify-center gap-3">
              <span className="text-3xl">⚠️</span>
              <span className="text-white font-bold text-xl">
                {gameState.tabooCard.vegetable.toUpperCase()} IS TABOO!
              </span>
              <span className="text-3xl">🪳</span>
            </div>
          </div>
        )}

        {/* Opponents */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {gameState.players
            .filter(p => p.id !== socket.id)
            .map((player, index) => (
              <div
                key={player.id}
                className={`bg-white/10 rounded-xl p-4 text-center ${
                  gameState.players[gameState.activePlayerIndex].id === player.id
                    ? 'ring-2 ring-green-400'
                    : ''
                }`}
              >
                <p className="text-white font-semibold truncate mb-2">{player.name}</p>
                <div className="bg-blue-600 rounded-lg px-4 py-2 mx-auto max-w-fit">
                  <span className="text-white font-bold text-lg">{player.deck.length}</span>
                </div>
                <p className="text-gray-400 text-xs mt-2">cards</p>
                {gameState.players[gameState.activePlayerIndex].id === player.id && (
                  <p className="text-green-400 text-xs mt-1">Playing now</p>
                )}
              </div>
            ))}
        </div>

        {/* Discard Piles (Center) */}
        <div className="flex justify-center gap-4 mb-6">
          {/* Main Discard Pile */}
          <div className="bg-white/5 rounded-2xl p-6 w-full max-w-sm">
            <p className="text-gray-400 text-center mb-4 text-sm">Main Pile ({gameState.discardPile.length})</p>
            {topCard ? (
              <div className={`w-32 h-48 mx-auto rounded-xl ${getVegetableColor(topCard.vegetable)} flex flex-col items-center justify-center shadow-2xl ${topCard.type === 'taboo' ? 'border-4 border-red-500' : ''}`}>
                <span className="text-6xl mb-2">
                  {topCard.type === 'taboo' ? '🪳' : getVegetableEmoji(topCard.vegetable)}
                </span>
                <span className="text-white font-bold text-center px-2 capitalize">
                  {topCard.type === 'taboo' ? 'Taboo' : topCard.vegetable}
                </span>
              </div>
            ) : (
              <div className="w-32 h-48 mx-auto rounded-xl bg-gray-700 flex items-center justify-center">
                <span className="text-gray-500 text-4xl">Empty</span>
              </div>
            )}
          </div>

          {/* Secondary Discard Pile (only shown when taboo is active) */}
          {gameState.tabooCard && (
            <div className="bg-white/5 rounded-2xl p-6 w-full max-w-sm">
              <p className="text-gray-400 text-center mb-4 text-sm">Secondary Pile ({gameState.secondaryDiscardPile.length})</p>
              {gameState.secondaryDiscardPile.length > 0 ? (
                <div className={`w-32 h-48 mx-auto rounded-xl ${getVegetableColor(gameState.secondaryDiscardPile[0].vegetable)} flex flex-col items-center justify-center shadow-2xl`}>
                  <span className="text-6xl mb-2">
                    {getVegetableEmoji(gameState.secondaryDiscardPile[0].vegetable)}
                  </span>
                  <span className="text-white font-bold text-center px-2 capitalize">
                    {gameState.secondaryDiscardPile[0].vegetable}
                  </span>
                </div>
              ) : (
                <div className="w-32 h-48 mx-auto rounded-xl bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-500">
                  <span className="text-gray-500 text-4xl">Empty</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Your Deck */}
        <div className="bg-white/10 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-lg">Your Deck</p>
              <p className="text-gray-400 text-sm">{currentPlayer?.deck.length || 0} cards remaining</p>
            </div>
            <div className="bg-blue-600 rounded-xl px-8 py-4">
              <span className="text-white font-bold text-2xl">
                {currentPlayer?.deck.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Flip Card Button */}
        <div className="mb-6">
          <button
            onClick={handleFlipCard}
            disabled={!isMyTurn || !currentPlayer || currentPlayer.deck.length === 0}
            className={`w-full py-4 rounded-xl font-bold text-xl transition-all transform ${
              isMyTurn && currentPlayer && currentPlayer.deck.length > 0
                ? 'bg-green-500 hover:bg-green-600 text-white hover:scale-105 cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isMyTurn ? 'FLIP CARD' : "Opponent's Turn"}
          </button>
          {!isMyTurn && (
            <p className="text-gray-400 text-center text-sm mt-2">
              Waiting for {gameState.players[gameState.activePlayerIndex]?.name}...
            </p>
          )}
        </div>

        {/* Player Error Button */}
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-4">
          <p className="text-red-400 font-semibold mb-3 text-center">
            Did someone make a mistake?
          </p>
          
          <div className="mb-3">
            <label className="block text-gray-300 text-sm mb-2">Select player to penalize:</label>
            <select
              value={selectedPlayerForPenalty || ''}
              onChange={(e) => setSelectedPlayerForPenalty(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a player...</option>
              {gameState.players.map(player => (
                <option key={player.id} value={player.id}>
                  {player.name} {player.id === socket.id ? '(You)' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handlePlayerError}
            disabled={!selectedPlayerForPenalty || (gameState.discardPile.length === 0 && gameState.secondaryDiscardPile.length === 0)}
            className={`w-full py-3 rounded-xl font-bold transition-all ${
              selectedPlayerForPenalty && (gameState.discardPile.length > 0 || gameState.secondaryDiscardPile.length > 0)
                ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            CHYBA! / PŘEŘEKL SE!
          </button>
          
          {gameState.discardPile.length === 0 && gameState.secondaryDiscardPile.length === 0 && (
            <p className="text-gray-400 text-center text-sm mt-2">
              Discard piles are empty
            </p>
          )}
        </div>

        {/* Leave Game Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default Game;
