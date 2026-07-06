import React from 'react';
import { motion } from 'framer-motion';
import { AnimeEntry } from '../../types/anime';

interface GenreChartProps {
  animes: AnimeEntry[];
}

const GENRE_COLORS: Record<string, string> = {
  Action: '#f87171',
  Adventure: '#fb923c',
  Comedy: '#fbbf24',
  Drama: '#a78bfa',
  Fantasy: '#818cf8',
  Horror: '#ef4444',
  Mystery: '#6366f1',
  Romance: '#f472b6',
  'Sci-Fi': '#38bdf8',
  'Slice of Life': '#34d399',
  Sports: '#4ade80',
  Thriller: '#f43f5e',
  Supernatural: '#c084fc',
  Psychological: '#e879f9',
};

const getColor = (genre: string, idx: number): string => {
  if (GENRE_COLORS[genre]) return GENRE_COLORS[genre];
  const fallbacks = ['#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa', '#38bdf8'];
  return fallbacks[idx % fallbacks.length];
};

export const GenreChart: React.FC<GenreChartProps> = ({ animes }) => {
  // Contagem de gêneros
  const genreCounts: Record<string, number> = {};
  animes.forEach(anime => {
    anime.genres?.forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });

  const sorted = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (sorted.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-white/30 text-sm">Nenhum gênero disponível ainda</p>
      </div>
    );
  }

  const maxVal = sorted[0][1];

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
      <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
        <span>🎭</span> Gêneros Favoritos
      </h3>

      <div className="space-y-3">
        {sorted.map(([genre, count], idx) => {
          const pct = (count / maxVal) * 100;
          const color = getColor(genre, idx);

          return (
            <div key={genre} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/70 font-medium">{genre}</span>
                <span className="text-xs text-white/40 tabular-nums">{count}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.7, delay: idx * 0.07, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
