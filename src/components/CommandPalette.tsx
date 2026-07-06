// src/components/CommandPalette.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { animeService } from '../services/animeService';
import { useSyncFloatingStore } from '../stores/syncFloatingStore';
import { AnimeEntry } from '../types/anime';

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeEntry[]>([]);
  const [animes, setAnimes] = useState<AnimeEntry[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  const { startSync } = useSyncFloatingStore();

  // Carrega animes locais para busca instantânea
  useEffect(() => {
    const loadAnimes = async () => {
      try {
        const data = await animeService.buscarAnimes();
        setAnimes(data);
      } catch (e) {
        console.error(e);
      }
    };
    if (isOpen) {
      loadAnimes();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Escuta atalhos de teclado globais
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Foco no input ao abrir
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filtra animes conforme digitação (busca instantânea)
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const filtered = animes.filter(anime =>
      anime.title.toLowerCase().includes(query.toLowerCase()) ||
      anime.alternativeTitles?.some(t => t.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 5);
    
    setResults(filtered);
    setSelectedIndex(0);
  }, [query, animes]);

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  shortcut: string;
  action: () => void;
}

  // Ações estáticas sugeridas
  const staticActions: CommandItem[] = [
    { id: 'nav-lib', title: 'Ir para Minha Biblioteca', shortcut: 'G + L', action: () => navigate('/') },
    { id: 'nav-prof', title: 'Ir para Perfil & Estatísticas', shortcut: 'G + P', action: () => navigate('/profile') },
    { id: 'action-sync', title: 'Sincronizar com o MyAnimeList', shortcut: 'S', action: () => startSync() },
  ];

  // Combina ações estáticas com resultados de busca
  const allItems: CommandItem[] = query.trim() 
    ? results.map(anime => ({
        id: `anime-${anime.id}`,
        title: anime.title,
        subtitle: `Ver detalhes de: ${anime.title}`,
        shortcut: '⏎',
        action: () => {
          navigate(`/anime/${anime.id}`);
          setIsOpen(false);
        }
      }))
    : staticActions;


  // Lógica de navegação via teclado dentro da paleta
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (allItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      allItems[selectedIndex].action();
      setIsOpen(false);
    }
  };

  // Garante scroll automático para item selecionado via teclado
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] p-4">
          
          {/* Backdrop Blur de Luxo */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Card Glassmorphism */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl bg-[#0f1422]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/80 backdrop-blur-2xl flex flex-col"
          >
            
            {/* Campo de Input de Comando */}
            <div className="flex items-center gap-3 px-4 border-b border-white/10">
              <span className="text-white/40 text-lg">⌘</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Busque animes ou execute comandos rápidos..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full h-14 bg-transparent border-0 outline-none text-white text-sm placeholder-white/30"
              />
              <span className="text-[10px] text-white/30 bg-white/5 border border-white/10 px-2 py-1 rounded">ESC</span>
            </div>

            {/* Lista de Resultados / Ações */}
            <div 
              ref={resultsRef}
              className="max-h-[320px] overflow-y-auto p-2 space-y-1 scrollbar-thin"
            >
              {allItems.length === 0 ? (
                <div className="py-12 text-center text-white/40 text-sm">
                  Nenhum resultado encontrado para "{query}"
                </div>
              ) : (
                allItems.map((item, index) => {
                  const isSelected = index === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected 
                          ? 'bg-violet-600/30 border-l-4 border-violet-500 text-white pl-3' 
                          : 'text-white/70 hover:bg-white/5 pl-4'
                      }`}
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-semibold truncate tracking-tight">{item.title}</span>
                        {'subtitle' in item && (
                          <span className="text-[10px] text-white/40 mt-0.5 truncate">{item.subtitle}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/30 font-mono">{item.shortcut}</span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Dica do Rodapé */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-black/20 text-[10px] text-white/40 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span>↑↓ para navegar</span>
                <span className="text-white/20">•</span>
                <span>⏎ para selecionar</span>
              </span>
              <span>Comando Rápido ⌘K</span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
