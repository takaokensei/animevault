import { getDb } from './database';
import { malService, MalAnime } from './malService';
import { authService } from './authService';
import { AnimeEntry } from '../types/anime';
import { syncService } from './syncService';


export interface AnimeSearchResult {
  animes: AnimeEntry[];
  hasMore: boolean;
  total: number;
}

// Helper para formatar datas antes de salvar no SQLite
const formatDbDate = (val: string | Date | undefined): string | null => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return val; // Já é uma string ISO
};

export class AnimeService {
  private static instance: AnimeService;

  static getInstance(): AnimeService {
    if (!AnimeService.instance) {
      AnimeService.instance = new AnimeService();
    }
    return AnimeService.instance;
  }

  // ===== OPERAÇÕES LOCAIS =====

  // Inserir anime no banco local
  async inserirAnime(anime: AnimeEntry): Promise<void> {
    const db = await getDb();
    await db.execute(
      `INSERT OR REPLACE INTO animes (
        id, title, alternativeTitles, synopsis, coverImage, bannerImage, screenshots,
        episodes, currentEpisode, status, rating, genres, studios, year, season,
        localPath, streamingLinks, lastWatched, dateAdded, notes, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        anime.id,
        anime.title,
        JSON.stringify(anime.alternativeTitles ?? []),
        anime.synopsis,
        anime.coverImage,
        anime.bannerImage,
        anime.screenshots ? JSON.stringify(anime.screenshots) : '[]',
        anime.episodes,
        anime.currentEpisode,
        anime.status,
        anime.rating,
        JSON.stringify(anime.genres ?? []),
        JSON.stringify(anime.studios ?? []),
        anime.year,
        anime.season,
        anime.localPath,
        JSON.stringify(anime.streamingLinks ?? []),
        formatDbDate(anime.lastWatched),
        formatDbDate(anime.dateAdded),
        anime.notes,
        JSON.stringify(anime.tags ?? [])
      ]
    );

    // Registra modificação na fila de sincronização (Outbox Pattern)
    await syncService.enqueueSyncEvent('UPSERT_ANIME', {
      id: anime.id,
      title: anime.title,
      currentEpisode: anime.currentEpisode,
      status: anime.status,
      rating: anime.rating,
      localPath: anime.localPath,
      lastWatched: formatDbDate(anime.lastWatched),
      notes: anime.notes
    });
  }

  // Buscar animes do banco local
  async buscarAnimes(): Promise<AnimeEntry[]> {
    const db = await getDb();
    const result = (await db.select('SELECT * FROM animes ORDER BY dateAdded DESC')) as any[];
    return result.map((anime: any) => this.transformDatabaseAnime(anime));
  }

  // Buscar anime específico no banco local
  async buscarAnimePorId(id: string): Promise<AnimeEntry | null> {
    const db = await getDb();
    const result = (await db.select('SELECT * FROM animes WHERE id = ?', [id])) as any[];
    
    if (result.length === 0) return null;
    
    return this.transformDatabaseAnime(result[0]);
  }

  // Atualizar anime no banco local
  async atualizarAnime(anime: AnimeEntry): Promise<void> {
    await this.inserirAnime(anime); // INSERT OR REPLACE
  }

  // Remover anime do banco local
  async removerAnime(id: string): Promise<void> {
    const db = await getDb();
    await db.execute('DELETE FROM animes WHERE id = ?', [id]);

    // Registra remoção na fila de sincronização (Outbox Pattern)
    await syncService.enqueueSyncEvent('DELETE_ANIME', { id });
  }

  // ===== OPERAÇÕES HÍBRIDAS (MAL + Local) =====

  // Buscar animes no MAL e sincronizar com local
  async buscarAnimesMAL(query: string, limit = 20, offset = 0): Promise<AnimeSearchResult> {
    try {
      // Buscar no MAL
      const malResult = await malService.searchAnime(query, limit, offset);
      console.log('malResult recebido:', malResult);
      
      // Converter para formato local e salvar
      const animes: AnimeEntry[] = [];
      for (const malAnimeWrapper of malResult.data) {
        // Se vier { node: ... }, usa node, senão usa direto
        const malAnime = (malAnimeWrapper as any).node ? (malAnimeWrapper as any).node : malAnimeWrapper;
        const animeEntry = this.convertMalToLocal(malAnime);
        await this.inserirAnime(animeEntry);
        animes.push(animeEntry);
      }
      
      return {
        animes,
        hasMore: !!malResult.paging.next,
        total: animes.length,
      };
    } catch (error) {
      console.error('Erro ao buscar animes no MAL:', error);
      // Fallback: buscar apenas no local
      const animes = await this.buscarAnimes();
      return {
        animes: animes.filter(anime => 
          anime.title.toLowerCase().includes(query.toLowerCase()) ||
          anime.alternativeTitles.some(title => 
            title.toLowerCase().includes(query.toLowerCase())
          )
        ),
        hasMore: false,
        total: animes.length,
      };
    }
  }

  // Obter detalhes de um anime (MAL + local) com Cache Stale-While-Revalidate (LWW)
  async obterDetalhesAnime(animeId: string): Promise<AnimeEntry | null> {
    try {
      // Buscar local primeiro
      const localAnime = await this.buscarAnimePorId(animeId);
      
      // Se o anime já existe no banco local e foi atualizado há menos de 30 dias, 
      // retornamos o cache local imediatamente para evitar chamadas de rede e rate-limits
      if (localAnime && localAnime.dateAdded) {
        const dateAdded = new Date(localAnime.dateAdded);
        const diffTime = Math.abs(Date.now() - dateAdded.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 30 && localAnime.synopsis && localAnime.genres && localAnime.genres.length > 0) {
          console.log(`[AnimeService] Usando cache local para anime ID ${animeId} (idade: ${diffDays} dias).`);
          return localAnime;
        }
      }

      let malAnime = null;
      try {
        console.log(`[AnimeService] Buscando detalhes de ID ${animeId} na rede/MAL...`);
        malAnime = await malService.getAnimeDetails(Number(animeId));
      } catch (e) {
        // Se não conseguir buscar do MAL (offline/rate-limited), retorna cache local
        console.warn(`[AnimeService] Falha ao buscar detalhes online para ID ${animeId}, usando cache local.`, e);
        return localAnime;
      }
      
      if (localAnime) {
        // Mescla: MAL só sobrescreve metadados, nunca status/episódios/score do local
        const merged = this.mergeLocalWithMal(localAnime, malAnime);
        // Atualiza no banco para renovar a data/limitar o cache
        await this.atualizarAnime(merged);
        return merged;
      }
      
      // Se não houver local, insere e retorna
      const converted = this.convertMalToLocal(malAnime);
      await this.inserirAnime(converted);
      return converted;
    } catch (error) {
      console.error('Erro ao obter detalhes do MAL:', error);
      return null;
    }
  }

  // Adicionar anime à lista (MAL + local)
  async adicionarAnimeALista(animeId: string, status: string, score?: number, episodesWatched?: number, comments?: string): Promise<void> {
    try {
      // Se autenticado, adicionar ao MAL
      if (authService.isAuthenticated()) {
        await malService.updateAnimeStatus(Number(animeId), status, score, episodesWatched, comments);
      }
    } catch (error) {
      console.error('Erro ao adicionar/atualizar no MAL:', error);
      // Continuar mesmo se falhar no MAL
    }

    // Sempre adicionar ao banco local
    const anime = await this.obterDetalhesAnime(animeId);
    if (anime) {
      anime.status = status as any;
      anime.rating = score || 0;
      anime.currentEpisode = episodesWatched || 0;
      anime.notes = comments || '';
      anime.lastWatched = new Date();
      
      await this.atualizarAnime(anime);
    }
  }

  // Sincronizar lista do usuário (MAL -> Local)
  async sincronizarListaUsuario(
    onProgress?: (current: number, total: number, title?: string) => void, 
    resumeIndex: number = 0, 
    cancelFlag?: () => boolean
  ): Promise<void> {
    const token = authService.getValidToken();
    if (!token) {
      const localAnimes = await this.buscarAnimes();
      for (const localAnime of localAnimes) {
        await this.removerAnime(localAnime.id);
      }
      throw new Error('Usuário deve estar autenticado para sincronizar');
    }

    try {
      const allMalAnimes = await this.fetchAllUserAnimes(cancelFlag);
      
      if (cancelFlag && cancelFlag()) {
        throw new Error('Sincronização cancelada pelo usuário');
      }
      
      await this.cleanupRemovedAnimes(allMalAnimes, cancelFlag);
      await this.processUserAnimes(allMalAnimes, onProgress, resumeIndex, cancelFlag);
    } catch (error: any) {
      if (this.isHtmlResponseError(error)) {
        this.clearMalTokens();
        throw new Error('Sessão expirada ou bloqueada pelo MAL. Faça login novamente.');
      }
      console.error('Erro ao sincronizar lista:', error);
      throw error;
    }
  }

  // ===== UTILITÁRIOS PRIVADOS =====

  // Transformar resultado do banco de dados para AnimeEntry
  private transformDatabaseAnime(dbAnime: any): AnimeEntry {
    return {
      id: dbAnime.id.toString(),
      title: dbAnime.title,
      alternativeTitles: this.parseJsonField(dbAnime.alternativeTitles),
      synopsis: dbAnime.synopsis, // Fixed: was dbAnime.synopse
      coverImage: dbAnime.coverImage,
      bannerImage: dbAnime.bannerImage,
      screenshots: this.parseJsonField(dbAnime.screenshots),
      episodes: dbAnime.episodes,
      currentEpisode: dbAnime.currentEpisode,
      status: dbAnime.status,
      rating: dbAnime.rating,
      genres: this.parseJsonField(dbAnime.genres),
      studios: this.parseJsonField(dbAnime.studios),
      year: dbAnime.year,
      season: dbAnime.season,
      localPath: dbAnime.localPath,
      streamingLinks: this.parseJsonField(dbAnime.streamingLinks),
      lastWatched: dbAnime.lastWatched ? new Date(dbAnime.lastWatched) : new Date(),
      dateAdded: dbAnime.dateAdded ? new Date(dbAnime.dateAdded) : new Date(),
      notes: dbAnime.notes || '',
      tags: this.parseJsonField(dbAnime.tags)
    };
  }

  // Converter anime do MAL para formato local
  private convertMalToLocal(malAnime: MalAnime): AnimeEntry {
    const coverImage = this.extractCoverImage(malAnime);
    
    return {
      id: malAnime?.id?.toString() || '',
      title: malAnime.title || '',
      alternativeTitles: this.extractAlternativeTitles(malAnime),
      synopsis: malAnime.synopsis || '',
      coverImage,
      bannerImage: malAnime.pictures?.[1]?.large || malAnime.pictures?.[1]?.medium || '',
      screenshots: this.extractScreenshots(malAnime),
      episodes: malAnime.num_episodes || 0,
      currentEpisode: 0,
      status: 'planned',
      rating: malAnime.mean || 0,
      genres: malAnime.genres?.map(g => g.name) || [],
      studios: malAnime.studios?.map(s => s.name) || [],
      year: malAnime.start_season?.year || 0,
      season: malAnime.start_season?.season || '',
      localPath: undefined,
      streamingLinks: [],
      lastWatched: new Date(),
      dateAdded: new Date(),
      notes: '',
      tags: [],
    };
  }

  // Mesclar dados locais com dados do MAL
  private mergeLocalWithMal(localAnime: AnimeEntry, malAnime: MalAnime): AnimeEntry {
    return {
      ...localAnime,
      synopsis: malAnime.synopsis || localAnime.synopsis,
      coverImage: this.extractCoverImage(malAnime) || localAnime.coverImage,
      bannerImage: malAnime.pictures?.[1]?.large || malAnime.pictures?.[1]?.medium || localAnime.bannerImage,
      screenshots: this.extractScreenshots(malAnime) || localAnime.screenshots,
      genres: malAnime.genres?.map(g => g.name) || localAnime.genres,
      studios: malAnime.studios?.map(s => s.name) || localAnime.studios,
      year: malAnime.start_season?.year || localAnime.year,
      season: malAnime.start_season?.season || localAnime.season,
      title: malAnime.title || localAnime.title,
      alternativeTitles: this.extractAlternativeTitles(malAnime) || localAnime.alternativeTitles,
      // status, currentEpisode, rating, notes, etc SEMPRE do local!
    };
  }

  // Buscar todos os animes do usuário no MAL
  private async fetchAllUserAnimes(cancelFlag?: () => boolean): Promise<any[]> {
    let allMalAnimes: any[] = [];
    let offset = 0;
    const limit = 1000;
    let hasNext = true;
    
    while (hasNext) {
      if (cancelFlag && cancelFlag()) {
        throw new Error('Sincronização cancelada pelo usuário');
      }
      
      const malList = await this.fetchUserAnimeListPage(limit, offset);
      allMalAnimes = allMalAnimes.concat(malList.data);
      
      if (malList.paging && malList.paging.next) {
        offset += limit;
      } else {
        hasNext = false;
      }
    }
    
    return allMalAnimes;
  }

  // Buscar uma página da lista do usuário
  private async fetchUserAnimeListPage(limit: number, offset: number) {
    try {
      return await malService.getUserAnimeList(undefined, limit, offset);
    } catch (err: any) {
      if (this.isHtmlResponseError(err)) {
        this.clearMalTokens();
        throw new Error('Sessão expirada ou bloqueada pelo MAL. Faça login novamente.');
      }
      throw err;
    }
  }

  // Limpar animes removidos da lista do usuário
  private async cleanupRemovedAnimes(allMalAnimes: any[], cancelFlag?: () => boolean): Promise<void> {
    const userAnimeIds = allMalAnimes.map(item => (item.node || item).id.toString());
    const localAnimes = await this.buscarAnimes();
    
    for (const localAnime of localAnimes) {
      if (cancelFlag && cancelFlag()) {
        throw new Error('Sincronização cancelada pelo usuário');
      }
      if (!userAnimeIds.includes(localAnime.id)) {
        await this.removerAnime(localAnime.id);
      }
    }
  }

  // Processar todos os animes do usuário
  private async processUserAnimes(
    allMalAnimes: any[], 
    onProgress?: (current: number, total: number, title?: string) => void,
    resumeIndex: number = 0,
    cancelFlag?: () => boolean
  ): Promise<void> {
    for (let i = resumeIndex; i < allMalAnimes.length; i++) {
      if (cancelFlag && cancelFlag()) {
        this.saveResumeIndex(i);
        throw new Error('Sincronização cancelada pelo usuário');
      }

      const item = allMalAnimes[i];
      const fezRequisicao = await this.processUserAnime(item);
      
      if (onProgress) {
        const animeTitle = (item.node || item).title || 'Anime desconhecido';
        onProgress(i + 1, allMalAnimes.length, animeTitle);
      }
      
      this.saveResumeIndex(i + 1);
      
      // Se fez requisição à API, aguardar 1000ms para evitar rate limiting.
      // Se apenas leu localmente, prossegue imediatamente!
      if (fezRequisicao) {
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }


  // Processar um anime individual do usuário. Retorna true se fez requisição de rede.
  private async processUserAnime(item: any): Promise<boolean> {
    const node = item.node || item;
    const animeId = node.id.toString();

    // Tenta buscar no banco de dados local primeiro
    const localAnime = await this.buscarAnimePorId(animeId);

    if (localAnime) {
      // Se já existe localmente, apenas atualiza dados mutáveis que vieram da lista do MAL
      localAnime.status = item.list_status.status as any;
      localAnime.rating = item.list_status.score;
      localAnime.currentEpisode = item.list_status.num_episodes_watched;
      localAnime.notes = item.list_status.comments;
      localAnime.episodes = node.num_episodes || localAnime.episodes || 0;
      
      await this.inserirAnime(localAnime);
      return false; // Não fez requisição de rede!
    }

    // Se é um anime novo, faz a requisição de detalhes na API do MAL
    let malDetails;
    try {
      malDetails = await malService.getAnimeDetails(node.id);
    } catch (e: any) {
      if (this.isHtmlResponseError(e)) {
        this.clearMalTokens();
        throw new Error('Sessão expirada ou bloqueada pelo MAL. Faça login novamente.');
      }
      malDetails = node;
    }

    const animeEntry = this.convertMalToLocal(malDetails);
    animeEntry.status = item.list_status.status as any;
    animeEntry.rating = item.list_status.score;
    animeEntry.currentEpisode = item.list_status.num_episodes_watched;
    animeEntry.notes = item.list_status.comments;
    animeEntry.episodes = malDetails.num_episodes || node.num_episodes || animeEntry.episodes || 0;
    
    await this.inserirAnime(animeEntry);
    return true; // Fez requisição de rede!
  }

  // Utilitários para extrair dados do MAL
  private extractCoverImage(malAnime: MalAnime): string {
    const mainPicture = (malAnime as any).main_picture;
    let coverImage = '';
    
    if (mainPicture && (mainPicture.large || mainPicture.medium)) {
      coverImage = mainPicture.large || mainPicture.medium;
    } else if (malAnime.pictures && malAnime.pictures.length > 0) {
      coverImage = malAnime.pictures[0].large || malAnime.pictures[0].medium || '';
    }
    
    // Fallback para placeholder local se não houver imagem
    if (!coverImage) {
      coverImage = '/vite.svg';
    }
    
    return coverImage;
  }

  private extractAlternativeTitles(malAnime: MalAnime): string[] {
    return [
      ...(malAnime.alternative_titles?.synonyms || []),
      ...(malAnime.alternative_titles?.en ? [malAnime.alternative_titles.en] : []),
      ...(malAnime.alternative_titles?.ja ? [malAnime.alternative_titles.ja] : []),
    ].filter((title): title is string => title !== undefined);
  }

  private extractScreenshots(malAnime: MalAnime): string[] {
    return malAnime.pictures?.map(pic => pic.large || pic.medium)
      .filter((url): url is string => Boolean(url)) || [];
  }

  // Utilitários gerais
  private parseJsonField(field: string): any[] {
    try {
      return JSON.parse(field || '[]');
    } catch {
      return [];
    }
  }

  private isHtmlResponseError(error: any): boolean {
    return error && (error.code === 'HTML_RESPONSE' || error.message === 'HTML_RESPONSE');
  }

  private clearMalTokens(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('mal_token');
      window.localStorage.removeItem('mal_refresh_token');
    }
  }

  private saveResumeIndex(index: number): void {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('syncResumeIndex', String(index));
    }
  }

  // ===== MÉTODOS LEGADOS (mantidos para compatibilidade) =====

  // Buscar detalhes do anime (método legado)
  async buscarDetalhesAnime(id: number): Promise<AnimeEntry> {
    try {
      const animeData = await malService.getAnimeDetails(id);
      return this.convertMalToLocal(animeData);
    } catch (error) {
      console.error('Erro ao buscar detalhes do anime:', error);
      throw error;
    }
  }

  // Verificar se o usuário está autenticado
  isAuthenticated(): boolean {
    return authService.isAuthenticated();
  }
}

// Exportar instância singleton
export const animeService = AnimeService.getInstance();