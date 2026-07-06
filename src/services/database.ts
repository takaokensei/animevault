import Database from '@tauri-apps/plugin-sql';
import { CREATE_ALL_TABLES } from '../database/schema';

// Caminho do banco local (padrão para Tauri)
const DB_PATH = 'sqlite:animevault.db';

// Mock Database para desenvolvimento fora do Tauri
class MockDatabase {
  async execute(query: string, bindValues?: any[]): Promise<any> {
    console.log('[MockDatabase] execute:', query, bindValues);
    return { rowsAffected: 0, lastInsertId: 0 };
  }

  async select(query: string, bindValues?: any[]): Promise<any[]> {
    console.log('[MockDatabase] select:', query, bindValues);
    if (query.includes('FROM animes') || query.includes('SELECT * FROM animes')) {
      try {
        const stored = localStorage.getItem('mock_animes');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        console.error('[MockDatabase] Erro ao ler mock_animes', e);
        return [];
      }
    }
    return [];
  }
}

export class DatabaseService {
  private static instance: DatabaseService;
  private db: any = null;

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async getDb(): Promise<any> {
    if (!this.db) {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
      
      if (isTauri) {
        // Abre (ou cria) o banco SQLite
        this.db = await Database.load(DB_PATH);
        // Cria todas as tabelas se não existirem
        await this.db.execute(CREATE_ALL_TABLES);
      } else {
        console.warn('[DatabaseService] Fora do ambiente Tauri. Usando MockDatabase.');
        this.db = new MockDatabase();
      }
    }
    return this.db;
  }

  // Método para fechar a conexão (útil para testes)
  async closeDb(): Promise<void> {
    if (this.db) {
      this.db = null;
    }
  }

  // Método para resetar o banco (útil para desenvolvimento)
  async resetDb(): Promise<void> {
    if (this.db) {
      const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
      if (isTauri) {
        await this.db.execute('DROP TABLE IF EXISTS animes');
        await this.db.execute('DROP TABLE IF EXISTS users');
        await this.db.execute('DROP TABLE IF EXISTS auth_tokens');
        await this.db.execute('DROP TABLE IF EXISTS user_anime_list');
        await this.db.execute(CREATE_ALL_TABLES);
      } else {
        localStorage.removeItem('mock_animes');
      }
    }
  }
}

// Função de conveniência para manter compatibilidade
export async function getDb(): Promise<any> {
  return await DatabaseService.getInstance().getDb();
}

// Exportar instância singleton
export const databaseService = DatabaseService.getInstance();
 