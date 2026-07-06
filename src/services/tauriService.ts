// src/services/tauriService.ts

import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { listen as tauriListen, UnlistenFn } from '@tauri-apps/api/event';
import { open as tauriOpen } from '@tauri-apps/plugin-dialog';
import { readFile as tauriReadFile, readDir as tauriReadDir } from '@tauri-apps/plugin-fs';




export const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;

// Wrapper seguro para o invoke do Tauri
export const invoke: typeof tauriInvoke = async <T>(cmd: string, args?: any): Promise<any> => {
  if (!isTauri) {
    console.warn(`[MockTauri] invoke('${cmd}') chamado com args:`, args);
    
    // 1. Mock de abertura de link no navegador comum
    if (cmd === 'open_in_browser') {
      const url = args?.url;
      if (url) {
        console.log(`[MockTauri] Redirecionando aba atual para autorização do MAL: ${url}`);
        window.location.href = url; // Redireciona de verdade para a página de permissão do MAL
      }
      return;
    }
    
    // 2. Mocks de autenticação e perfil
    if (cmd === 'get_authenticated_user_profile' || cmd === 'get_user' || cmd === 'get_authenticated_user_profileer_profile') {
      return JSON.stringify({
        id: 999999,
        name: 'Cauã Vitor (Mock)',
        picture: 'https://github.com/github.png',
      });
    }
    
    if (cmd === 'start_auth_server') {
      console.log('[MockTauri] Servidor de autenticação local inicializado em modo simulado.');
      return;
    }

    // 3. Mocks de lista de animes e busca
    if (cmd === 'get_authenticated_anime_list') {
      return JSON.stringify({
        data: [
          {
            node: {
              id: 5114,
              title: 'Fullmetal Alchemist: Brotherhood',
              main_picture: { 
                medium: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg',
                large: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg' 
              },
              num_episodes: 64,
              synopsis: 'O alquimista Edward Elric e seu irmão Alphonse buscam a Pedra Filosofal...',
              mean: 9.1,
              genres: [{ id: 1, name: 'Action' }, { id: 2, name: 'Drama' }],
              studios: [{ id: 1, name: 'Bones' }],
              start_season: { year: 2009, season: 'spring' }
            },
            list_status: {
              status: 'completed',
              score: 10,
              num_episodes_watched: 64,
              comments: 'Melhor de todos.'
            }
          },
          {
            node: {
              id: 21,
              title: 'One Piece',
              main_picture: { 
                medium: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
                large: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg' 
              },
              num_episodes: 1100,
              synopsis: 'Luffy e sua tripulação navegam pelos oceanos em busca do lendário tesouro...',
              mean: 8.7,
              genres: [{ id: 1, name: 'Action' }, { id: 3, name: 'Adventure' }],
              studios: [{ id: 2, name: 'Toei Animation' }],
              start_season: { year: 1999, season: 'fall' }
            },
            list_status: {
              status: 'watching',
              score: 9,
              num_episodes_watched: 1085,
              comments: 'Excelente jornada.'
            }
          }
        ],
        paging: {}
      });
    }

    if (cmd === 'get_anime_details') {
      const id = args?.animeId;
      return JSON.stringify({
        id: id || 5114,
        title: id == 21 ? 'One Piece' : 'Fullmetal Alchemist: Brotherhood',
        num_episodes: id == 21 ? 1100 : 64,
        synopsis: 'Detalhes simulados pelo ambiente de desenvolvimento mock.',
        mean: 9.0,
        genres: [{ id: 1, name: 'Action' }],
        studios: [{ id: 1, name: 'Bones' }]
      });
    }

    if (cmd === 'mal_search_anime') {
      return JSON.stringify({
        data: [
          {
            node: {
              id: 5114,
              title: 'Fullmetal Alchemist: Brotherhood',
              main_picture: { medium: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg' }
            }
          }
        ],
        paging: {}
      });
    }

    if (cmd === 'add_anime_to_list' || cmd === 'mal_remove_anime_from_list') {
      return JSON.stringify({ success: true });
    }

    // 4. Mocks de sistema de arquivos e shell
    if (cmd === 'fs:readDir') {
      return [
        { name: '[Subs] FMA Brotherhood - 01.mkv', path: `${args?.path}/01.mkv` },
        { name: '[Subs] FMA Brotherhood - 02.mkv', path: `${args?.path}/02.mkv` },
        { name: '[Subs] FMA Brotherhood - 03.mkv', path: `${args?.path}/03.mkv` },
      ];
    }

    if (cmd === 'plugin:shell|open') {
      console.log(`[MockTauri] Simulação de reprodução de arquivo: ${args?.path}`);
      alert(`[MockTauri] Reproduzindo mídia: ${args?.path}`);
      return;
    }
    
    return null;
  }
  return await tauriInvoke<T>(cmd, args);
};

// Wrapper seguro para o listen do Tauri
export const listen = async <T>(event: string, handler: (event: any) => any): Promise<UnlistenFn> => {
  if (!isTauri) {
    console.warn(`[MockTauri] listen registrado no evento: '${event}'`);
    return (() => {
      console.log(`[MockTauri] unlisten disparado para '${event}'`);
    }) as any;
  }
  return await tauriListen<T>(event, handler);
};

// Wrapper seguro para o open dialog do Tauri
export const open = async (options?: any): Promise<any> => {
  if (!isTauri) {
    console.warn('[MockTauri] dialog open chamado com:', options);
    return '/mock/desktop/animes_folder';
  }
  return await tauriOpen(options);
};

// Wrapper seguro para ler arquivos binários via Tauri plugin-fs
export const readBinaryFile = async (path: string): Promise<Uint8Array> => {
  if (!isTauri) {
    console.warn(`[MockTauri] readBinaryFile chamado para: ${path}`);
    return new Uint8Array();
  }
  return await tauriReadFile(path);
};

// Wrapper seguro para listar pastas via Tauri v2 plugin-fs
export const readDir = async (path: string): Promise<any[]> => {
  if (!isTauri) {
    console.warn(`[MockTauri] readDir chamado para: ${path}`);
    return [
      { name: '[Subs] FMA Brotherhood - 01.mkv', isFile: true, isDirectory: false },
      { name: '[Subs] FMA Brotherhood - 02.mkv', isFile: true, isDirectory: false },
      { name: '[Subs] FMA Brotherhood - 03.mkv', isFile: true, isDirectory: false },
    ];
  }
  return await tauriReadDir(path);
};


