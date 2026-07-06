import React, { useState } from 'react';
import { AnimeEntry } from '../../types/anime';


interface AnimeCardProps {
  anime: AnimeEntry | any;
  onAddToList?: (animeId: number, status: string) => Promise<void>;
  showAddButton?: boolean;
  onImageError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  onCardClick?: (animeId: string | number) => void;
}

// Ícones SVG
const PlayIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
);

const LoadingSpinner = () => (
  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const AnimeCard: React.FC<AnimeCardProps> = ({ 
  anime, 
  onAddToList, 
  showAddButton = false, 
  onImageError,
  onCardClick 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleAddToList = async (status: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAddToList) return;
    
    setIsAdding(true);
    try {
      await onAddToList(parseInt(anime.id), status);
    } catch (error) {
      console.error('Erro ao adicionar à lista:', error);
    } finally {
      setIsAdding(false);
      setShowStatusMenu(false);
    }
  };

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick(anime.id);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowStatusMenu(!showStatusMenu);
  };

  // Status options com mapeamento correto para todos os status possíveis
  const statusOptions = [
    { 
      value: 'watching', 
      label: 'Assistindo', 
      icon: PlayIcon,
      bgClass: 'bg-emerald-500/25',
      borderClass: 'border-emerald-400/60',
      textClass: 'text-emerald-200',
      badgeBg: 'bg-emerald-500'
    },
    { 
      value: 'completed', 
      label: 'Completo', 
      icon: CheckIcon,
      bgClass: 'bg-green-500/25',
      borderClass: 'border-green-400/60',
      textClass: 'text-green-200',
      badgeBg: 'bg-green-500'
    },
    { 
      value: 'plan_to_watch', 
      label: 'Planejado', 
      icon: CalendarIcon,
      bgClass: 'bg-amber-500/25',
      borderClass: 'border-amber-400/60',
      textClass: 'text-amber-200',
      badgeBg: 'bg-amber-500'
    },
    { 
      value: 'planned', 
      label: 'Planejado', 
      icon: CalendarIcon,
      bgClass: 'bg-amber-500/25',
      borderClass: 'border-amber-400/60',
      textClass: 'text-amber-200',
      badgeBg: 'bg-amber-500'
    },
    { 
      value: 'dropped', 
      label: 'Abandonado', 
      icon: XIcon,
      bgClass: 'bg-red-500/25',
      borderClass: 'border-red-400/60',
      textClass: 'text-red-200',
      badgeBg: 'bg-red-500'
    },
    { 
      value: 'on_hold', 
      label: 'Pausado', 
      icon: PauseIcon,
      bgClass: 'bg-slate-500/25',
      borderClass: 'border-slate-400/60',
      textClass: 'text-slate-200',
      badgeBg: 'bg-slate-500'
    },
    { 
      value: 'paused', 
      label: 'Pausado', 
      icon: PauseIcon,
      bgClass: 'bg-slate-500/25',
      borderClass: 'border-slate-400/60',
      textClass: 'text-slate-200',
      badgeBg: 'bg-slate-500'
    },
  ];

  const getStatusConfig = (status: string) => {
    return statusOptions.find(option => option.value === status);
  };

  const formatScore = (score: number) => {
    if (!score) return null;
    return score.toFixed(1);
  };

  // Obter status atual do anime
  const currentStatus = anime.status || anime.list_status?.status;
  const statusConfig = currentStatus ? getStatusConfig(currentStatus) : null;

  return (
    <div 
      className="relative rounded-2xl overflow-hidden shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-[var(--accent-violet)]/40 hover:shadow-[var(--accent-violet)]/10 duration-300 flex flex-col h-[500px] w-full max-w-xs cursor-pointer group"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      onClick={handleCardClick}
    >
      {/* Overlay de hover com gradiente */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none" />
      
      {/* Container da imagem com altura fixa */}
      <div className="relative h-52 overflow-hidden flex-shrink-0" style={{ background: 'var(--bg-secondary)' }}>
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse flex items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
            <div className="w-16 h-16 rounded-full animate-pulse" style={{ background: 'var(--bg-surface)' }} />
          </div>
        )}
        <img
          src={anime.coverImage || anime.bannerImage || anime.screenshots?.[0] || '/placeholder.png'}
          alt={anime.title}
          className={`w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={onImageError}
        />
        
        {/* Gradiente sobre a imagem */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>
      
      {/* Container principal do conteúdo com altura fixa calculada */}
      <div className="p-4 flex-1 flex flex-col relative z-20 min-h-0" style={{ height: '248px' }}>
        {/* Conteúdo principal - scrollável se necessário */}
        <div className="flex-1 space-y-3 overflow-hidden">
          <div className="flex justify-between items-start gap-3">
            <h2 className="text-base font-semibold line-clamp-2 flex-1 leading-tight" style={{ color: 'var(--text-primary)' }}>
              {anime.title}
            </h2>
            
            {/* Score com design melhorado */}
            {anime.score && (
              <div className="flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-2 py-1.5 border flex-shrink-0" style={{ background: 'var(--accent-violet)/20', borderColor: 'var(--accent-violet)/30' }}>
                <StarIcon />
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{formatScore(anime.score)}</span>
              </div>
            )}
          </div>
          
          {/* Informações básicas com espaçamento otimizado */}
          <div className="flex items-center gap-2 text-xs flex-wrap">
            {typeof anime.currentEpisode === 'number' && typeof anime.episodes === 'number' && (
              <span className="px-2 py-1 rounded-lg font-medium border" style={{ color: 'var(--text-primary)', background: 'var(--bg-elevated)', borderColor: 'var(--border-medium)' }}>
                {anime.currentEpisode}/{anime.episodes} eps
              </span>
            )}
            {anime.year && (
              <span className="font-semibold px-2 py-1 rounded-lg border" style={{ color: 'var(--accent-violet)', background: 'var(--accent-violet)/15', borderColor: 'var(--accent-violet)/30' }}>
                {anime.year}
              </span>
            )}
            {anime.type && (
              <span className="uppercase font-semibold text-[10px] px-2 py-1 rounded-lg border" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                {anime.type}
              </span>
            )}
          </div>
          
          {/* Gêneros com design mais compacto */}
          {anime.genres && anime.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {anime.genres.slice(0, 3).map((genre: string) => (
                <span 
                  key={genre} 
                  className="text-xs px-2.5 py-0.5 rounded-full border font-medium"
                  style={{ background: 'var(--accent-violet)/10', borderColor: 'var(--accent-violet)/20', color: 'var(--text-primary)' }}
                >
                  {genre}
                </span>
              ))}
              {anime.genres.length > 3 && (
                <span className="text-xs px-2 py-0.5 rounded-full border font-medium" style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', borderColor: 'var(--border-subtle)' }}>
                  +{anime.genres.length - 3}
                </span>
              )}
            </div>
          )}
          
          {/* Synopsis */}
          {anime.synopsis && (
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {anime.synopsis}
            </p>
          )}
        </div>
 
        {/* Indicador de clique com posição fixa no final */}
        <div className="h-8 flex items-center justify-center mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 flex-shrink-0">
          <span className="text-xs px-3 py-1.5 rounded-lg border backdrop-blur-sm font-medium" style={{ color: 'var(--text-primary)', background: 'var(--accent-violet)/20', borderColor: 'var(--accent-violet)/30' }}>
            Clique para ver detalhes
          </span>
        </div>
      </div>


      {/* Botão de adicionar à lista com design coeso */}
      {showAddButton && onAddToList && (
        <div className="absolute top-4 right-4 z-30">
          <div className="relative">
            <button
              onClick={handleMenuToggle}
              disabled={isAdding}
              className="bg-[#8B5CF6]/90 hover:bg-[#8B5CF6] backdrop-blur-sm text-white p-3 rounded-xl shadow-lg transition-all duration-200 border border-[#8B5CF6]/40 disabled:opacity-50 hover:scale-110 hover:shadow-[#8B5CF6]/30"
            >
              {isAdding ? <LoadingSpinner /> : <PlusIcon />}
            </button>

            {/* Menu de status com design melhorado */}
            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-3 w-56 bg-[#161B22]/95 backdrop-blur-md rounded-2xl shadow-2xl z-50 border border-[#30363D] overflow-hidden">
                <div className="py-2">
                  {statusOptions.slice(0, 5).map((option) => { // Removendo duplicatas
                    const IconComponent = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={(e) => handleAddToList(option.value, e)}
                        disabled={isAdding}
                        className="w-full text-left px-4 py-3 text-sm text-[#E6EDF3] hover:bg-[#21262D] disabled:opacity-50 flex items-center gap-3 transition-colors duration-200 font-medium"
                      >
                        <div className={`p-2 rounded-xl ${option.bgClass} ${option.borderClass} ${option.textClass} border backdrop-blur-sm`}>
                          <IconComponent />
                        </div>
                        <span className="text-[#F0F6FC] font-medium">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status atual com melhor visibilidade e contraste */}
      {statusConfig && currentStatus && (
        <div className="absolute top-4 left-4 z-20">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl backdrop-blur-md border shadow-lg ${statusConfig.bgClass} ${statusConfig.borderClass}`}>
            <div className={statusConfig.textClass}>
              <statusConfig.icon />
            </div>
            <span className={`text-sm font-semibold ${statusConfig.textClass} drop-shadow-sm`}>
              {statusConfig.label}
            </span>
          </div>
        </div>
      )}

      {/* Borda brilhante no hover */}
      <div className="absolute inset-0 pointer-events-none rounded-2xl border border-transparent group-hover:border-[#8B5CF6]/50 transition-colors duration-300" />
      
      {/* Efeito de brilho roxo sutil */}
      <div 
        className="absolute inset-0 pointer-events-none rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
        style={{
          boxShadow: '0 8px 32px 0 rgba(139, 92, 246, 0.2), 0 0 0 1px rgba(139, 92, 246, 0.1) inset'
        }} 
      />
    </div>
  );
};

export default AnimeCard;