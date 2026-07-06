import React from 'react';
import { AnimeEntry } from '../../core/types';
import { BarChart2, Calendar, Clock, Film, Award, Hash, Star } from 'lucide-react';

interface AnimeMetadataPanelProps {
  anime: AnimeEntry;
}

const formatScore = (score: number | undefined) => {
  if (score === undefined || score === null) return 'N/A';
  return score.toFixed(2);
};

const formatNumber = (num: number | undefined) => {
  if (num === undefined || num === null) return 'N/A';
  return new Intl.NumberFormat('en-US', { notation: 'compact', compactDisplay: 'short' }).format(num);
};

export const AnimeMetadataPanel: React.FC<AnimeMetadataPanelProps> = ({ anime }) => {
  const metadataItems = [
    {
      label: 'Avaliação',
      value: formatScore(anime.score || anime.rating),
      icon: Star,
      color: 'text-amber-400 bg-amber-400/10 border-amber-400/20'
    },
    {
      label: 'Popularidade',
      value: anime.popularity ? `#${formatNumber(anime.popularity)}` : 'N/A',
      icon: Award,
      color: 'text-violet-400 bg-violet-400/10 border-violet-400/20'
    },
    {
      label: 'Episódios',
      value: anime.episodes ? String(anime.episodes) : 'N/A',
      icon: Hash,
      color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    },
    {
      label: 'Duração',
      value: anime.duration || 'N/A',
      icon: Clock,
      color: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    },
    {
      label: 'Origem',
      value: anime.source || 'N/A',
      icon: Film,
      color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20'
    },
    {
      label: 'Ano / Season',
      value: anime.year ? `${anime.season || ''} ${anime.year}` : 'N/A',
      icon: Calendar,
      color: 'text-pink-400 bg-pink-400/10 border-pink-400/20'
    }
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
          <BarChart2 className="w-4 h-4 text-violet-400" />
        </div>
        <h3 className="text-lg font-bold text-white tracking-tight">Informações e Estatísticas</h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {metadataItems.map((item, idx) => (
          <div key={idx} className="bg-white/2 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:border-white/10 transition-colors">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">{item.label}</span>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center border ${item.color}`}>
                <item.icon className="w-4 h-4" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {anime.studios && anime.studios.length > 0 && (
        <div className="border-t border-white/5 pt-4">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/45">Estúdios</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {anime.studios.map((studio, idx) => (
              <span 
                key={idx} 
                className="px-3 py-1 bg-white/5 border border-white/10 text-white/80 rounded-xl text-xs font-semibold hover:border-violet-500/30 hover:text-white transition-colors cursor-default"
              >
                {studio}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
