import React from 'react';
import AnimeCard from '../anime/AnimeCard';
import { AnimeEntry } from '../../types/anime';
import { motion, AnimatePresence } from 'framer-motion';

interface LibraryGridProps {
  displayAnimes: AnimeEntry[];
  filteredAnimes: AnimeEntry[];
  loading: boolean;
  onCardClick: (animeId: string | number) => void;
  visibleCount: number;
}

const LoadingSkeleton = () => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-surface)', height: '340px' }}>
        <div className="h-52 shimmer" />
        <div className="p-4 space-y-3">
          <div className="h-4 rounded-lg shimmer w-3/4" />
          <div className="h-3 rounded-lg shimmer w-1/2" />
          <div className="h-3 rounded-lg shimmer w-2/3" />
        </div>
      </div>
    ))}
  </div>
);

export const LibraryGrid: React.FC<LibraryGridProps> = ({
  displayAnimes,
  filteredAnimes,
  loading,
  onCardClick,
  visibleCount
}) => {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (filteredAnimes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl bg-white/5 border border-white/10"
          style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          🔍
        </div>
        <div className="text-center">
          <h3 className="text-xl font-semibold text-white mb-2">
            Nenhum resultado encontrado
          </h3>
          <p style={{ color: 'var(--text-secondary)' }} className="text-sm max-w-xs text-white/50">
            Nenhum anime encontrado com os filtros aplicados. Tente ajustar os termos de busca ou filtros.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
        <AnimatePresence>
          {displayAnimes.map((anime) => (
            <motion.div
              layout
              key={anime.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              <AnimeCard
                anime={anime}
                onImageError={(e) => console.error('Erro ao carregar imagem:', anime.coverImage, e)}
                onCardClick={onCardClick}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
      
      {/* Sentinela de IntersectionObserver para carregar mais animes no scroll */}
      {visibleCount < filteredAnimes.length && (
        <div id="infinite-scroll-trigger" className="h-10 w-full flex items-center justify-center py-10">
          <div className="w-8 h-8 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
        </div>
      )}
    </>
  );
};
