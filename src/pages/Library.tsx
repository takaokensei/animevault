import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useSyncFloatingStore } from '../stores/syncFloatingStore';
import { useAutoScrollStore } from '../stores/autoScrollStore';
import { fuzzyMatch } from '../utils/fuzzy';
import { AnimatedPage } from '../components/layout/AnimatedPage';
import { useAuthStore } from '../stores/authStore';
import { animeService } from '../services/animeService';
import { LoginButton } from '../components/auth/LoginButton';
import { useNavigate } from 'react-router-dom';
import { SearchFilters } from '../components/library/SearchFilters';
import { LibraryGrid } from '../components/library/LibraryGrid';
import { useQuery, useQueryClient } from '@tanstack/react-query';

  const Library: React.FC = () => {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [genreFilter, setGenreFilter] = useState('all');
    const [sortBy, setSortBy] = useState('title');
    
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

    // Query do React Query contendo cacheamento nativo
    const { data: animes = [], isLoading: loading } = useQuery({
      queryKey: ['library'],
      queryFn: () => animeService.buscarAnimes(),
      enabled: isLoggedIn,
    });

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
          queryClient.invalidateQueries({ queryKey: ['library'] });
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
    }, [startSync, resumeSync, completeSync, setSyncProgress, queryClient, isPaused, syncLoading]);

    const previousIsPaused = useRef(isPaused);
    
    useEffect(() => {
      if (previousIsPaused.current === true && isPaused === false && syncLoading) {
        handleSync(true);
      }

      previousIsPaused.current = isPaused;
    }, [isPaused, syncLoading, handleSync]);

    // Efeito para recarregar os animes reativamente conforme o progresso global avança
    const currentProgressIndex = useSyncFloatingStore(state => state.syncProgress?.current);
    
    useEffect(() => {
      if (syncLoading && currentProgressIndex !== undefined) {
        queryClient.invalidateQueries({ queryKey: ['library'] });
      }
    }, [currentProgressIndex, syncLoading, queryClient]);


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

     // Limpar filtros
    const clearFilters = () => {
      setStatusFilter('all');
      setGenreFilter('all');
      setSortBy('title');
      setSearch('');
    };

    // Verificar se há filtros ativos
    const hasActiveFilters = statusFilter !== 'all' || genreFilter !== 'all' || sortBy !== 'title' || !!search;

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
            return (b.episodes || 0) - (a.episodes || 0);
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
            <SearchFilters
              search={search}
              setSearch={setSearch}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              genreFilter={genreFilter}
              setGenreFilter={setGenreFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              genreOptions={genreOptions}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
            
            {/* Contador de resultados */}
            {!loading && animes.length > 0 && (
              <div className="flex justify-between items-center text-sm mb-5">
                <span style={{ color: 'var(--text-secondary)' }}>
                  <span className="text-white font-medium">{filteredAnimes.length}</span> de {animes.length} animes
                </span>
              </div>
            )}
            
            {/* Grade de cards */}
            <LibraryGrid
              displayAnimes={displayAnimes}
              filteredAnimes={filteredAnimes}
              loading={loading}
              onCardClick={(animeId) => navigate(`/anime/${animeId}`)}
              visibleCount={visibleCount}
            />

            {/* Marcador invisível para o auto-scroll */}
            <div ref={scrollMarkerRef} style={{ height: '1px' }} />
          </main>
        </div>
      </AnimatedPage>
    );
  };

  export default Library;