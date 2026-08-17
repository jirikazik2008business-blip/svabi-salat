# Švábí salát (Cockroach Salad) - Multiplayer Card Game

A real-time, web-based multiplayer card game inspired by the board game "Švábí salát". Players communicate via voice call (Discord/Messenger) while the app manages the card game state.

## Features

- **Real-time multiplayer** using WebSockets (Socket.io)
- **Room/lobby system** with unique lobby IDs and invite links
- **Age-based turn order** - youngest player starts
- **Ready system** - all players must be ready before game starts
- **Host controls** - set exact player count (2-6 players)
- **128-card deck** (120 vegetable cards + 8 taboo cockroach cards)
- **Turn-based gameplay** with automatic card distribution
- **Taboo mechanic** - cockroach cards ban specific vegetables with secondary discard pile
- **Mistake detection** - players can flag verbal mistakes during voice calls
- **Responsive UI** optimized for both mobile and desktop
- **Modern design** with Tailwind CSS
- **Public deployment ready** - deploy to Render + Vercel for internet access

## Tech Stack

- **Frontend:** React.js with Tailwind CSS
- **Backend:** Node.js with Express
- **Real-time:** Socket.io for WebSocket communication
- **State Management:** In-memory server-side storage

## Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies:**
   ```bash
   npm run install-all
   ```
   This installs both server and client dependencies.

3. **Start the application:**
   ```bash
   npm run dev
   ```
   This starts both the backend server (port 3001) and React frontend (port 3000) concurrently.

## How to Play

### Setup
1. Open the application in your browser
2. Enter your nickname
3. Either create a new lobby or join an existing one using a lobby ID
4. Share the lobby URL with friends (they'll join the same room)

### Starting the Game
- The host (first player) has a "Start Game" button
- Minimum 2 players required to start
- Cards are automatically shuffled and distributed equally

### Gameplay
1. **Turns:** Players take turns in clockwise order
2. **Flip Card:** Only the active player can click "FLIP CARD"
3. **Card Types:**
   - **Vegetable cards:** Regular cards (Tomato, Pepper, Cauliflower, Salad)
   - **Taboo cards:** Cockroach cards that ban a specific vegetable
4. **Taboo Mechanic:** When a taboo card is flipped, that vegetable becomes taboo until a new taboo card covers it

### Mistake Detection
Since players communicate via voice call, anyone can make a verbal mistake:
- Click the red "CHYBA! / PŘEŘEKL SE!" button
- Select the player who made the mistake
- The entire discard pile is added to that player's deck
- The penalized player starts the new round

### Winning
The game continues until players decide to stop. The player with the fewest cards wins!

## Project Structure

```
svabi-salat/
├── server/
│   ├── index.js          # Express server + Socket.io setup
│   └── gameLogic.js      # Card deck generation and shuffling
├── client/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Lobby.js  # Lobby creation/joining UI
│   │   │   └── Game.js   # Main game dashboard
│   │   ├── App.js        # React Router setup
│   │   └── index.css     # Tailwind CSS imports
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── package.json          # Root package.json
```

## WebSocket Events

### Client → Server
- `join_lobby` - Join or create a lobby
- `start_game` - Start the game (host only)
- `flip_card` - Flip a card from your deck
- `player_error` - Flag a player's mistake

### Server → Client
- `lobby_joined` - Confirmation of lobby join
- `game_state_update` - Updated game state
- `error` - Error messages

## Game State Structure

```javascript
{
  lobbyId: "string",
  gameState: "LOBBY" | "PLAYING" | "ENDED",
  activePlayerIndex: 0,
  discardPile: [],
  tabooCard: null,
  players: [
    {
      id: "socket_id",
      name: "string",
      deck: []
    }
  ]
}
```

## Development

### Run server only:
```bash
npm run server
```

### Run client only:
```bash
npm run client
```

### Build for production:
```bash
npm run build
```

## Deployment Guide (Public Internet Access)

To make your game accessible to anyone over the internet, deploy the backend and frontend separately using free hosting services.

### Step 1: Deploy Backend to Render.com

Render.com supports WebSockets and is perfect for the Socket.io backend.

1. **Create a Render account** at [render.com](https://render.com) (sign up with GitHub)
2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the root directory of the project
3. **Configure Build & Deploy:**
   - **Build Command:** `npm install`
   - **Start Command:** `node server/index.js`
4. **Add Environment Variables:**
   - `PORT`: `3001` (or let Render auto-assign)
   - `FRONTEND_URL`: Leave empty for now (we'll add Vercel URL later)
5. **Deploy** - Render will give you a URL like `https://your-app.onrender.com`

### Step 2: Deploy Frontend to Vercel.com

Vercel is optimized for React applications and provides excellent performance.

1. **Create a Vercel account** at [vercel.com](https://vercel.com) (sign up with GitHub)
2. **Create a new project:**
   - Click "Add New Project"
   - Import your GitHub repository
   - Set **Root Directory** to `client`
3. **Configure Environment Variables:**
   - `REACT_APP_BACKEND_URL`: Paste your Render backend URL (e.g., `https://your-app.onrender.com`)
4. **Deploy** - Vercel will give you a URL like `https://your-app.vercel.app`

### Step 3: Update Backend CORS

After deploying both services:

1. Go to your Render dashboard
2. Add/Update the `FRONTEND_URL` environment variable with your Vercel URL
3. Redeploy the backend (Render will do this automatically)

### Step 4: Test the Deployment

1. Open your Vercel URL in a browser
2. Create a lobby and copy the invite link
3. Share the link with friends - they can join from anywhere!

### Environment Variables Reference

**Backend (server/.env.example):**
```bash
PORT=3001
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**Frontend (client/.env.example):**
```bash
REACT_APP_BACKEND_URL=https://your-render-app.onrender.com
```

### Local Development

For local development, use the default values:
- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

No environment variables needed - the app uses sensible defaults.

## License

This project is created for educational purposes.
