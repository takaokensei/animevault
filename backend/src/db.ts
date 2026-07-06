import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

class DbStore {
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
        console.error('Erro ao ler base de dados do SaaS:', err);
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
      console.error('Erro ao salvar base de dados do SaaS:', err);
    }
  }

  // --- Operações de Usuários ---
  findUserByEmail(email: string): SaasUser | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  createUser(user: SaasUser): void {
    this.users.push(user);
    this.save();
  }

  // --- Operações de Animes (Sincronismo) ---
  upsertAnime(anime: CloudAnime): void {
    // Remove registro existente do mesmo anime e usuário para reinserir
    this.animes = this.animes.filter(
      a => !(a.userId === anime.userId && a.animeId === anime.animeId)
    );
    this.animes.push(anime);
    this.save();
  }

  deleteAnime(userId: string, animeId: string): void {
    this.animes = this.animes.filter(
      a => !(a.userId === userId && a.animeId === animeId)
    );
    this.save();
  }

  getUserAnimes(userId: string): CloudAnime[] {
    return this.animes.filter(a => a.userId === userId);
  }
}

export const dbStore = new DbStore();
