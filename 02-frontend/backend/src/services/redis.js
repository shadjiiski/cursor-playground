import Redis from 'ioredis';
import database from './database.js';

class RedisService {
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Room management
  async createRoom(roomName, playerId) {
    const roomKey = `room:${roomName}`;
    
    // Create game in PostgreSQL
    const game = await database.createGame(roomName);
    await database.addPlayer(game.id, playerId);
    
    // Store in Redis
    await this.redis.hset(roomKey, {
      gameId: game.id,
      players: JSON.stringify([playerId]),
      status: 'waiting',
      currentRound: 0,
      scores: JSON.stringify({ [playerId]: 0 })
    });
    
    return this.getRoom(roomName);
  }

  async joinRoom(roomName, playerId) {
    const roomKey = `room:${roomName}`;
    const room = await this.getRoom(roomName);
    
    if (!room) return null;
    if (room.players.length >= 2) return null;
    
    // Add player to PostgreSQL
    await database.addPlayer(room.gameId, playerId);
    
    const players = [...room.players, playerId];
    const scores = { ...room.scores, [playerId]: 0 };
    
    await this.redis.hset(roomKey, {
      players: JSON.stringify(players),
      scores: JSON.stringify(scores)
    });
    
    return this.getRoom(roomName);
  }

  async getRoom(roomName) {
    const roomKey = `room:${roomName}`;
    const room = await this.redis.hgetall(roomKey);
    
    if (!room || Object.keys(room).length === 0) {
      // Try to restore from PostgreSQL
      const history = await database.getGameHistory(roomName);
      if (history) {
        const players = history.players.map(p => p.player_id);
        const scores = Object.fromEntries(
          history.players.map(p => [p.player_id, p.score])
        );
        
        await this.redis.hset(roomKey, {
          gameId: history.gameId,
          players: JSON.stringify(players),
          status: 'playing',
          currentRound: history.rounds.length,
          scores: JSON.stringify(scores)
        });
        
        return {
          gameId: history.gameId,
          players,
          status: 'playing',
          currentRound: history.rounds.length,
          scores
        };
      }
      return null;
    }
    
    return {
      ...room,
      players: JSON.parse(room.players),
      scores: JSON.parse(room.scores)
    };
  }

  // Round management
  async saveChoice(roomName, playerId, choice) {
    const room = await this.getRoom(roomName);
    if (!room) return null;
    
    const roundKey = `round:${roomName}:${room.currentRound}`;
    await this.redis.hset(roundKey, playerId, choice);
    
    // Check if both players have made their choices
    const round = await this.redis.hgetall(roundKey);
    if (Object.keys(round).length === 2) {
      const winner = this.determineWinner(round);
      await this.redis.hset(roundKey, 'winner', winner);
      
      // Update scores
      if (winner) {
        const scores = { ...room.scores };
        scores[winner] = (scores[winner] || 0) + 1;
        await this.redis.hset(`room:${roomName}`, 'scores', JSON.stringify(scores));
      }
      
      // Save to PostgreSQL
      const [player1Id, player2Id] = room.players;
      await database.saveRound(
        room.gameId,
        room.currentRound,
        player1Id,
        round[player1Id],
        player2Id,
        round[player2Id],
        winner
      );
      
      // Increment round
      await this.redis.hincrby(`room:${roomName}`, 'currentRound', 1);
    }
    
    return this.getRound(roomName, room.currentRound);
  }

  async getRound(roomName, roundNumber) {
    const roundKey = `round:${roomName}:${roundNumber}`;
    return await this.redis.hgetall(roundKey);
  }

  // Helper methods
  determineWinner(round) {
    const choices = Object.entries(round).filter(([key]) => key !== 'winner');
    if (choices.length !== 2) return null;
    
    const [[player1, choice1], [player2, choice2]] = choices;
    
    if (choice1 === choice2) return null;
    
    const winningCombos = {
      'rock': 'scissors',
      'paper': 'rock',
      'scissors': 'paper'
    };
    
    return winningCombos[choice1] === choice2 ? player1 : player2;
  }

  // Cleanup
  async deleteRoom(roomName) {
    const roomKey = `room:${roomName}`;
    const room = await this.getRoom(roomName);
    
    if (room) {
      // Delete all rounds from Redis
      for (let i = 0; i < room.currentRound; i++) {
        await this.redis.del(`round:${roomName}:${i}`);
      }
      // Delete room from Redis
      await this.redis.del(roomKey);
    }
  }
}

export default new RedisService(); 