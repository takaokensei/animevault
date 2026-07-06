import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSyncFloatingStore } from '../stores/syncFloatingStore';
import { useAutoScrollStore } from '../stores/autoScrollStore';
import { fuzzyMatch } from '../utils/fuzzy';
import { AnimatedPage } from '../components/layout/AnimatedPage';


import AnimeCard from '../components/anime/AnimeCard';
import { useAuthStore } from '../stores/authStore';
import { animeService } from '../services/animeService';
import { LoginButton } from '../components/auth/LoginButton';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

  // Opções de filtros
  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'watching', label: 'Assistindo' },
    { value: 'completed', label: 'Completado' },
    { value: 'on_hold', label: 'Em Pausa' },
    { value: 'dropped', label: 'Abandonado' },
    { value: 'plan_to_watch', label: 'Planejado' }
  ];

  const sortOptions = [
    { value: 'title', label: 'Título' },
    { value: 'rating', label: 'Avaliação' },
    { value: 'episodes', label: 'Episódios' },
    { value: 'year', label: 'Ano' },
    { value: 'status', label: 'Status' }
  ];

  // Ícone de busca
  const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 256 256">
      <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
    </svg>
  );

  // Ícone de seta para baixo
  const ChevronDownIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
      <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>
    </svg>
  );

  const Library: React.FC = () => {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [animes, setAnimes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [genreFilter, setGenreFilter] = useState('all');
    const [sortBy, setSortBy] = useState('title');
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showGenreDropdown, setShowGenreDropdown] = useState(false);
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    
    // Paginação inteligente de memória (Infinite Scroll)
    const [visibleCount, setVisibleCount] = useState(48);

    const { autoScroll, userScrolledUp, setAutoScroll, setUserScrolledUp } = useAutoScrollStore();

    const scrollMarkerRef = useRef<HTMLDivElement>(null);
    
    // 🚀 ADICIONE ESSAS NOVAS VARIÁVEIS AQUI:
    const isScrollingProgrammatically = useRef(false);
    const lastScrollTop = useRef(0);
    const lastDocumentHeight = useRef(0);



    const isLoggedIn = useAuthStore((state: any) => state.isLoggedIn);
    const [syncError, setSyncError] = useState<string | null>(null);
    const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

    // Estado global do botão flutuante
    const {
      syncProgress,
      syncLoading,
      isPaused,
      startSync,
      resumeSync,
      completeSync,
      setSyncProgress,
      rehydratePausedState
    } = useSyncFloatingStore();

    const navigate = useNavigate();

    // Função para buscar animes - será usada tanto no carregamento inicial quanto durante sync
    const fetchLibrary = useCallback(async () => {
      try {
        const animesData = await animeService.buscarAnimes();
        setAnimes(animesData);
        return animesData;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Erro ao buscar animes da biblioteca:', err);
        setSyncError('Erro ao buscar animes da biblioteca: ' + errorMsg);
        return [];
      }
    }, []);

    // Carregamento inicial
    const loadInitialData = useCallback(async () => {
      setLoading(true);
      try {
        await fetchLibrary();
      } finally {
        setLoading(false);
      }
    }, [fetchLibrary]);

    // Reseta paginação quando filtros mudarem
    useEffect(() => {
      setVisibleCount(48);
    }, [search, statusFilter, genreFilter, sortBy]);



    // Sincronizar biblioteca
    const handleSync = useCallback(async (resume = false) => {
      console.log('[Library] handleSync chamado:', { resume, syncLoading, isPaused });

      if (syncLoading && !resume) {
        return;
      }

      setSyncError(null);
      setSyncSuccess(null);

      if (resume) {
        resumeSync();
      } else {
        startSync();
      }

      try {
        let resumeIndex = 0;
        
        // Se for resumo, recuperar índice salvo
        if (resume) {
          // ========== CORREÇÃO PRINCIPAL APLICADA AQUI ==========
          // Obtenha o progresso diretamente da store, não do localStorage.
          const currentProgress = useSyncFloatingStore.getState().syncProgress;
          if (currentProgress && currentProgress.current > 0) {
              resumeIndex = currentProgress.current;
              console.log(`[Library] Retomando do índice: ${resumeIndex}`);
          } else {
              console.warn('[Library] Tentou retomar, mas não havia progresso salvo na store.');
          }
          // =======================================================
        }

        // Callback de progresso
        const onProgress = (current: number, total: number, title?: string) => {
          const store = useSyncFloatingStore.getState();
          if (store.cancelRequested || store.isPaused) {
            throw new Error('Sincronização interrompida');
          }

          // Atualizar progresso
          const progress = { current, total, title: title ?? 'Carregando...' };
          setSyncProgress(progress);

          // Salvar estado no localStorage
          const state = {
            isPaused: false,
            syncProgress: progress,
            lastSync: Date.now()
          };
          localStorage.setItem('syncState', JSON.stringify(state));
        };



        const shouldStop = () => {
          const store = useSyncFloatingStore.getState();
          return store.cancelRequested || store.isPaused;
        };

        console.log(`[Library] Iniciando sincronização no serviço com índice: ${resumeIndex}`);
        
        await animeService.sincronizarListaUsuario(
          onProgress,
          resumeIndex,
          shouldStop
        );
        
        const finalStore = useSyncFloatingStore.getState();
        if (!finalStore.cancelRequested && !finalStore.isPaused) {
          console.log('[Library] Sincronização concluída com sucesso');
          setSyncSuccess('Biblioteca sincronizada com sucesso!');
          completeSync();
          localStorage.removeItem('syncState');
          await fetchLibrary();
        }
      } catch (err: any) {
        // ========== MUDANÇA SECUNDÁRIA (Melhoria no Tratamento de Erro) ==========
        if (err.message !== 'Sincronização interrompida' && err.message !== 'Sincronização cancelada pelo usuário') {
          console.error('[Library] Erro durante sincronização:', err);
          setSyncError('Erro ao sincronizar biblioteca: ' + err.message);
          completeSync();
        } else {
          console.log(`[Library] Sincronização interrompida intencionalmente: ${err.message}`);
        }
      }
    }, [startSync, resumeSync, completeSync, setSyncProgress, fetchLibrary, isPaused, syncLoading]);

    const previousIsPaused = useRef(isPaused);
    
    useEffect(() => {
      if (previousIsPaused.current === true && isPaused === false && syncLoading) {
        handleSync(true);
      }

      previousIsPaused.current = isPaused;
    }, [isPaused, syncLoading, handleSync]);

    // Carregar dados iniciais
    useEffect(() => {
      if (isLoggedIn) {
        loadInitialData();
      }
    }, [isLoggedIn, loadInitialData]);

    // Efeito para recarregar os animes reativamente conforme o progresso global avança
    const currentProgressIndex = useSyncFloatingStore(state => state.syncProgress?.current);
    
    useEffect(() => {
      if (syncLoading && currentProgressIndex !== undefined) {
        fetchLibrary();
      }
    }, [currentProgressIndex, syncLoading, fetchLibrary]);


    // 2. SUBSTITUA SEU useEffect DE SCROLL ATUAL POR ESTE:
    useEffect(() => {
      let scrollTimeout: number;
      
      // Inicializa valores de referência
      lastDocumentHeight.current = document.documentElement.scrollHeight;

      const handleScroll = () => {
        clearTimeout(scrollTimeout);

        scrollTimeout = window.setTimeout(() => {
          // Se está rolando programaticamente, ignora
          if (isScrollingProgrammatically.current) {
            return;
          }

          const currentScrollTop = window.scrollY;
          const currentDocumentHeight = document.documentElement.scrollHeight;
          const windowHeight = window.innerHeight;
          const atBottom = currentScrollTop + windowHeight >= currentDocumentHeight - 10;

          // Detecta se houve mudança de altura do documento (novo conteúdo adicionado)
          const contentHeightChanged = currentDocumentHeight !== lastDocumentHeight.current;
          
          // Detecta direção do scroll do usuário
          const userScrollDirection = currentScrollTop > lastScrollTop.current ? 'down' : 'up';
          const userScrolledSignificantly = Math.abs(currentScrollTop - lastScrollTop.current) > 5;

          console.log('Scroll Debug:', {
            atBottom,
            contentHeightChanged,
            userScrollDirection,
            userScrolledSignificantly,
            autoScroll,
            userScrolledUp
          });

          // Se o conteúdo mudou de altura e o usuário estava com auto-scroll ativo
          if (contentHeightChanged && autoScroll && !userScrolledUp) {
            console.log('Conteúdo adicionado, mantendo auto-scroll ativo');
            lastDocumentHeight.current = currentDocumentHeight;
            lastScrollTop.current = currentScrollTop;
            return; // Não desativa o auto-scroll por mudança de conteúdo
          }

          // Se o usuário fez scroll manual significativo para cima
          if (userScrolledSignificantly && userScrollDirection === 'up' && !atBottom && !userScrolledUp) {
            console.log('Usuário rolou para cima manualmente, auto-scroll desativado.');
            setAutoScroll(false);
            setUserScrolledUp(true);
          }
          // Se o usuário voltou para o fundo após ter desativado o auto-scroll
          else if (atBottom && userScrolledUp) {
            console.log('Usuário rolou para o fundo, auto-scroll reativado.');
            setAutoScroll(true);
            setUserScrolledUp(false);
          }

          // Atualiza valores para próxima comparação
          lastScrollTop.current = currentScrollTop;
          lastDocumentHeight.current = currentDocumentHeight;
        }, 150);
      };

      window.addEventListener('scroll', handleScroll, { passive: true });
      
      return () => {
        window.removeEventListener('scroll', handleScroll);
        clearTimeout(scrollTimeout);
      };
    }, [userScrolledUp, setAutoScroll, setUserScrolledUp, autoScroll]);

    // 3. SUBSTITUA SEU useEffect DE ROLAGEM AUTOMÁTICA POR ESTE (SEM REBOTE):
    useEffect(() => {
      // Só executa se está sincronizando E auto-scroll está ativo E não há scroll em andamento
      if (syncLoading && autoScroll && !isScrollingProgrammatically.current) {
        const timeoutId = setTimeout(() => {
          // Verifica se ainda precisa fazer scroll
          const currentBottom = window.innerHeight + window.scrollY;
          const documentHeight = document.documentElement.scrollHeight;
          
          // Só faz scroll se não estiver próximo do fundo (evita rebote)
          if (documentHeight - currentBottom > 100) {
            isScrollingProgrammatically.current = true;
            
            // Usa scroll suave para o final da página
            window.scrollTo({
              top: documentHeight,
              behavior: 'smooth'
            });

            // Remove a marca após scroll completar
            setTimeout(() => {
              isScrollingProgrammatically.current = false;
            }, 800);
          }
        }, 50); // Delay menor para resposta mais rápida

        return () => clearTimeout(timeoutId);
      }
    }, [animes.length, syncLoading, autoScroll]);

    // Verificar estado salvo ao inicializar
    useEffect(() => {
      const savedState = localStorage.getItem('syncState');
      if (savedState) {
        try {
          const { isPaused: savedIsPaused, syncProgress: savedProgress } = JSON.parse(savedState);
          
          if (savedIsPaused && savedProgress) {
            rehydratePausedState(savedProgress); 
            setSyncError('Sincronização interrompida. Você pode retomar o processo.');
          }
        } catch (e) {
          console.error("Falha ao analisar o estado de sincronização salvo", e);
          localStorage.removeItem('syncState'); // Limpa estado corrompido
        }
      }
    // A dependência agora é a função de reidratação.
    // Adicione a diretiva para ignorar o lint, pois essa função é estável.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rehydratePausedState]);

    // Fechar dropdowns
    const closeAllDropdowns = () => {
      setShowStatusDropdown(false);
      setShowGenreDropdown(false);
      setShowSortDropdown(false);
    };

    // Limpar filtros
    const clearFilters = () => {
      setStatusFilter('all');
      setGenreFilter('all');
      setSortBy('title');
      setSearch('');
    };

    // Verificar se há filtros ativos
    const hasActiveFilters = statusFilter !== 'all' || genreFilter !== 'all' || sortBy !== 'title' || search;

    // Fechar dropdowns quando clicar fora
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          closeAllDropdowns();
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Limpar mensagens de sucesso após tempo
    useEffect(() => {
      if (syncSuccess) {
        const timer = setTimeout(() => setSyncSuccess(null), 5000);
        return () => clearTimeout(timer);
      }
    }, [syncSuccess]);

    // Salvar estado ao desmontar
    useEffect(() => {
      return () => {
        if (syncLoading && syncProgress) {
          const state = {
            isPaused: isPaused,
            syncProgress,
            lastSync: Date.now()
          };
          localStorage.setItem('syncState', JSON.stringify(state));
        }
      };
    }, [syncLoading, isPaused, syncProgress]);

    // Salvar estado antes de sair da página
    useEffect(() => {
      const handleBeforeUnload = () => {
        if (syncLoading && syncProgress) {
          const state = {
            isPaused: true,
            syncProgress,
            lastSync: Date.now()
          };
          localStorage.setItem('syncState', JSON.stringify(state));
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [syncLoading, syncProgress]);

    // Obter todos os gêneros únicos
    const allGenres = Array.from(new Set(animes.flatMap(anime => anime.genres || []))).sort();
    const genreOptions = [
      { value: 'all', label: 'Todos os Gêneros' },
      ...allGenres.map(genre => ({ value: genre, label: genre }))
    ];

    // **CORREÇÃO 3: Usar apenas o estado animes (fonte única de verdade)**
    const filteredAnimes = animes
      .filter(anime => !search || fuzzyMatch(search, anime.title) || anime.alternativeTitles?.some((t: string) => fuzzyMatch(search, t)))


      .filter(anime => statusFilter === 'all' || anime.status === statusFilter)
      .filter(anime => genreFilter === 'all' || (anime.genres || []).includes(genreFilter))
      .sort((a, b) => {
        switch (sortBy) {
          case 'title':
            return a.title.localeCompare(b.title);
          case 'rating':
            return (b.rating || 0) - (a.rating || 0);
          case 'episodes':
            return (b.totalEpisodes || 0) - (a.totalEpisodes || 0);
          case 'year':
            return (b.year || 0) - (a.year || 0);
          case 'status':
            return a.status.localeCompare(b.status);
          default:
            return 0;
        }
      });

    const displayAnimes = filteredAnimes.slice(0, visibleCount);

    // Configura IntersectionObserver para scroll infinito
    useEffect(() => {
      const trigger = document.getElementById('infinite-scroll-trigger');
      if (!trigger) return;

      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => Math.min(prev + 24, filteredAnimes.length));
        }
      }, { rootMargin: '300px' });

      observer.observe(trigger);
      return () => observer.disconnect();
    }, [filteredAnimes.length, visibleCount]);


    // Componente Dropdown
    const Dropdown = ({ 
      isOpen, 
      onToggle, 
      options, 
      value, 
      onChange, 
      placeholder,
      defaultValue = 'all',
    }: {
      isOpen: boolean;
      onToggle: () => void;
      options: Array<{ value: string; label: string }>;
      value: string;
      onChange: (value: string) => void;
      placeholder: string;
      defaultValue?: string;
    }) => {
      const isActive = value !== defaultValue;
      return (
        <div className="relative">
          <button 
            onClick={onToggle}
            className="flex h-9 items-center gap-x-2 rounded-xl px-4 text-sm font-medium transition-all duration-200"
            style={{
              background: isActive ? 'rgba(124,58,237,0.25)' : 'var(--bg-surface)',
              border: isActive ? '1px solid rgba(124,58,237,0.5)' : '1px solid var(--border-subtle)',
              color: isActive ? '#c4b5fd' : 'var(--text-secondary)',
            }}
          >
            {options.find(o => o.value === value)?.label || placeholder}
            <ChevronDownIcon />
          </button>
          {isOpen && (
            <div
              className="absolute top-full left-0 mt-2 rounded-2xl shadow-2xl z-50 min-w-[160px] max-h-60 overflow-y-auto"
              style={{
                background: 'rgba(22,27,34,0.98)',
                border: '1px solid var(--border-medium)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="p-1">
                {options.map(option => (
                  <button
                    key={option.value}
                    onClick={() => { onChange(option.value); onToggle(); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors duration-150"
                    style={{
                      color: option.value === value ? '#c4b5fd' : 'var(--text-primary)',
                      background: option.value === value ? 'rgba(124,58,237,0.2)' : 'transparent',
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };

    // Skeleton de carregamento
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



    // Componente de erro
    const ErrorMessage = ({ message }: { message: string }) => (
      <div
        className="p-4 rounded-2xl mb-6 text-sm flex items-center gap-3"
        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}
      >
        <span>⚠️</span> {message}
      </div>
    );

    // Componente de sucesso
    const SuccessMessage = ({ message }: { message: string }) => (
      <div
        className="p-4 rounded-2xl mb-6 text-sm flex items-center gap-3"
        style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#6ee7b7' }}
      >
        <span>✅</span> {message}
      </div>
    );

    return (
      <AnimatedPage>
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)', fontFamily: 'Inter, sans-serif' }}>
          <main className="px-8 py-8">
            {/* Header da Biblioteca */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold text-white">Minha Biblioteca</h1>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {animes.length > 0 ? `${animes.length} animes na sua coleção` : 'Sincronize para ver seus animes'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <LoginButton />
                {isPaused ? (
                  <button
                    onClick={() => handleSync(true)}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #d97706, #b45309)', color: 'white', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}
                  >
                    ▶ Retomar Sincronização
                  </button>
                ) : (
                  <button
                    onClick={() => handleSync(false)}
                    disabled={syncLoading}
                    className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                    style={{ background: syncLoading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', boxShadow: syncLoading ? 'none' : '0 4px 16px rgba(124,58,237,0.35)' }}
                  >
                    {syncLoading ? '⟳ Sincronizando...' : '↻ Sincronizar MAL'}
                  </button>
                )}
              </div>
            </div>
            
            {syncError && <ErrorMessage message={syncError} />}
            {syncSuccess && <SuccessMessage message={syncSuccess} />}
            
            {syncProgress && syncLoading && (
              <div className="flex items-center gap-2 mb-4 text-[#93acc8] text-sm animate-pulse">
                <span>
                  Sincronizando: {syncProgress.current} / {syncProgress.total}
                  {syncProgress.title ? ` - ${syncProgress.title}` : ''}
                </span>
              </div>
            )}
            
            {/* Barra de busca e filtros */}
            <div className="flex flex-col gap-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="flex flex-1 items-stretch rounded-xl h-12 border" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  <span className="flex items-center pl-4" style={{ color: 'var(--text-secondary)' }}>
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar na sua biblioteca..."
                    className="flex-1 bg-transparent outline-none border-none px-4 text-base"
                    style={{ color: 'var(--text-primary)' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-[#93acc8] text-sm hover:text-white transition-colors whitespace-nowrap"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
              
              <div className="flex gap-3 flex-wrap" ref={dropdownRef}>
                <Dropdown
                  isOpen={showStatusDropdown}
                  onToggle={() => {
                    setShowStatusDropdown(!showStatusDropdown);
                    setShowGenreDropdown(false);
                    setShowSortDropdown(false);
                  }}
                  options={statusOptions}
                  value={statusFilter}
                  onChange={setStatusFilter}
                  placeholder="Status"
                />
                <Dropdown
                  isOpen={showGenreDropdown}
                  onToggle={() => {
                    setShowGenreDropdown(!showGenreDropdown);
                    setShowStatusDropdown(false);
                    setShowSortDropdown(false);
                  }}
                  options={genreOptions}
                  value={genreFilter}
                  onChange={setGenreFilter}
                  placeholder="Gênero"
                />
                <Dropdown
                  isOpen={showSortDropdown}
                  onToggle={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowStatusDropdown(false);
                    setShowGenreDropdown(false);
                  }}
                  options={sortOptions}
                  value={sortBy}
                  onChange={setSortBy}
                  placeholder="Ordenar"
                  defaultValue="title"
                />
              </div>
            </div>
            
            {/* Contador de resultados */}
            {!loading && animes.length > 0 && (
              <div className="flex justify-between items-center text-sm mb-5">
                <span style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-white font-medium">{filteredAnimes.length}</span> de {animes.length} animes
                </span>
              </div>
            )}
            
            {/* Grade de cards */}
            {loading ? (
              <LoadingSkeleton />
            ) : filteredAnimes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-6">
                <div
                  className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}
                >
                  {animes.length === 0 ? '🎌' : '🔍'}
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {animes.length === 0 ? 'Biblioteca vazia' : 'Nenhum resultado'}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)' }} className="text-sm max-w-xs">
                    {animes.length === 0
                      ? 'Faça login com MyAnimeList e sincronize para ver seus animes aqui.'
                      : 'Nenhum anime encontrado com os filtros aplicados. Tente ajustar os filtros.'}
                  </p>
                </div>
              </div>
            ) : (
              <>
                <motion.div layout className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-5">
                  <AnimatePresence>
                    {displayAnimes.map(anime => (
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
                          onImageError={e => console.error('Erro ao carregar imagem:', anime.coverImage, e)}
                          onCardClick={id => navigate(`/anime/${id}`)}
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

                {/* Marcador invisível para o auto-scroll */}
                <div ref={scrollMarkerRef} style={{ height: '1px' }} />
              </>
            )}
          </main>
        </div>
      </AnimatedPage>
    );
  };

  export default Library;