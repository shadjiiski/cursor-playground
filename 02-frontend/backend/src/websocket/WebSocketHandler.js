import { GameManager } from '../game/GameManager.js';
import redis from '../services/redis.js';

export class WebSocketHandler {
  constructor() {
    this.gameManager = new GameManager();
    this.connectionMap = new Map(); // ws => { currentRoom, currentPlayer }
  }

  handleConnection(ws) {
    this.connectionMap.set(ws, { currentRoom: null, currentPlayer: null });

    ws.on('message', async (message) => {
      const data = JSON.parse(message);
      const session = this.connectionMap.get(ws);
      await this.handleMessage(ws, data, session);
    });

    ws.on('close', async () => {
      const session = this.connectionMap.get(ws);
      await this.handleDisconnection(ws, session.currentRoom, session.currentPlayer);
      this.connectionMap.delete(ws);
    });
  }

  async handleMessage(ws, data, session) {
    switch (data.type) {
      case 'create_room':
        await this.handleCreateRoom(ws, data, session);
        break;
      case 'join_room':
        await this.handleJoinRoom(ws, data, session);
        break;
      case 'player_ready':
        await this.handlePlayerReady(ws, session.currentRoom, session.currentPlayer);
        break;
      case 'start_game':
        await this.handleStartGame(ws, session.currentRoom, session.currentPlayer);
        break;
      case 'make_choice':
        await this.handleMakeChoice(ws, data, session.currentRoom, session.currentPlayer);
        break;
      case 'play_again':
        await this.handlePlayAgain(ws, session.currentRoom, session.currentPlayer);
        break;
    }
  }

  async handleCreateRoom(ws, data, session) {
    try {
      const host = {
        id: data.playerId,
        username: data.username,
        ws: ws,
        ready: false,
        choice: null,
        wantsToPlayAgain: false
      };

      const room = await this.gameManager.createRoom(data.roomName, data.password, host);
      session.currentRoom = room.id;
      session.currentPlayer = 'host';

      ws.send(JSON.stringify({
        type: 'room_created',
        roomId: room.id
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  async handleJoinRoom(ws, data, session) {
    const room = await this.gameManager.findRoomByName(data.roomName);
    
    if (!room || !room.checkPassword(data.password)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid room name or password'
      }));
      return;
    }

    try {
      const guest = {
        id: data.playerId,
        username: data.username,
        ws: ws,
        ready: false,
        choice: null,
        wantsToPlayAgain: false
      };

      room.addGuest(guest);
      await redis.joinRoom(data.roomName, data.playerId);
      
      session.currentRoom = room.id;
      session.currentPlayer = 'guest';

      room.host.ws.send(JSON.stringify({
        type: 'player_joined',
        username: data.username
      }));
      ws.send(JSON.stringify({
        type: 'room_joined',
        roomId: room.id
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  }

  async handlePlayerReady(ws, currentRoom, currentPlayer) {
    if (!currentRoom || !currentPlayer) return;

    const room = this.gameManager.findRoomById(currentRoom);
    if (!room) return;

    room.setPlayerReady(currentPlayer);
    
    const hostWs = room.host.ws;
    const guestWs = room.guest?.ws;
    
    if (hostWs) hostWs.send(JSON.stringify({
      type: 'player_ready_update',
      player: currentPlayer,
      ready: true
    }));
    if (guestWs) guestWs.send(JSON.stringify({
      type: 'player_ready_update',
      player: currentPlayer,
      ready: true
    }));

    if (room.areBothPlayersReady()) {
      room.status = 'playing';
      if (hostWs) hostWs.send(JSON.stringify({ type: 'game_started' }));
      if (guestWs) guestWs.send(JSON.stringify({ type: 'game_started' }));
    }
  }

  async handleStartGame(ws, currentRoom, currentPlayer) {
    if (!currentRoom || currentPlayer !== 'host') return;

    const room = this.gameManager.findRoomById(currentRoom);
    if (!room) return;

    room.status = 'playing';
    
    room.host.ws.send(JSON.stringify({ type: 'game_started' }));
    room.guest.ws.send(JSON.stringify({ type: 'game_started' }));
  }

  async handleMakeChoice(ws, data, currentRoom, currentPlayer) {
    if (!currentRoom || !currentPlayer) return;

    const room = this.gameManager.findRoomById(currentRoom);
    if (!room) return;

    room.setPlayerChoice(currentPlayer, data.choice);
    await redis.saveChoice(room.name, room[currentPlayer].id, data.choice);
    
    if (room.haveBothPlayersChosen()) {
      const result = GameManager.determineWinner(room.host.choice, room.guest.choice);
      
      room.host.ws.send(JSON.stringify({
        type: 'game_result',
        hostChoice: room.host.choice,
        guestChoice: room.guest.choice,
        result: result
      }));
      room.guest.ws.send(JSON.stringify({
        type: 'game_result',
        hostChoice: room.host.choice,
        guestChoice: room.guest.choice,
        result: result
      }));

      room.resetChoices();
    }
  }

  async handlePlayAgain(ws, currentRoom, currentPlayer) {
    if (!currentRoom || !currentPlayer) return;

    const room = this.gameManager.findRoomById(currentRoom);
    if (!room) return;

    room.setPlayerWantsToPlayAgain(currentPlayer);
    
    const otherPlayer = currentPlayer === 'host' ? 'guest' : 'host';
    if (room[otherPlayer]) {
      room[otherPlayer].ws.send(JSON.stringify({
        type: 'play_again_request',
        player: currentPlayer
      }));
    }

    if (room.doBothPlayersWantToPlayAgain()) {
      room.resetChoices();
      room.resetPlayAgainState();
      room.status = 'playing';

      room.host.ws.send(JSON.stringify({ type: 'game_restart' }));
      room.guest.ws.send(JSON.stringify({ type: 'game_restart' }));
    }
  }

  async handleDisconnection(ws, currentRoom, currentPlayer) {
    if (!currentRoom) return;

    const room = this.gameManager.findRoomById(currentRoom);
    if (!room) return;

    if (currentPlayer === 'host') {
      if (room.guest) {
        room.guest.ws.send(JSON.stringify({
          type: 'player_disconnected',
          message: 'Host has left the game'
        }));
      }
      await this.gameManager.deleteRoom(currentRoom);
    } else if (currentPlayer === 'guest') {
      room.host.ws.send(JSON.stringify({
        type: 'player_disconnected',
        message: 'Guest has left the game'
      }));
      room.removeGuest();
    }
  }
} 