import { v4 as uuidv4 } from 'uuid';
import { Room } from './Room.js';
import redis from '../services/redis.js';
import database from '../services/database.js';

export class GameManager {
  constructor() {
    this.rooms = new Map();
    this.loadActiveRooms();
  }

  async loadActiveRooms() {
    // Load active rooms from Redis
    const keys = await redis.redis.keys('room:*');
    for (const key of keys) {
      const roomName = key.replace('room:', '');
      const roomData = await redis.getRoom(roomName);
      if (roomData) {
        const room = new Room(
          roomData.gameId,
          roomName,
          null, // password will be handled separately
          {
            id: roomData.players[0],
            ready: false,
            choice: null,
            wantsToPlayAgain: false
          }
        );
        if (roomData.players.length > 1) {
          room.addGuest({
            id: roomData.players[1],
            ready: false,
            choice: null,
            wantsToPlayAgain: false
          });
        }
        room.status = roomData.status;
        this.rooms.set(roomData.gameId, room);
      }
    }
  }

  async createRoom(roomName, password, host) {
    if (this.findRoomByName(roomName)) {
      throw new Error('A room with this name already exists');
    }

    const roomId = uuidv4();
    const room = new Room(roomId, roomName, password, host);
    
    // Create in Redis and PostgreSQL
    await redis.createRoom(roomName, host.id);
    
    this.rooms.set(roomId, room);
    return room;
  }

  async findRoomByName(roomName) {
    // First check in-memory
    let room = Array.from(this.rooms.values()).find(room => room.name === roomName);
    
    // If not found, try to restore from Redis/PostgreSQL
    if (!room) {
      const roomData = await redis.getRoom(roomName);
      if (roomData) {
        room = new Room(
          roomData.gameId,
          roomName,
          null, // password will be handled separately
          {
            id: roomData.players[0],
            ready: false,
            choice: null,
            wantsToPlayAgain: false
          }
        );
        if (roomData.players.length > 1) {
          room.addGuest({
            id: roomData.players[1],
            ready: false,
            choice: null,
            wantsToPlayAgain: false
          });
        }
        room.status = roomData.status;
        this.rooms.set(roomData.gameId, room);
      }
    }
    
    return room;
  }

  findRoomById(roomId) {
    return this.rooms.get(roomId);
  }

  async deleteRoom(roomId) {
    const room = this.rooms.get(roomId);
    if (room) {
      await redis.deleteRoom(room.name);
      this.rooms.delete(roomId);
    }
  }

  getPublicRooms() {
    return Array.from(this.rooms.values())
      .filter(room => !room.hasPassword() && !room.isFull())
      .map(room => room.toPublicRoom());
  }

  static determineWinner(hostChoice, guestChoice) {
    if (hostChoice === guestChoice) {
      return 'tie';
    }
    
    const winningCombinations = {
      rock: 'scissors',
      scissors: 'paper',
      paper: 'rock'
    };

    return winningCombinations[hostChoice] === guestChoice ? 'host' : 'guest';
  }
} 