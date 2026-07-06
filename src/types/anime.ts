export interface AnimeLocalFiles {
  folderPath: string | null;
  files: Array<{
    name: string;
    path: string;
  }>;
  watchedEpisodes: number[];
}

export interface AnimeEntry {
  id: string;
  title: string;
  alternativeTitles: string[];
  synopsis: string;
  coverImage: string;
  bannerImage?: string;
  screenshots: string[];
  episodes: number;
  currentEpisode: number;
  status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch' | 'paused' | 'planned';
  rating: number;
  genres: string[];
  studios: string[];
  year: number;
  season: string;
  localPath?: string;
  streamingLinks?: any[];
  lastWatched?: string | Date;
  dateAdded?: string | Date;
  notes?: string;
  tags?: string[];
  
  // Metadados adicionais da API do MyAnimeList (opcionais)
  score?: number;
  popularity?: number;
  source?: string;
  duration?: string;
  media_type?: string;
  user_score?: number;
  average_episode_duration?: string;
  related_anime?: {
    node: {
      id: number;
      title: string;
      main_picture?: {
        medium?: string;
        large?: string;
      };
    };
    relation_type: string;
    relation_type_formatted?: string;
  }[];
}

export type Anime = AnimeEntry;

