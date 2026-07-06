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

// Skeleton individual com shimmer CSS — altura fixa igual ao AnimeCard
const SkeletonCard = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.4, delay }}
    className="rounded-2xl overflow-hidden border border-white/5"
    style={{ background: 'rgba(255,255,255,0.03)', height: '320px' }}
  >
    {/* Capa */}
    <div className="h-48 w-full shimmer relative overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          animation: 'shimmer 1.8s infinite',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
    {/* Info */}
    <div className="p-4 space-y-3">
      {/* Badge de status */}
      <div className="h-4 rounded-full shimmer w-20" />
      {/* Título */}
      <div className="h-4 rounded-lg shimmer w-4/5" />
      <div className="h-3 rounded-lg shimmer w-3/5" />
      {/* Progress bar */}
      <div className="h-1.5 rounded-full shimmer w-full mt-2" />
    </div>
  </motion.div>
);

const LoadingSkeleton = () => (
  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
    {Array.from({ length: 12 }).map((_, i) => (
      <SkeletonCard key={i} delay={i * 0.03} />
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
  return (
    <AnimatePresence mode="wait">
      {loading ? (
        // Skeleton com fade-in — key "loading" dispara a transição ao desmontar
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          <LoadingSkeleton />
        </motion.div>
      ) : filteredAnimes.length === 0 ? (
        // Empty state
        <motion.div
          key="empty"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-24 gap-6"
        >
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
            style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
          >
            🔍
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-white mb-2">
              Nenhum resultado encontrado
            </h3>
            <p className="text-sm text-white/50 max-w-xs">
              Nenhum anime encontrado com os filtros aplicados. Tente ajustar os termos de busca ou filtros.
            </p>
          </div>
        </motion.div>
      ) : (
        // Grid principal — fade-in após skeleton sair
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
            <AnimatePresence>
              {displayAnimes.map((anime, idx) => (
                <motion.div
                  layout
                  key={anime.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: Math.min(idx * 0.025, 0.5) }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};
