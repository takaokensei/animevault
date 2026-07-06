export interface MalUserProfile {
  id: number;
  name: string;
  picture: string;
  // Adicione outros campos se desejar, como 'location', 'joined_at', etc.
}

export const CREATE_ANIME_TABLE = `
CREATE TABLE IF NOT EXISTS animes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  alternativeTitles TEXT,
  synopsis TEXT,
  coverImage TEXT,
  bannerImage TEXT,
  screenshots TEXT,
  episodes INTEGER,
  currentEpisode INTEGER,
  status TEXT,
  rating REAL,
  genres TEXT,
  studios TEXT,
  year INTEGER,
  season TEXT,
  localPath TEXT,
  streamingLinks TEXT,
  lastWatched TEXT,
  dateAdded TEXT,
  notes TEXT,
  tags TEXT
);
`;

export const CREATE_USER_TABLE = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  picture TEXT,
  gender TEXT,
  birthday TEXT,
  location TEXT,
  joined_at TEXT,
  anime_statistics TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

export const CREATE_TOKENS_TABLE = `
CREATE TABLE IF NOT EXISTS auth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_in INTEGER NOT NULL,
  token_type TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
`;

export const CREATE_USER_ANIME_LIST_TABLE = `
CREATE TABLE IF NOT EXISTS user_anime_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  anime_id TEXT NOT NULL,
  status TEXT NOT NULL,
  score INTEGER,
  episodes_watched INTEGER,
  date_started TEXT,
  date_finished TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (anime_id) REFERENCES animes(id),
  UNIQUE(user_id, anime_id)
);
`;

// Índices para melhor performance
export const CREATE_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_user_anime_list_user_id ON user_anime_list(user_id);
CREATE INDEX IF NOT EXISTS idx_user_anime_list_anime_id ON user_anime_list(anime_id);
CREATE INDEX IF NOT EXISTS idx_user_anime_list_status ON user_anime_list(status);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_expires_at ON auth_tokens(expires_at);
`;

// Script completo para criar todas as tabelas
export const CREATE_ALL_TABLES = `
${CREATE_ANIME_TABLE}
${CREATE_USER_TABLE}
${CREATE_TOKENS_TABLE}
${CREATE_USER_ANIME_LIST_TABLE}
${CREATE_INDEXES}
`; 