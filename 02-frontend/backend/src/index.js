import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { GameManager } from './game/GameManager.js';
import { WebSocketHandler } from './websocket/WebSocketHandler.js';

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize game manager and WebSocket handler
const gameManager = new GameManager();
const wsHandler = new WebSocketHandler();

// WebSocket server
const wss = new WebSocketServer({ port: 3002 });

wss.on('connection', (ws) => {
  wsHandler.handleConnection(ws);
});

// REST API endpoints
app.get('/api/rooms', (req, res) => {
  res.json(gameManager.getPublicRooms());
});

// Create a room
app.post('/api/rooms', async (req, res) => {
  const { roomName, password, playerId, username } = req.body;
  try {
    const host = {
      id: playerId,
      username,
      ready: false,
      choice: null,
      wantsToPlayAgain: false
    };
    const room = await gameManager.createRoom(roomName, password, host);
    res.json({ roomId: room.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Join a room
app.post('/api/rooms/:roomName/join', async (req, res) => {
  const { playerId, username, password } = req.body;
  const room = await gameManager.findRoomByName(req.params.roomName);
  if (!room || !room.checkPassword(password)) {
    return res.status(400).json({ error: 'Invalid room name or password' });
  }
  try {
    const guest = {
      id: playerId,
      username,
      ready: false,
      choice: null,
      wantsToPlayAgain: false
    };
    room.addGuest(guest);
    await redis.joinRoom(req.params.roomName, playerId);
    res.json({ roomId: room.id });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get room/game state
app.get('/api/rooms/:roomName/state', async (req, res) => {
  const { playerId } = req.query;
  const room = await gameManager.findRoomByName(req.params.roomName);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  // Find player type
  let playerType = null;
  if (room.host.id === playerId) playerType = 'host';
  else if (room.guest && room.guest.id === playerId) playerType = 'guest';
  
  // Get game history from PostgreSQL
  const history = await database.getGameHistory(req.params.roomName);
  
  // Compose state
  let hostChoice = null;
  let guestChoice = null;
  if (room.host.choice && (playerType === 'host' || room.haveBothPlayersChosen())) hostChoice = room.host.choice;
  if (room.guest && room.guest.choice && (playerType === 'guest' || room.haveBothPlayersChosen())) guestChoice = room.guest.choice;
  
  res.json({
    playerType,
    host: { username: room.host.username, ready: room.host.ready },
    guest: room.guest ? { username: room.guest.username, ready: room.guest.ready } : null,
    status: room.status,
    choices: {
      host: hostChoice,
      guest: guestChoice
    },
    result: room.result,
    wantsToPlayAgain: {
      host: room.host.wantsToPlayAgain,
      guest: room.guest ? room.guest.wantsToPlayAgain : false
    },
    history: history
  });
});

// Set ready
app.post('/api/rooms/:roomName/ready', async (req, res) => {
  const { playerId } = req.body;
  const room = await gameManager.findRoomByName(req.params.roomName);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  let playerType = null;
  if (room.host.id === playerId) playerType = 'host';
  else if (room.guest && room.guest.id === playerId) playerType = 'guest';
  if (!playerType) return res.status(400).json({ error: 'Player not in room' });
  
  room.setPlayerReady(playerType);
  // Auto-start if both ready
  if (room.areBothPlayersReady()) room.status = 'playing';
  res.json({ success: true });
});

// Make a choice
app.post('/api/rooms/:roomName/choice', async (req, res) => {
  const { playerId, choice } = req.body;
  const room = await gameManager.findRoomByName(req.params.roomName);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  let playerType = null;
  if (room.host.id === playerId) playerType = 'host';
  else if (room.guest && room.guest.id === playerId) playerType = 'guest';
  if (!playerType) return res.status(400).json({ error: 'Player not in room' });
  
  room.setPlayerChoice(playerType, choice);
  await redis.saveChoice(req.params.roomName, playerId, choice);
  
  // If both have chosen, determine result
  let result = null;
  if (room.haveBothPlayersChosen()) {
    result = GameManager.determineWinner(room.host.choice, room.guest.choice);
    room.setResult(result);
  }
  
  res.json({ success: true, result });
});

// Play again
app.post('/api/rooms/:roomName/play-again', async (req, res) => {
  const { playerId } = req.body;
  const room = await gameManager.findRoomByName(req.params.roomName);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  
  let playerType = null;
  if (room.host.id === playerId) playerType = 'host';
  else if (room.guest && room.guest.id === playerId) playerType = 'guest';
  if (!playerType) return res.status(400).json({ error: 'Player not in room' });
  
  room.setPlayerWantsToPlayAgain(playerType);
  if (room.doBothPlayersWantToPlayAgain()) {
    room.resetChoicesAndResult();
    room.resetPlayAgainState();
    room.status = 'playing';
  }
  
  res.json({ success: true });
});

// Start HTTP server
app.listen(port, () => {
  console.log(`HTTP Server is running on port ${port}`);
}); 