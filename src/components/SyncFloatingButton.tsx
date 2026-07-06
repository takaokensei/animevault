import React from 'react';
import { useSyncFloatingStore } from '../stores/syncFloatingStore';
import { useAutoScrollStore } from '../stores/autoScrollStore';
import { motion, AnimatePresence, Variants } from 'framer-motion';

// Ícone do olho para o botão "Seguir"
const EyeIcon = ({ off, ...props }: { off?: boolean } & React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" {...props}>
    {off ? (
      <path d="M222.1,106.33a8,8,0,0,1,0,11.31l-32,32a8,8,0,0,1-11.31-11.31l32-32a8,8,0,0,1,11.31,0ZM128,56C48,56,16,128,16,128s32,72,112,72,112-72,112-72c-11.7-22.31-29.9-42.2-50.22-54.89l22.36-22.35a8,8,0,0,0-11.32-11.32L162,66.1a122.32,122.32,0,0,0-68.06,0L67.14,39.29a8,8,0,0,0-11.32,11.32l22.36,22.35C58.1,83.8,40.3,102.71,30.12,120H16a8,8,0,0,0,0,16H53.58a110.14,110.14,0,0,0,45,39.36l-20.8,20.8a8,8,0,0,0,11.32,11.32l26.8-26.8a113.33,113.33,0,0,0,23.8,0l26.8,26.8a8,8,0,0,0,11.32-11.32l-20.8-20.8a110.14,110.14,0,0,0,45-39.36H240a8,8,0,0,0,0-16h-14.12C215.7,102.71,197.9,83.8,178.5,75.94Z"></path>
    ) : (
      <path d="M247.31,124.76c-.35-.79-8.42-18.58-27.6-38.4C191.13,58.5,162.33,40,128,40S64.87,58.5,36.29,86.36C17.11,106.18,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.42,18.58,27.6,38.4C64.87,197.5,93.67,216,128,216s63.13-18.5,91.71-46.36c19.18-19.82,27.25-37.61,27.6-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-74.88,0-103.82-58.85-104-60.65a2.13,2.13,0,0,1,0-2.7C24.18,126.85,53.12,68,128,68s103.82,58.85,104,60.65a2.13,2.13,0,0,1,0,2.7C231.82,133.15,202.88,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"></path>
    )}
  </svg>
);

// Ícone de raio (substitui ⚡)
const BoltIcon = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="inline"
    {...props}
  >
    <path d="M13 3L4 14h5v7l9-11h-5V3z" />
    <defs>
      <linearGradient id="bolt-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#3b82f6" />
      </linearGradient>
    </defs>
    <style>
      {`
        path { fill: url(#bolt-gradient); }
      `}
    </style>
  </svg>
);

// Ícone de cronômetro (substitui ⏱️)
const ClockIcon = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="inline"
    {...props}
  >
    <path d="M15 1H9v2h6V1zm-4 13h2V8h-2v6zm8.03-6.61l1.42-1.42c-.43-.51-.9-.99-1.41-1.41l-1.42 1.42A8.962 8.962 0 0012 4c-4.97 0-9 4.03-9 9s4.02 9 9 9a8.994 8.994 0 007.03-14.61zM12 20c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
    <defs>
      <linearGradient id="clock-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#93c5fd" />
        <stop offset="100%" stopColor="#60a5fa" />
      </linearGradient>
    </defs>
    <style>
      {`
        path { fill: url(#clock-gradient); }
      `}
    </style>
  </svg>
);

// Ícone de TV/Monitor (substitui 📺)
const TvIcon = ({ ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className="inline"
    {...props}
  >
    <path d="M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5l-1 1v1h8v-1l-1-1h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 12H3V5h18v10z"/>
    <defs>
      <linearGradient id="tv-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="100%" stopColor="#64748b" />
      </linearGradient>
    </defs>
    <style>
      {`
        path { fill: url(#tv-gradient); }
      `}
    </style>
  </svg>
);

export const SyncFloatingButton: React.FC = () => {
  const {
    syncProgress,
    syncLoading,
    minimized,
    isPaused,
    position,
    setMinimized,
    setPosition,
    pauseSync,
    resumeSync,
    cancelSync,
  } = useSyncFloatingStore();
  
  const { autoScroll, setAutoScroll, setUserScrolledUp } = useAutoScrollStore();

  const [timeEstimate, setTimeEstimate] = React.useState<string>('');
  const [syncSpeed, setSyncSpeed] = React.useState<number>(0);
  const lastProgressRef = React.useRef<{ current: number; timestamp: number } | null>(null);

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}min`;
  };

  React.useEffect(() => {
    if (!syncProgress || isPaused) {
      setTimeEstimate('');
      setSyncSpeed(0);
      return;
    }
    const now = Date.now();
    if (lastProgressRef.current) {
      const timeDiff = (now - lastProgressRef.current.timestamp) / 1000;
      const progressDiff = syncProgress.current - lastProgressRef.current.current;
      if (timeDiff > 0 && progressDiff > 0) {
        const currentSpeed = progressDiff / timeDiff;
        setSyncSpeed(currentSpeed);
        const remaining = syncProgress.total - syncProgress.current;
        const estimatedSeconds = remaining / currentSpeed;
        if (estimatedSeconds > 0 && estimatedSeconds < 86400) {
          setTimeEstimate(formatTime(estimatedSeconds));
        } else {
          setTimeEstimate('');
        }
      }
    }
    lastProgressRef.current = {
      current: syncProgress.current,
      timestamp: now
    };
  }, [syncProgress?.current, isPaused]);

  const [dragging, setDragging] = React.useState(false);
  const dragStartPos = React.useRef({ x: 0, y: 0 });

  const dragStart = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isButton = target.closest('button') || target.closest('[role="button"]');
    if (isButton) {
      console.log('[SyncFloatingButton] Clique em botão detectado, não iniciando drag');
      return;
    }
    e.preventDefault();
    setDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const dragMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    setPosition({ x: position.x + deltaX, y: position.y + deltaY });
    dragStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const dragEnd = (e: React.PointerEvent) => {
    if (!dragging) return;
    e.preventDefault();
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
  };

  React.useEffect(() => {
    const handleGlobalPointerUp = () => { if (dragging) setDragging(false); };
    const handleGlobalPointerCancel = () => { if (dragging) setDragging(false); };
    if (dragging) {
      document.addEventListener('pointerup', handleGlobalPointerUp);
      document.addEventListener('pointercancel', handleGlobalPointerCancel);
      document.addEventListener('contextmenu', handleGlobalPointerCancel);
    }
    return () => {
      document.removeEventListener('pointerup', handleGlobalPointerUp);
      document.removeEventListener('pointercancel', handleGlobalPointerCancel);
      document.removeEventListener('contextmenu', handleGlobalPointerCancel);
    };
  }, [dragging]);

  const progressPercent = syncProgress && syncProgress.total > 0
    ? Math.round((syncProgress.current / syncProgress.total) * 100)
    : 0;

  if (!syncLoading && !syncProgress && !isPaused) return null;

  const handlePauseResume = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (isPaused) resumeSync(); else pauseSync(); };
  const handleMinimize = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setMinimized(true); };
  const handleRestore = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setMinimized(false); };
  const handleCancel = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); cancelSync(); };
  const handleToggleAutoScroll = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setAutoScroll(!autoScroll); setUserScrolledUp(false); };

  // Definições para a animação profissional
  const buttonContainerVariants: Variants = {
    hidden: { opacity: 0, height: 0, transition: { duration: 0.25, ease: "easeInOut" } },
    visible: { opacity: 1, height: 'auto', transition: { duration: 0.25, ease: "easeInOut" } },
  };

  const textVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 },
  };

  return (
    <div
      className="fixed z-50 bottom-6 right-6 flex flex-col items-end"
      onPointerDown={dragStart}
      onPointerMove={dragMove}
      onPointerUp={dragEnd}
      onPointerCancel={dragEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        cursor: dragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
    >
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-2xl blur-xl transition-all duration-500 ${minimized ? 'w-16 h-16 scale-110' : 'w-80 h-20 scale-105'}`}
        style={{ zIndex: -1, filter: 'blur(20px)', opacity: dragging ? 0.8 : 0.4 }}
      />
      
      <div
        className={`relative bg-gradient-to-br from-slate-800/95 to-slate-900/95 shadow-2xl border border-blue-500/40 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-blue-500/20 hover:border-blue-400/50 ${
          minimized ? 'w-16 h-16 p-2 justify-center' : 'w-80 p-4'
        } flex items-center gap-4 ${dragging ? 'scale-105 shadow-blue-500/30' : ''}`}
        style={{ 
          minHeight: minimized ? 64 : 80,
          boxShadow: dragging 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.2)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl pointer-events-none" />
        <div className="absolute inset-0 rounded-2xl opacity-30 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/40 via-transparent to-blue-400/40 rounded-2xl animate-pulse" />
        </div>
        
        {minimized ? (
          <button
            className="relative w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-blue-500/40 group z-10"
            title="Restaurar sincronização"
            onClick={handleRestore}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Restaurar sincronização"
            style={{ pointerEvents: 'auto' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/50 to-blue-600/50 rounded-full blur-md scale-110 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            {!isPaused && (
              <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-spin">
                <div className="absolute top-0 left-1/2 w-1 h-1 bg-blue-400 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
            <div className="relative z-10">
              {isPaused ? (
                <svg className="w-6 h-6 filter drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 8V6a2 2 0 012-2h8a2 2 0 012 2v16l-5-3-5 3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 animate-spin filter drop-shadow-sm" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
            </div>
          </button>
        ) : (
          <>
           <div className="flex-1 relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-lg shadow-blue-400/50" />
                    <div className="absolute inset-0 w-2 h-2 bg-blue-400 rounded-full animate-ping opacity-30" />
                  </div>
                  <span className="text-blue-300 font-semibold text-sm bg-gradient-to-r from-blue-300 to-blue-400 bg-clip-text text-transparent">
                    {isPaused ? 'Sincronização pausada' : 'Sincronizando biblioteca'}
                  </span>
                </div>
                <button
                  className="ml-auto p-1.5 text-gray-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all duration-200 hover:scale-105 z-10"
                  title="Minimizar"
                  onClick={handleMinimize}
                  onPointerDown={(e) => e.stopPropagation()}
                  aria-label="Minimizar"
                  style={{ pointerEvents: 'auto' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
              </div>
              
              <div className="text-xs text-slate-300 mb-3 space-y-1">
                {syncProgress ? (
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {syncProgress.current.toLocaleString()} de {syncProgress.total.toLocaleString()} animes
                    </span>
                    <span className="text-blue-400 font-bold text-sm bg-slate-700/30 px-2 py-0.5 rounded-full">
                      {progressPercent}%
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <span className="ml-2">Preparando sincronização...</span>
                  </div>
                )}
                
                {syncProgress && !isPaused && syncSpeed > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <BoltIcon className="animate-pulse" /> 
                      {syncSpeed.toFixed(1)} animes/s
                    </span>
                    {timeEstimate && (
                      <span className="bg-blue-900/30 px-2 py-0.5 rounded-full text-blue-300 flex items-center gap-1">
                        <ClockIcon />
                        {timeEstimate} restantes
                      </span>
                    )}
                  </div>
                )}
                
                {syncProgress?.title && (
                  <div 
                    className="text-xs text-slate-400 mt-1 bg-slate-800/30 px-2 py-1 rounded-md border border-slate-700/50 flex items-center gap-2" 
                    title={syncProgress.title}
                  >
                    <TvIcon />
                    <span className="truncate font-mono">
                      {truncateText(syncProgress.title, 28)}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="relative w-full bg-slate-700/60 rounded-full h-2.5 mb-3 overflow-hidden border border-slate-600/50">
                <div className="absolute inset-0 bg-gradient-to-r from-slate-700/30 to-slate-600/30 rounded-full" />
                <div
                  className="relative bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500 h-full rounded-full transition-all duration-700 ease-out shadow-lg"
                  style={{ 
                    width: `${progressPercent}%`,
                    boxShadow: '0 0 10px rgba(59, 130, 246, 0.4)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse" />
                </div>
              </div>

              {/* Container com AnimatePresence para ajustar dinamicamente o espaço */}
              <AnimatePresence>
                {!isPaused && syncLoading && (
                  <motion.div
                    key="autoscroll-container"
                    variants={buttonContainerVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    style={{ overflow: 'hidden' }}
                  >
                    <button
                      onClick={handleToggleAutoScroll}
                      onPointerDown={(e) => e.stopPropagation()}
                      title={autoScroll ? "Desativar seguimento" : "Ativar seguimento"}
                      className={`group w-full flex items-center justify-center gap-2 text-xs py-1.5 rounded-lg transition-colors duration-200 ${
                        autoScroll
                          ? 'bg-blue-500/20 text-blue-300 hover:bg-blue-500/30'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <EyeIcon off={!autoScroll} className="w-4 h-4" />
                      
                      {/* Animação de fade/scale para a troca de texto */}
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={autoScroll ? 'seguindo' : 'pausado'}
                          variants={textVariants}
                          initial="hidden"
                          animate="visible"
                          exit="hidden"
                          transition={{ duration: 0.25 }}
                        >
                          {autoScroll ? 'Seguindo' : 'Seguimento Pausado'}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
            
            <div className="flex flex-col gap-2 relative z-10">
              <button
                className="group relative px-4 py-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 border border-slate-500/50 hover:border-slate-400/50 shadow-lg"
                onClick={handlePauseResume}
                onPointerDown={(e) => e.stopPropagation()}
                title={isPaused ? "Retomar sincronização" : "Pausar sincronização"}
                aria-label={isPaused ? "Retomar sincronização" : "Pausar sincronização"}
                style={{ pointerEvents: 'auto' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="relative flex items-center justify-center">
                  {isPaused ? (
                    <svg className="w-4 h-4 filter drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9 8V6a2 2 0 012-2h8a2 2 0 012 2v16l-5-3-5 3z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 filter drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
              </button>
              
              <button
                className="group relative px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-lg text-xs font-medium transition-all duration-200 hover:scale-105 border border-red-500/50 hover:border-red-400/50 shadow-lg"
                onClick={handleCancel}
                onPointerDown={(e) => e.stopPropagation()}
                title="Cancelar sincronização"
                aria-label="Cancelar sincronização"
                style={{ pointerEvents: 'auto' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                <div className="relative flex items-center justify-center">
                  <svg className="w-4 h-4 filter drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </button>
            </div>
          </>
        )}
      </div>
      
      {minimized && (
        <div className="mt-3 relative">
          <div className="absolute inset-0 bg-slate-800/60 rounded-lg blur-sm" />
          <div className="relative text-xs text-blue-300 bg-gradient-to-r from-slate-800/90 to-slate-900/90 px-3 py-2 rounded-lg backdrop-blur-sm border border-slate-700/50 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="font-medium">
                {isPaused
                  ? 'Pausado'
                  : syncProgress
                    ? `${syncProgress.current.toLocaleString()} de ${syncProgress.total.toLocaleString()} animes (${progressPercent}%)`
                    : `Sincronizando... ${progressPercent}%`}
              </span>
            </div>
            
            {/* Tempo estimado no modo minimizado */}
            {!isPaused && syncSpeed > 0 && timeEstimate && (
              <div className="mt-1 text-xs text-slate-400">
                ⏱️ {timeEstimate} restantes
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};