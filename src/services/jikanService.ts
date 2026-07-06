/**
 * jikanService.ts
 *
 * Wrapper sobre a Jikan API (https://api.jikan.moe/v4) como fallback
 * quando o MyAnimeList oficial está fora do ar ou rate-limitado.
 *
 * Não requer autenticação — é completamente open-source.
 */

const JIKAN_BASE = 'https://api.jikan.moe/v4';

// Retry com backoff exponencial para lidar com rate-limit da Jikan (3 req/s)
async function jikanFetch<T>(path: string, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${JIKAN_BASE}${path}`);

      if (res.status === 429) {
        // Rate-limited — espera 1s e tenta novamente
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Jikan API Error: ${res.status} ${res.statusText}`);
      }

      return res.json() as Promise<T>;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  throw new Error('Jikan API: todas as tentativas falharam');
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  images: {
    jpg: { image_url: string; large_image_url?: string };
  };
  synopsis?: string;
  score?: number;
  rank?: number;
  popularity?: number;
  episodes?: number;
  status?: string;
  genres?: Array<{ name: string }>;
  studios?: Array<{ name: string }>;
  source?: string;
  duration?: string;
  aired?: { from?: string };
}

interface JikanSearchResponse {
  data: JikanAnime[];
  pagination: { has_next_page: boolean; last_visible_page: number };
}

interface JikanDetailResponse {
  data: JikanAnime;
}

/**
 * Busca animes na Jikan API por query textual.
 * Retorna até `limit` resultados.
 */
export async function jikanSearchAnime(query: string, limit = 20): Promise<JikanAnime[]> {
  const page = 1;
  const res = await jikanFetch<JikanSearchResponse>(
    `/anime?q=${encodeURIComponent(query)}&limit=${limit}&page=${page}&sfw=false`
  );
  return res.data;
}

/**
 * Busca os detalhes completos de um anime pelo ID MAL.
 */
export async function jikanGetAnimeDetails(malId: number): Promise<JikanAnime> {
  const res = await jikanFetch<JikanDetailResponse>(`/anime/${malId}/full`);
  return res.data;
}

/**
 * Busca animes mais populares (usados quando MAL offline).
 */
export async function jikanGetTopAnime(limit = 20): Promise<JikanAnime[]> {
  const res = await jikanFetch<JikanSearchResponse>(`/top/anime?limit=${limit}&filter=bypopularity`);
  return res.data;
}

/**
 * Converte um JikanAnime para o formato MalAnime parcial esperado
 * pelo animeService, para compatibilidade transparente.
 */
export function jikanToMalAnime(j: JikanAnime) {
  return {
    id: j.mal_id,
    title: j.title_english || j.title,
    main_picture: {
      large: j.images.jpg.large_image_url || j.images.jpg.image_url,
      medium: j.images.jpg.image_url,
    },
    synopsis: j.synopsis,
    mean: j.score,
    rank: j.rank,
    popularity: j.popularity,
    num_episodes: j.episodes,
    status: j.status,
    genres: j.genres?.map(g => ({ id: 0, name: g.name })),
    studios: j.studios?.map(s => ({ id: 0, name: s.name })),
    source: j.source,
    start_season: j.aired?.from
      ? { year: new Date(j.aired.from).getFullYear() }
      : undefined,
  };
}
