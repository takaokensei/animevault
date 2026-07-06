import { invoke } from './tauriService';
// Importe as ferramentas robustas do seu authService
import { 
  authService, 
  malApiRequest, 
  processBatch 
} from './authService';
import {
  jikanSearchAnime,
  jikanGetAnimeDetails,
  jikanToMalAnime,
} from './jikanService';


// --- Interfaces (mantidas como estavam) ---
export interface MalAnime {
  id: number;
  title: string;
  main_picture?: { large?: string; medium?: string };
  alternative_titles?: { synonyms?: string[]; en?: string; ja?: string; };
  synopsis?: string;
  mean?: number;
  rank?: number;
  popularity?: number;
  num_list_users?: number;
  num_scoring_users?: number;
  nsfw?: string;
  created_at?: string;
  updated_at?: string;
  media_type?: string;
  status?: string;
  genres?: Array<{ id: number; name: string; }>;
  num_episodes?: number;
  start_season?: { year?: number; season?: string; };
  broadcast?: { day_of_the_week?: string; start_time?: string; };
  source?: string;
  average_episode_duration?: number;
  studios?: Array<{ id: number; name: string; }>;
  pictures?: Array<{ large?: string; medium?: string; }>;
  background?: string;
  related_anime?: Array<{ node: { id: number; title: string; }; relation_type: string; }>;
  related_manga?: Array<{ node: { id: number; title: string; }; relation_type: string; }>;
  recommendations?: Array<{ node: { id: number; title: string; }; num_recommendations: number; }>;
  statistics?: { status?: { watching?: number; completed?: number; on_hold?: number; dropped?: number; plan_to_watch?: number; }; num_list_users?: number; };
}

export interface MalUserAnimeList {
  data: Array<{
    node: MalAnime;
    list_status: {
      status: string;
      score: number;
      num_episodes_watched: number;
      is_rewatching: boolean;
      updated_at: string;
      priority?: number;
      num_times_rewatched?: number;
      rewatch_value?: number;
      tags?: string[];
      comments?: string;
      start_date?: string;
      finish_date?: string;
    };
  }>;
  paging: {
    next?: string;
    previous?: string;
  };
}

export interface MalUser {
  id: number;
  name: string;
  picture: string;
  gender?: string;
  birthday?: string;
  location?: string;
  joined_at?: string;
  anime_statistics?: {
    num_items_watching: number;
    num_items_completed: number;
    num_items_on_hold: number;
    num_items_dropped: number;
    num_items_plan_to_watch: number;
    num_items: number;
    num_days_watched: number;
    num_days_watching: number;
    num_days_completed: number;
    num_days_on_hold: number;
    num_days_dropped: number;
    num_days: number;
    num_episodes: number;
    mean_score: number;
  };
}

export interface MalSearchResult {
  data: Array<{ node: MalAnime }>;
  paging: {
    next?: string;
  };
}

class MalService {
  private static instance: MalService;

  static getInstance(): MalService {
    if (!MalService.instance) {
      MalService.instance = new MalService();
    }
    return MalService.instance;
  }

  /**
   * Obtém um token válido do authService.
   * Lança um erro se o usuário não estiver autenticado.
   */
  private getValidToken(): string {
    const token = authService.getValidToken();
    if (!token) {
      throw new Error('Usuário não autenticado. Faça o login para continuar.');
    }
    return token;
  }

  // ===== CHAMADAS PÚBLICAS (sempre funcionam) =====
  // Todas as chamadas agora usam 'malApiRequest' para ganhar retries e rate limiting.
  // Em caso de falha, fallback transparente para a Jikan API (open-source, sem auth).

  async searchAnime(query: string, limit = 20, offset = 0): Promise<MalSearchResult> {
    try {
      return await malApiRequest<MalSearchResult>(
        () => invoke('mal_search_anime', { query, limit, offset }),
        `Search Anime (${query})`
      );
    } catch (err) {
      // Fallback Jikan quando MAL rate-limited ou offline
      console.warn(`[MalService] MAL falhou em searchAnime. Usando Jikan API como fallback. Erro:`, err);
      const jikanResults = await jikanSearchAnime(query, limit);
      return {
        data: jikanResults.map(j => ({ node: jikanToMalAnime(j) as MalAnime })),
        paging: {},
      };
    }
  }

  async getAnimeDetails(animeId: number): Promise<MalAnime> {
    try {
      return await malApiRequest<MalAnime>(
        () => invoke('get_anime_details', { animeId }),
        `Get Anime Details (${animeId})`
      );
    } catch (err) {
      // Fallback Jikan quando MAL rate-limited ou offline
      console.warn(`[MalService] MAL falhou em getAnimeDetails(${animeId}). Usando Jikan API como fallback. Erro:`, err);
      const jikanData = await jikanGetAnimeDetails(animeId);
      return jikanToMalAnime(jikanData) as MalAnime;
    }
  }

  // ===== CHAMADAS AUTENTICADAS (requerem login) =====
  // Todas as chamadas agora usam 'malApiRequest' para robustez.

  async getUserAnimeList(status?: string, limit = 100, offset = 0): Promise<MalUserAnimeList> {
    const operationName = `Get User Anime List${status ? ` (${status})` : ''}`;
    
    return malApiRequest<MalUserAnimeList>(() => {
      const token = this.getValidToken();
      return invoke('get_authenticated_anime_list', { token, status, limit, offset });
    }, operationName);
  }
  
  async updateAnimeStatus(animeId: number, status: string, score?: number, numEpisodesWatched?: number, comments?: string): Promise<any> {
    return malApiRequest<any>(() => {
      const token = this.getValidToken();
      return invoke('add_anime_to_list', { 
        token, 
        animeId, 
        status, 
        score, 
        numEpisodesWatched, 
        comments 
      });
    }, `Update Anime Status (${animeId})`);
  }

  async removeAnimeFromList(animeId: number): Promise<void> {
    return malApiRequest<void>(() => {
      const token = this.getValidToken();
      return invoke('mal_remove_anime_from_list', { token, animeId });
    }, `Remove Anime From List (${animeId})`);
  }

  async getAuthenticatedUser(): Promise<MalUser> {
    return malApiRequest<MalUser>(() => {
      const token = this.getValidToken();
      return invoke('get_authenticated_user_profileer_profile', { token });
    }, 'Get Authenticated User Profile');
  }

  // ===== SINCRONIZAÇÃO E PROCESSAMENTO EM LOTES =====
  // Implementação das sugestões de Sincronização e Batch.

  /**
   * Sincroniza a lista completa de animes do usuário.
   * Processa cada status sequencialmente para evitar sobrecarga da API.
   * Retorna um objeto com todas as listas de animes do usuário.
   */
  async syncFullUserList(): Promise<Record<string, MalUserAnimeList['data']>> {
    const statusList = ['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch'] as const;
    const result: Record<string, MalUserAnimeList['data']> = {};
    
    console.log('Iniciando sincronização completa da lista de animes...');

    for (const status of statusList) {
      try {
        console.log(`Sincronizando status: ${status}...`);
        const response = await this.getUserAnimeList(status, 1000); // Pega até 1000 por status
        result[status] = response.data || [];
        console.log(`✓ ${status}: ${result[status].length} animes encontrados.`);

        // Pausa extra entre cada categoria para garantir a segurança do rate limit
        await new Promise(resolve => setTimeout(resolve, 1500)); 
      } catch (error) {
        console.error(`Erro ao sincronizar a categoria '${status}'. Continuando para a próxima.`, error);
        result[status] = []; // Garante que a chave exista, mesmo em caso de erro
      }
    }

    const totalAnimes = Object.values(result).reduce((sum, list) => sum + list.length, 0);
    console.log(`Sincronização concluída! Total de ${totalAnimes} animes carregados.`);
    
    return result;
  }
  
  /**
   * Busca detalhes de múltiplos animes em lotes para evitar sobrecarga.
   * @param animeIds Array com os IDs dos animes.
   * @returns Um array com os detalhes dos animes. Animes que falharem serão `null`.
   */
  async getMultipleAnimeDetails(animeIds: number[]): Promise<(MalAnime | null)[]> {
    console.log(`Buscando detalhes de ${animeIds.length} animes em lotes...`);
    
    return processBatch(
      animeIds,
      async (id) => {
        try {
          return await this.getAnimeDetails(id);
        } catch (error) {
          console.error(`Falha ao buscar detalhes do anime ID ${id}.`, error);
          return null; // Retorna null para não quebrar todo o processo
        }
      },
      5, // Tamanho do lote (5 animes por vez)
      2000 // Pausa de 2 segundos entre os lotes
    );
  }

  // ===== UTILITÁRIOS =====

  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }
}

// Exportar instância singleton
export const malService = MalService.getInstance();