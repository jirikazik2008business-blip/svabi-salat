const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { generateDeck, shuffleDeck } = require('./gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// In-memory game state storage
const games = {};

// Generate unique lobby ID
function generateLobbyId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create or join a lobby
  socket.on('join_lobby', ({ lobbyId, playerName, age }) => {
    const targetLobbyId = lobbyId || generateLobbyId();
    
    if (!games[targetLobbyId]) {
      // Create new lobby
      games[targetLobbyId] = {
        lobbyId: targetLobbyId,
        gameState: 'LOBBY',
        activePlayerIndex: 0,
        discardPile: [],
        tabooCard: null,
        secondaryDiscardPile: [],
        expectedPlayerCount: null,
        players: []
      };
    }

    const game = games[targetLobbyId];
    
    if (game.gameState !== 'LOBBY') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }

    // Check if player already exists
    const existingPlayer = game.players.find(p => p.id === socket.id);
    if (existingPlayer) {
      socket.emit('error', { message: 'You are already in this lobby' });
      return;
    }

    // Add player to the game
    game.players.push({
      id: socket.id,
      name: playerName,
      age: parseInt(age) || 0,
      ready: false,
      deck: []
    });

    // Join the socket.io room
    socket.join(targetLobbyId);

    // Send updated game state to all players in the lobby
    io.to(targetLobbyId).emit('game_state_update', game);
    socket.emit('lobby_joined', { lobbyId: targetLobbyId });
  });

  // Set expected player count (host only)
  socket.on('set_player_count', ({ lobbyId, count }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Only the host can set player count
    if (game.players[0].id !== socket.id) {
      socket.emit('error', { message: 'Only the host can set player count' });
      return;
    }

    // Validate count (2-6 players)
    if (count < 2 || count > 6) {
      socket.emit('error', { message: 'Player count must be between 2 and 6' });
      return;
    }

    game.expectedPlayerCount = count;
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Toggle ready status
  socket.on('toggle_ready', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    const player = game.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    player.ready = !player.ready;
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Start the game
  socket.on('start_game', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    // Only the host (first player) can start the game
    if (game.players[0].id !== socket.id) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }

    // Check if expected player count is set
    if (!game.expectedPlayerCount) {
      socket.emit('error', { message: 'Host must set the expected number of players' });
      return;
    }

    // Check if player count matches expected
    if (game.players.length !== game.expectedPlayerCount) {
      socket.emit('error', { message: `Need exactly ${game.expectedPlayerCount} players to start` });
      return;
    }

    // Check if all players are ready
    const allReady = game.players.every(p => p.ready);
    if (!allReady) {
      socket.emit('error', { message: 'All players must be ready to start' });
      return;
    }

    // Generate and shuffle deck
    const deck = shuffleDeck(generateDeck());
    
    // Distribute cards equally among players
    const cardsPerPlayer = Math.floor(deck.length / game.players.length);
    let cardIndex = 0;

    game.players.forEach(player => {
      player.deck = deck.slice(cardIndex, cardIndex + cardsPerPlayer);
      cardIndex += cardsPerPlayer;
    });

    // Distribute remaining cards (if any) to random players
    const remainingCards = deck.slice(cardIndex);
    while (remainingCards.length > 0) {
      const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
      const randomCardIndex = Math.floor(Math.random() * remainingCards.length);
      game.players[randomPlayerIndex].deck.push(remainingCards.splice(randomCardIndex, 1)[0]);
    }

    // Find youngest player to start
    let youngestAge = Infinity;
    let youngestIndex = 0;
    game.players.forEach((player, index) => {
      if (player.age < youngestAge) {
        youngestAge = player.age;
        youngestIndex = index;
      }
    });

    // Set game state to playing
    game.gameState = 'PLAYING';
    game.activePlayerIndex = youngestIndex;

    io.to(lobbyId).emit('game_state_update', game);
  });

  // Flip a card
  socket.on('flip_card', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (game.gameState !== 'PLAYING') {
      socket.emit('error', { message: 'Game not in progress' });
      return;
    }

    // Check if it's this player's turn
    const currentPlayer = game.players[game.activePlayerIndex];
    if (currentPlayer.id !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }

    // Check if player has cards
    if (currentPlayer.deck.length === 0) {
      socket.emit('error', { message: 'No cards left' });
      return;
    }

    // Take top card from player's deck
    const card = currentPlayer.deck.shift();
    
    // Add to appropriate pile based on taboo status
    if (card.type === 'taboo') {
      // New taboo card replaces old one and clears secondary pile
      game.tabooCard = card;
      game.secondaryDiscardPile = [];
    } else if (game.tabooCard) {
      // If taboo is active, vegetable cards go to secondary pile
      game.secondaryDiscardPile.unshift(card);
    } else {
      // Normal flow - add to main discard pile
      game.discardPile.unshift(card);
    }

    // Move to next player
    game.activePlayerIndex = (game.activePlayerIndex + 1) % game.players.length;

    io.to(lobbyId).emit('game_state_update', game);
  });

  // Player error (mistake caught)
  socket.on('player_error', ({ lobbyId, penalizedPlayerId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby not found' });
      return;
    }

    if (game.gameState !== 'PLAYING') {
      socket.emit('error', { message: 'Game not in progress' });
      return;
    }

    // Check if either pile has cards
    if (game.discardPile.length === 0 && game.secondaryDiscardPile.length === 0) {
      socket.emit('error', { message: 'Discard piles are empty' });
      return;
    }

    // Find penalized player
    const penalizedPlayer = game.players.find(p => p.id === penalizedPlayerId);
    if (!penalizedPlayer) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }

    // Take all cards from both piles and add to BOTTOM of penalized player's deck
    const allCards = [...game.discardPile, ...game.secondaryDiscardPile];
    penalizedPlayer.deck.push(...allCards);
    
    // Clear both piles and taboo card
    game.discardPile = [];
    game.secondaryDiscardPile = [];
    game.tabooCard = null;

    // Set active player to penalized player
    const penalizedPlayerIndex = game.players.findIndex(p => p.id === penalizedPlayerId);
    game.activePlayerIndex = penalizedPlayerIndex;

    io.to(lobbyId).emit('game_state_update', game);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from all games they're in
    Object.keys(games).forEach(lobbyId => {
      const game = games[lobbyId];
      const playerIndex = game.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        game.players.splice(playerIndex, 1);
        
        // If no players left, delete the game
        if (game.players.length === 0) {
          delete games[lobbyId];
        } else {
          // Update game state for remaining players
          io.to(lobbyId).emit('game_state_update', game);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
