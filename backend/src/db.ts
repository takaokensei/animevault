import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, '../data-store.json');

// Interface do usuário SaaS
export interface SaasUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

// Interface de registros de animes sincronizados na nuvem
export interface CloudAnime {
  userId: string;
  animeId: string;
  title: string;
  currentEpisode: number;
  status: string;
  rating: number;
  localPath?: string;
  lastWatched?: string;
  notes?: string;
  updatedAt: string;
}

// Interface abstrata do Database para suportar JSON local ou PostgreSQL
interface IDatabase {
  findUserByEmail(email: string): Promise<SaasUser | undefined>;
  createUser(user: SaasUser): Promise<void>;
  upsertAnime(anime: CloudAnime): Promise<void>;
  deleteAnime(userId: string, animeId: string): Promise<void>;
  getUserAnimes(userId: string): Promise<CloudAnime[]>;
}

// Implementação em Arquivo JSON (Local Dev Fallback)
class JsonDbStore implements IDatabase {
  private users: SaasUser[] = [];
  private animes: CloudAnime[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.users = data.users || [];
        this.animes = data.animes || [];
      } catch (err) {
        console.error('Erro ao ler base de dados do SaaS (JSON):', err);
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify({
        users: this.users,
        animes: this.animes
      }, null, 2));
    } catch (err) {
      console.error('Erro ao salvar base de dados do SaaS (JSON):', err);
    }
  }

  async findUserByEmail(email: string): Promise<SaasUser | undefined> {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(user: SaasUser): Promise<void> {
    this.users.push(user);
    this.save();
  }

  async upsertAnime(anime: CloudAnime): Promise<void> {
    this.animes = this.animes.filter(
      a => !(a.userId === anime.userId && a.animeId === anime.animeId)
    );
    this.animes.push(anime);
    this.save();
  }

  async deleteAnime(userId: string, animeId: string): Promise<void> {
    this.animes = this.animes.filter(
      a => !(a.userId === userId && a.animeId === animeId)
    );
    this.save();
  }

  async getUserAnimes(userId: string): Promise<CloudAnime[]> {
    return this.animes.filter(a => a.userId === userId);
  }
}

// Implementação em PostgreSQL (Production/Staging Ready)
class PostgresDbStore implements IDatabase {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    console.log('[SaaS Database] Inicializando Pool de Conexão com PostgreSQL...');
    this.pool = new pg.Pool({ connectionString });
    this.initializeTables();
  }

  private async initializeTables() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Cria tabela de usuários
      await client.query(`
        CREATE TABLE IF NOT EXISTS zenith_users (
          id VARCHAR(50) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Cria tabela de animes
      await client.query(`
        CREATE TABLE IF NOT EXISTS zenith_animes (
          user_id VARCHAR(50) NOT NULL REFERENCES zenith_users(id) ON DELETE CASCADE,
          anime_id VARCHAR(50) NOT NULL,
          title TEXT NOT NULL,
          current_episode INTEGER NOT NULL DEFAULT 0,
          status VARCHAR(50) NOT NULL,
          rating DOUBLE PRECISION NOT NULL DEFAULT 0,
          local_path TEXT,
          last_watched TIMESTAMP,
          notes TEXT,
          updated_at TIMESTAMP NOT NULL,
          PRIMARY KEY (user_id, anime_id)
        )
      `);

      await client.query('COMMIT');
      console.log('[SaaS Database] Tabelas do PostgreSQL inicializadas com sucesso.');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[SaaS Database] Erro ao inicializar tabelas no PostgreSQL:', err);
    } finally {
      client.release();
    }
  }

  async findUserByEmail(email: string): Promise<SaasUser | undefined> {
    const res = await this.pool.query(
      'SELECT id, email, name, password_hash as "passwordHash", created_at as "createdAt" FROM zenith_users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return res.rows[0];
  }

  async createUser(user: SaasUser): Promise<void> {
    await this.pool.query(
      'INSERT INTO zenith_users (id, email, name, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.email, user.name, user.passwordHash, new Date(user.createdAt)]
    );
  }

  async upsertAnime(anime: CloudAnime): Promise<void> {
    await this.pool.query(
      `INSERT INTO zenith_animes (user_id, anime_id, title, current_episode, status, rating, local_path, last_watched, notes, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (user_id, anime_id) DO UPDATE SET
         title = EXCLUDED.title,
         current_episode = EXCLUDED.current_episode,
         status = EXCLUDED.status,
         rating = EXCLUDED.rating,
         local_path = EXCLUDED.local_path,
         last_watched = EXCLUDED.last_watched,
         notes = EXCLUDED.notes,
         updated_at = EXCLUDED.updated_at`,
      [
        anime.userId,
        anime.animeId,
        anime.title,
        anime.currentEpisode,
        anime.status,
        anime.rating,
        anime.localPath || null,
        anime.lastWatched ? new Date(anime.lastWatched) : null,
        anime.notes || null,
        new Date(anime.updatedAt)
      ]
    );
  }

  async deleteAnime(userId: string, animeId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM zenith_animes WHERE user_id = $1 AND anime_id = $2',
      [userId, animeId]
    );
  }

  async getUserAnimes(userId: string): Promise<CloudAnime[]> {
    const res = await this.pool.query(
      `SELECT 
         user_id as "userId",
         anime_id as "animeId",
         title,
         current_episode as "currentEpisode",
         status,
         rating,
         local_path as "localPath",
         last_watched as "lastWatched",
         notes,
         updated_at as "updatedAt"
       FROM zenith_animes WHERE user_id = $1`,
      [userId]
    );
    return res.rows.map(row => ({
      ...row,
      lastWatched: row.lastWatched ? row.lastWatched.toISOString() : undefined,
      updatedAt: row.updatedAt.toISOString()
    }));
  }
}

// Exporta a instância ativa baseada nas variáveis de ambiente (.env)
// Carrega dotenv para garantir leitura de .env no backend
import dotenv from 'dotenv';
dotenv.config();

const pgUrl = process.env.DATABASE_URL;
export const dbStore: IDatabase = pgUrl ? new PostgresDbStore(pgUrl) : new JsonDbStore();
