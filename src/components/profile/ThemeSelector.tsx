import React from 'react';
import { useThemeStore, Theme } from '../../stores/themeStore';
import { Palette } from 'lucide-react';

const themesList = [
  { id: 'dark' as Theme, name: 'Default Dark', emoji: '🌌', desc: 'Espaço profundo original', previewBg: '#080B14', previewAccent: '#7C3AED' },
  { id: 'tokyo-night' as Theme, name: 'Tokyo Night', emoji: '🌆', desc: 'Neon Cyberpunk japonês', previewBg: '#1a1b26', previewAccent: '#bb9af7' },
  { id: 'vampiric' as Theme, name: 'Vampiric Crimson', emoji: '🧛', desc: 'Carmesim & Veludo gótico', previewBg: '#0a0505', previewAccent: '#e11d48' },
  { id: 'dracula' as Theme, name: 'Dracula Digital', emoji: '🦇', desc: 'O clássico dark dos devs', previewBg: '#1e1f29', previewAccent: '#bd93f9' },
  { id: 'swiss-light' as Theme, name: 'Swiss Light', emoji: '🏢', desc: 'Minimalismo escandinavo', previewBg: '#f5f5f7', previewAccent: '#000000' },
];

export const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme } = useThemeStore();

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
        <Palette className="w-5 h-5 text-violet-400" />
        <span>Tema do Painel</span>
      </h2>
      <p className="text-white/50 text-xs mb-6">Escolha o visual que melhor se adapta à sua estação de animes. As cores são atualizadas instantaneamente em tempo real.</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {themesList.map((t) => {
          const isSelected = currentTheme === t.id;
          return (
            <div
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`cursor-pointer rounded-2xl p-4 border transition-all duration-300 flex flex-col justify-between h-32 relative overflow-hidden group active:scale-95 ${
                isSelected 
                  ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10' 
                  : 'border-white/5 bg-white/2 hover:bg-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="text-3xl">{t.emoji}</span>
                {isSelected && (
                  <span className="w-5 h-5 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold animate-pulse">
                    ✓
                  </span>
                )}
              </div>
              
              <div className="mt-3">
                <h4 className="text-sm font-semibold tracking-tight text-white">{t.name}</h4>
                <p className="text-[10px] text-white/40 mt-0.5 truncate">{t.desc}</p>
              </div>
              
              {/* Pré-visualização de Cores */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
                <div style={{ background: t.previewBg }} className="flex-1" />
                <div style={{ background: t.previewAccent }} className="w-1/3" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
