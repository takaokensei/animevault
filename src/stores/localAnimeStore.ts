import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnimeFolder {
  animeId: number;
  folderPath: string;
  watchedEpisodes: number[];
}

interface LocalAnimeState {
  folders: AnimeFolder[];
  addFolder: (animeId: number, folderPath: string) => void;
  removeFolder: (animeId: number) => void;
  addWatchedEpisode: (animeId: number, episodeNumber: number) => void;
  removeWatchedEpisode: (animeId: number, episodeNumber: number) => void;
  isEpisodeWatched: (animeId: number, episodeNumber: number) => boolean;
  getFolder: (animeId: number) => AnimeFolder | undefined;
}

export const useLocalAnimeStore = create<LocalAnimeState>()(
  persist(
    (set, get) => ({
      folders: [],

      addFolder: (animeId: number, folderPath: string) => {
        set(state => ({
          folders: [
            ...state.folders.filter(f => f.animeId !== animeId),
            { animeId, folderPath, watchedEpisodes: [] }
          ]
        }));
      },

      removeFolder: (animeId: number) => {
        set(state => ({
          folders: state.folders.filter(f => f.animeId !== animeId)
        }));
      },

      addWatchedEpisode: (animeId: number, episodeNumber: number) => {
        set(state => ({
          folders: state.folders.map(folder => {
            if (folder.animeId === animeId) {
              return {
                ...folder,
                watchedEpisodes: [...new Set([...folder.watchedEpisodes, episodeNumber])]
              };
            }
            return folder;
          })
        }));
      },

      removeWatchedEpisode: (animeId: number, episodeNumber: number) => {
        set(state => ({
          folders: state.folders.map(folder => {
            if (folder.animeId === animeId) {
              return {
                ...folder,
                watchedEpisodes: folder.watchedEpisodes.filter(ep => ep !== episodeNumber)
              };
            }
            return folder;
          })
        }));
      },

      isEpisodeWatched: (animeId: number, episodeNumber: number) => {
        const folder = get().folders.find(f => f.animeId === animeId);
        return folder?.watchedEpisodes.includes(episodeNumber) || false;
      },

      getFolder: (animeId: number) => {
        return get().folders.find(f => f.animeId === animeId);
      }
    }),
    {
      name: 'local-anime-storage'
    }
  )
);
