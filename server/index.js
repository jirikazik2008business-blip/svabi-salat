const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { generateDeck, shuffleDeck } = require('./gameLogic');

const app = express();
app.use(cors());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/', (_req, res) => {
  const frontend = process.env.FRONTEND_URL || 'frontend';
  res.type('text/html').send(
    '<!DOCTYPE html><html lang="cs"><head><meta charset="utf-8"><title>Švábí salát</title>' +
      '<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#fff;color:#111}h1{font-size:22px}</style>' +
      '</head><body><h1>Švábí salát — backend běží.<br>Hru hraj na: <a href="' +
      frontend + '">' + frontend + '</a></h1></body></html>'
  );
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// In-memory game state storage
const games = {};
const LOBBY_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours without activity

// Generate unique lobby ID
function generateLobbyId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 5; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function isValidName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 20;
}

function isValidAge(age) {
  const n = parseInt(age, 10);
  return !isNaN(n) && n >= 1 && n <= 120;
}

function touch(game) {
  game.updatedAt = Date.now();
}

// Move active player index to the next player who is connected and has cards
function advanceActivePlayer(game) {
  const n = game.players.length;
  if (n === 0) return;
  let guard = 0;
  while (guard < n) {
    game.activePlayerIndex = (game.activePlayerIndex + 1) % n;
    const player = game.players[game.activePlayerIndex];
    if (player.connected && player.deck.length > 0) return;
    guard++;
  }
}

// Build final standings (fewest cards wins)
function computeStandings(game) {
  return [...game.players]
    .sort((a, b) => a.deck.length - b.deck.length)
    .map((p, index) => ({ id: p.id, name: p.name, cards: p.deck.length, rank: index + 1 }));
}

// Clean up stale lobbies
setInterval(() => {
  const now = Date.now();
  Object.keys(games).forEach((lobbyId) => {
    if (now - games[lobbyId].updatedAt > LOBBY_TIMEOUT_MS) {
      delete games[lobbyId];
    }
  });
}, 60000);

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create, join or rejoin a lobby
  socket.on('join_lobby', ({ lobbyId, playerName, age }) => {
    const name = (playerName || '').toString().trim();
    const targetLobbyId = (lobbyId || generateLobbyId()).toString().toUpperCase();

    if (!isValidName(name)) {
      socket.emit('error', { message: 'Jméno musí mít 1–20 znaků.' });
      return;
    }
    if (!isValidAge(age)) {
      socket.emit('error', { message: 'Zadej platný věk (1–120).' });
      return;
    }

    if (!games[targetLobbyId]) {
      games[targetLobbyId] = {
        lobbyId: targetLobbyId,
        gameState: 'LOBBY',
        activePlayerIndex: 0,
        discardPile: [],
        tabooCard: null,
        secondaryDiscardPile: [],
        expectedPlayerCount: null,
        hostId: null,
        winnerId: null,
        standings: null,
        players: [],
        updatedAt: Date.now()
      };
    }

    const game = games[targetLobbyId];

    // Reconnect into an in-progress / ended game (same name, previously disconnected)
    if (game.gameState !== 'LOBBY') {
      const disconnected = game.players.find((p) => p.name === name && !p.connected);
      const duplicate = game.players.find((p) => p.name === name && p.connected);

      if (duplicate) {
        socket.emit('error', { message: 'Hráč s tímto jménem už je ve hře.' });
        return;
      }
      if (disconnected) {
        disconnected.id = socket.id;
        disconnected.connected = true;
        disconnected.age = parseInt(age, 10);
        socket.join(targetLobbyId);
        touch(game);
        io.to(targetLobbyId).emit('game_state_update', game);
        socket.emit('lobby_joined', { lobbyId: targetLobbyId });
        return;
      }

      socket.emit('error', { message: 'Hra už probíhá. Nelze se připojit.' });
      return;
    }

    // Lobby limits
    if (game.expectedPlayerCount && game.players.length >= game.expectedPlayerCount) {
      socket.emit('error', { message: 'Lobby je plné.' });
      return;
    }

    // Check if player already exists
    const existingPlayer = game.players.find((p) => p.id === socket.id);
    if (existingPlayer) {
      socket.emit('error', { message: 'Už jsi v tomto lobby.' });
      return;
    }

    const duplicateName = game.players.find((p) => p.name === name);
    if (duplicateName) {
      socket.emit('error', { message: 'Tohle jméno už je použité.' });
      return;
    }

    // Add player to the game
    game.players.push({
      id: socket.id,
      name,
      age: parseInt(age, 10),
      ready: false,
      connected: true,
      deck: []
    });

    if (!game.hostId) {
      game.hostId = socket.id;
    }

    socket.join(targetLobbyId);
    touch(game);
    io.to(targetLobbyId).emit('game_state_update', game);
    socket.emit('lobby_joined', { lobbyId: targetLobbyId });
  });

  // Set expected player count (host only)
  socket.on('set_player_count', ({ lobbyId, count }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    if (game.hostId !== socket.id) {
      socket.emit('error', { message: 'Jen hostitel může nastavit počet hráčů.' });
      return;
    }

    const c = parseInt(count, 10);
    if (isNaN(c) || c < 2 || c > 6) {
      socket.emit('error', { message: 'Počet hráčů musí být 2–6.' });
      return;
    }

    game.expectedPlayerCount = c;
    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Toggle ready status
  socket.on('toggle_ready', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    const player = game.players.find((p) => p.id === socket.id);
    if (!player) {
      socket.emit('error', { message: 'Hráč nebyl nalezen.' });
      return;
    }

    player.ready = !player.ready;
    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Start the game
  socket.on('start_game', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    if (game.hostId !== socket.id) {
      socket.emit('error', { message: 'Jen hostitel může spustit hru.' });
      return;
    }

    if (!game.expectedPlayerCount) {
      socket.emit('error', { message: 'Hostitel musí nastavit počet hráčů.' });
      return;
    }

    if (game.players.length !== game.expectedPlayerCount) {
      socket.emit('error', { message: `Pro start je potřeba přesně ${game.expectedPlayerCount} hráčů.` });
      return;
    }

    const allConnected = game.players.every((p) => p.connected);
    if (!allConnected) {
      socket.emit('error', { message: 'Čeká se na připojení všech hráčů.' });
      return;
    }

    const allReady = game.players.every((p) => p.ready);
    if (!allReady) {
      socket.emit('error', { message: 'Všichni hráči musí být připraveni.' });
      return;
    }

    dealCards(game);

    // Find youngest player to start
    let youngestAge = Infinity;
    let youngestIndex = 0;
    game.players.forEach((player, index) => {
      if (player.age < youngestAge) {
        youngestAge = player.age;
        youngestIndex = index;
      }
    });

    game.gameState = 'PLAYING';
    game.activePlayerIndex = youngestIndex;
    game.winnerId = null;
    game.standings = null;
    if (!game.players[game.activePlayerIndex].deck.length || !game.players[game.activePlayerIndex].connected) {
      advanceActivePlayer(game);
    }

    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Flip a card
  socket.on('flip_card', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    if (game.gameState !== 'PLAYING') {
      socket.emit('error', { message: 'Hra neprobíhá.' });
      return;
    }

    const currentPlayer = game.players[game.activePlayerIndex];
    if (!currentPlayer || currentPlayer.id !== socket.id) {
      socket.emit('error', { message: 'Nejsi na tahu.' });
      return;
    }

    if (currentPlayer.deck.length === 0) {
      socket.emit('error', { message: 'Nemáš žádné karty.' });
      return;
    }

    const card = currentPlayer.deck.shift();

    if (card.type === 'taboo') {
      game.tabooCard = card;
      game.secondaryDiscardPile = [];
    } else if (game.tabooCard) {
      game.secondaryDiscardPile.unshift(card);
    } else {
      game.discardPile.unshift(card);
    }

    advanceActivePlayer(game);
    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Player error (mistake caught)
  socket.on('player_error', ({ lobbyId, penalizedPlayerId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    if (game.gameState !== 'PLAYING') {
      socket.emit('error', { message: 'Hra neprobíhá.' });
      return;
    }

    if (game.discardPile.length === 0 && game.secondaryDiscardPile.length === 0) {
      socket.emit('error', { message: 'Hromádky jsou prázdné.' });
      return;
    }

    const penalizedPlayer = game.players.find((p) => p.id === penalizedPlayerId);
    if (!penalizedPlayer) {
      socket.emit('error', { message: 'Hráč nebyl nalezen.' });
      return;
    }

    if (penalizedPlayer.id === socket.id) {
      socket.emit('error', { message: 'Nemůžeš penalizovat sám sebe.' });
      return;
    }

    const allCards = [...game.discardPile, ...game.secondaryDiscardPile];
    penalizedPlayer.deck.push(...allCards);

    game.discardPile = [];
    game.secondaryDiscardPile = [];
    game.tabooCard = null;

    game.activePlayerIndex = game.players.findIndex((p) => p.id === penalizedPlayerId);
    if (!game.players[game.activePlayerIndex].connected || game.players[game.activePlayerIndex].deck.length === 0) {
      advanceActivePlayer(game);
    }

    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // End the game and reveal standings (host only)
  socket.on('end_game', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    if (game.hostId !== socket.id) {
      socket.emit('error', { message: 'Jen hostitel může ukončit hru.' });
      return;
    }

    if (game.gameState !== 'PLAYING') {
      socket.emit('error', { message: 'Hra neprobíhá.' });
      return;
    }

    game.gameState = 'ENDED';
    game.standings = computeStandings(game);
    game.winnerId = game.standings[0].id;

    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Restart the game (host only)
  socket.on('restart_game', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) {
      socket.emit('error', { message: 'Lobby nebylo nalezeno.' });
      return;
    }

    if (game.hostId !== socket.id) {
      socket.emit('error', { message: 'Jen hostitel může restartovat hru.' });
      return;
    }

    if (game.gameState === 'LOBBY') {
      socket.emit('error', { message: 'Hra ještě nezačala.' });
      return;
    }

    const allConnected = game.players.every((p) => p.connected);
    if (!allConnected) {
      socket.emit('error', { message: 'Čeká se na připojení všech hráčů.' });
      return;
    }

    dealCards(game);

    let youngestAge = Infinity;
    let youngestIndex = 0;
    game.players.forEach((player, index) => {
      if (player.age < youngestAge) {
        youngestAge = player.age;
        youngestIndex = index;
      }
    });

    game.gameState = 'PLAYING';
    game.activePlayerIndex = youngestIndex;
    game.winnerId = null;
    game.standings = null;
    game.players.forEach((p) => { p.ready = false; });
    if (!game.players[game.activePlayerIndex].deck.length || !game.players[game.activePlayerIndex].connected) {
      advanceActivePlayer(game);
    }

    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Explicitly leave a lobby (removes player from the game)
  socket.on('leave_lobby', ({ lobbyId }) => {
    const game = games[lobbyId];
    if (!game) return;

    const playerIndex = game.players.findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    game.players.splice(playerIndex, 1);

    if (game.hostId === player.id) {
      game.hostId = game.players.length > 0 ? game.players[0].id : null;
    }

    if (game.players.length === 0) {
      delete games[lobbyId];
      return;
    }

    if (game.gameState === 'PLAYING') {
      if (playerIndex < game.activePlayerIndex) {
        game.activePlayerIndex -= 1;
      }
      game.activePlayerIndex = Math.max(0, Math.min(game.activePlayerIndex, game.players.length - 1));
      const active = game.players[game.activePlayerIndex];
      if (!active.connected || active.deck.length === 0) {
        advanceActivePlayer(game);
      }
    }

    socket.leave(lobbyId);
    touch(game);
    io.to(lobbyId).emit('game_state_update', game);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    Object.keys(games).forEach((lobbyId) => {
      const game = games[lobbyId];
      const playerIndex = game.players.findIndex((p) => p.id === socket.id);

      if (playerIndex === -1) return;

      const player = game.players[playerIndex];

      if (game.gameState === 'LOBBY') {
        game.players.splice(playerIndex, 1);

        if (game.hostId === player.id) {
          game.hostId = game.players.length > 0 ? game.players[0].id : null;
        }

        if (game.players.length === 0) {
          delete games[lobbyId];
          return;
        }

        touch(game);
        io.to(lobbyId).emit('game_state_update', game);
        return;
      }

      // In an active/ended game: mark as disconnected, keep their deck
      player.connected = false;
      socket.leave(lobbyId);

      if (game.hostId === player.id) {
        const nextHost = game.players.find((p) => p.connected && p.id !== player.id);
        game.hostId = nextHost ? nextHost.id : null;
      }

      if (game.gameState === 'PLAYING') {
        if (game.players[game.activePlayerIndex]?.id === player.id) {
          advanceActivePlayer(game);
        }
      }

      touch(game);
      io.to(lobbyId).emit('game_state_update', game);
    });
  });
});

// Deal a fresh shuffled deck equally among players
function dealCards(game) {
  const deck = shuffleDeck(generateDeck());
  const cardsPerPlayer = Math.floor(deck.length / game.players.length);
  let cardIndex = 0;

  game.players.forEach((player) => {
    player.deck = deck.slice(cardIndex, cardIndex + cardsPerPlayer);
    cardIndex += cardsPerPlayer;
  });

  const remainingCards = deck.slice(cardIndex);
  while (remainingCards.length > 0) {
    const randomPlayerIndex = Math.floor(Math.random() * game.players.length);
    const randomCardIndex = Math.floor(Math.random() * remainingCards.length);
    game.players[randomPlayerIndex].deck.push(remainingCards.splice(randomCardIndex, 1)[0]);
  }

  game.discardPile = [];
  game.secondaryDiscardPile = [];
  game.tabooCard = null;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
