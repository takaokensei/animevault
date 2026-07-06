import { readBinaryFile } from './tauriService';
import { animeService } from './animeService';
import { AnimeEntry } from '../types/anime';

/**
 * Mapeia o status do XML do MyAnimeList para o formato compatível com o banco do app
 */
function mapXmlStatus(xmlStatus: string): 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch' {
  switch (xmlStatus.toLowerCase()) {
    case 'watching':
    case 'currently watching':
      return 'watching';
    case 'completed':
      return 'completed';
    case 'on-hold':
    case 'on_hold':
    case 'paused':
      return 'on_hold';
    case 'dropped':
      return 'dropped';
    case 'plan to watch':
    case 'plan_to_watch':
    case 'planned':
      return 'plan_to_watch';
    default:
      return 'plan_to_watch';
  }
}

/**
 * Lê, descompacta (GZIP) e processa um arquivo de exportação XML do MyAnimeList,
 * populando a biblioteca local (SQLite) instantaneamente.
 */
export async function importarListaMALXml(filePath: string): Promise<{ total: number; importados: number }> {
  // 1. Ler os bytes binários do arquivo compactado (.gz) via Tauri plugin-fs
  const bytes = await readBinaryFile(filePath);
  
  if (!bytes || bytes.length === 0) {
    throw new Error('O arquivo selecionado está vazio ou não pôde ser lido.');
  }

  let xmlText = '';

  // 2. Descompactar o GZIP de forma 100% nativa usando a API DecompressionStream do browser
  try {
    const blob = new Blob([bytes]);
    const decompressionStream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    const response = new Response(decompressionStream);
    xmlText = await response.text();
  } catch (err) {
    console.error('[ImportService] Falha ao descompactar Gzip nativamente. Tentando ler como texto puro...', err);
    // Fallback: se o arquivo já estiver descompactado por algum motivo
    const decoder = new TextDecoder('utf-8');
    xmlText = decoder.decode(bytes);
  }

  if (!xmlText || !xmlText.includes('<myanimelist>')) {
    throw new Error('Formato de arquivo inválido. Certifique-se de que é uma exportação XML válida do MyAnimeList.');
  }

  // 3. Parsear a string XML usando o DOMParser nativo do WebView
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  
  const animeNodes = xmlDoc.getElementsByTagName('anime');
  const total = animeNodes.length;
  let importados = 0;

  console.log(`[ImportService] Iniciando processamento de ${total} animes do XML...`);

  // 4. Mapear e persistir os animes no SQLite
  for (let i = 0; i < total; i++) {
    const node = animeNodes[i];
    
    try {
      const getTagValue = (tagName: string): string => {
        const el = node.getElementsByTagName(tagName)[0];
        return el ? el.textContent || '' : '';
      };

      const id = getTagValue('series_animedb_id');
      const title = getTagValue('series_title');
      
      if (!id || !title) continue;

      const episodes = parseInt(getTagValue('series_episodes')) || 0;
      const currentEpisode = parseInt(getTagValue('my_watched_episodes')) || 0;
      const rating = parseFloat(getTagValue('my_score')) || 0;
      const statusText = getTagValue('my_status');
      const comments = getTagValue('my_comments');
      const tagsText = getTagValue('my_tags');

      // Tags limpas
      const tags = tagsText 
        ? tagsText.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      // Criar a entrada local básica
      const animeEntry: AnimeEntry = {
        id,
        title,
        alternativeTitles: [],
        synopsis: 'Importado via lista XML local. Sincronize para baixar detalhes completos do MyAnimeList.',
        coverImage: '/vite.svg', // Capa inicial padrão
        screenshots: [],
        episodes,
        currentEpisode,
        status: mapXmlStatus(statusText),
        rating,
        genres: [],
        studios: [],
        year: 0,
        season: '',
        notes: comments || '',
        tags,
        lastWatched: new Date(),
        dateAdded: new Date(),
      };

      // Salvar no SQLite local
      await animeService.inserirAnime(animeEntry);
      importados++;
    } catch (e) {
      console.error(`[ImportService] Erro ao importar nó de anime no índice ${i}:`, e);
    }
  }

  console.log(`[ImportService] Concluído! Importados ${importados} de ${total} animes.`);
  return { total, importados };
}
