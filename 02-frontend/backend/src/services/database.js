import pg from 'pg';
const { Pool } = pg;

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    this.init();
  }

  async init() {
    const client = await this.pool.connect();
    try {
      // Create tables if they don't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS games (
          id SERIAL PRIMARY KEY,
          room_name VARCHAR(255) UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS players (
          id SERIAL PRIMARY KEY,
          game_id INTEGER REFERENCES games(id),
          player_id VARCHAR(255) NOT NULL,
          score INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(game_id, player_id)
        );

        CREATE TABLE IF NOT EXISTS rounds (
          id SERIAL PRIMARY KEY,
          game_id INTEGER REFERENCES games(id),
          round_number INTEGER NOT NULL,
          player1_id VARCHAR(255) NOT NULL,
          player1_choice VARCHAR(50),
          player2_id VARCHAR(255) NOT NULL,
          player2_choice VARCHAR(50),
          winner_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(game_id, round_number)
        );
      `);
    } finally {
      client.release();
    }
  }

  async createGame(roomName) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const gameResult = await client.query(
        'INSERT INTO games (room_name) VALUES ($1) RETURNING id',
        [roomName]
      );
      
      await client.query('COMMIT');
      return gameResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async addPlayer(gameId, playerId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        'INSERT INTO players (game_id, player_id) VALUES ($1, $2)',
        [gameId, playerId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveRound(gameId, roundNumber, player1Id, player1Choice, player2Id, player2Choice, winnerId) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `INSERT INTO rounds 
        (game_id, round_number, player1_id, player1_choice, player2_id, player2_choice, winner_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [gameId, roundNumber, player1Id, player1Choice, player2Id, player2Choice, winnerId]
      );

      if (winnerId) {
        await client.query(
          'UPDATE players SET score = score + 1 WHERE game_id = $1 AND player_id = $2',
          [gameId, winnerId]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getGameHistory(roomName) {
    const client = await this.pool.connect();
    try {
      const gameResult = await client.query(
        'SELECT id FROM games WHERE room_name = $1',
        [roomName]
      );

      if (gameResult.rows.length === 0) return null;

      const gameId = gameResult.rows[0].id;

      const [players, rounds] = await Promise.all([
        client.query(
          'SELECT player_id, score FROM players WHERE game_id = $1',
          [gameId]
        ),
        client.query(
          `SELECT round_number, player1_id, player1_choice, 
           player2_id, player2_choice, winner_id
           FROM rounds WHERE game_id = $1 ORDER BY round_number`,
          [gameId]
        )
      ]);

      return {
        players: players.rows,
        rounds: rounds.rows
      };
    } finally {
      client.release();
    }
  }
}

export default new DatabaseService(); 