import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Clock, TrendingUp, Star, PlayCircle } from 'lucide-react';
import { AnimeEntry } from '../../types/anime';

interface LibraryStatsProps {
  animes: AnimeEntry[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className="relative bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 hover:border-white/20 hover:bg-white/8 transition-all duration-300 group overflow-hidden"
  >
    {/* Glow decorativo */}
    <div
      className="absolute -top-4 -right-4 w-20 h-20 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"
      style={{ background: color }}
    />

    <div className="flex items-center justify-between">
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: `${color}20`, border: `1px solid ${color}30` }}
      >
        {icon}
      </div>
      <span className="text-2xl font-bold text-white tabular-nums">{value}</span>
    </div>

    <span className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</span>
  </motion.div>
);

export const LibraryStats: React.FC<LibraryStatsProps> = ({ animes }) => {
  const total = animes.length;
  const watching = animes.filter(a => a.status === 'watching').length;
  const completed = animes.filter(a => a.status === 'completed').length;
  const onHold = animes.filter(a => a.status === 'on_hold').length;
  const planned = animes.filter(a => a.status === 'plan_to_watch' || a.status === 'planned').length;

  // Nota média somente dos animes com nota > 0
  const ratedAnimes = animes.filter(a => (a.rating ?? 0) > 0);
  const avgRating = ratedAnimes.length > 0
    ? (ratedAnimes.reduce((sum, a) => sum + (a.rating ?? 0), 0) / ratedAnimes.length).toFixed(1)
    : '—';


  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <StatCard
        icon={<BookOpen className="w-5 h-5" style={{ color: '#818cf8' }} />}
        label="Total"
        value={total}
        color="#818cf8"
        delay={0}
      />
      <StatCard
        icon={<PlayCircle className="w-5 h-5" style={{ color: '#34d399' }} />}
        label="Assistindo"
        value={watching}
        color="#34d399"
        delay={0.05}
      />
      <StatCard
        icon={<CheckCircle className="w-5 h-5" style={{ color: '#60a5fa' }} />}
        label="Completos"
        value={completed}
        color="#60a5fa"
        delay={0.1}
      />
      <StatCard
        icon={<Clock className="w-5 h-5" style={{ color: '#fbbf24' }} />}
        label="Pausados"
        value={onHold}
        color="#fbbf24"
        delay={0.15}
      />
      <StatCard
        icon={<TrendingUp className="w-5 h-5" style={{ color: '#a78bfa' }} />}
        label="Planejo Ver"
        value={planned}
        color="#a78bfa"
        delay={0.2}
      />
      <StatCard
        icon={<Star className="w-5 h-5" style={{ color: '#f472b6' }} />}
        label="Nota Média"
        value={avgRating}
        color="#f472b6"
        delay={0.25}
      />
    </div>
  );
};
