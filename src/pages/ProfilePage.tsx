import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { logout } from '../services/authService';
import { animeService } from '../services/animeService';
import { obterRecomendacoesIA, AnimeRecommendation } from '../services/geminiService';
import { AnimeEntry } from '../types/anime';
import { useNavigate } from 'react-router-dom';
import { AnimatedPage } from '../components/layout/AnimatedPage';
import { useThemeStore, Theme } from '../stores/themeStore';
import { open } from '../services/tauriService';
import { importarListaMALXml } from '../services/malImportService';
import { toast } from 'react-toastify';
import { 
  Palette, 
  BookOpen, 
  Clock, 
  Tv, 
  Star, 
  BarChart2, 
  Tags, 
  History, 
  Sparkles
} from 'lucide-react';



const themesList = [
  { id: 'dark' as Theme, name: 'Default Dark', emoji: '🌌', desc: 'Espaço profundo original', previewBg: '#080B14', previewAccent: '#7C3AED' },
  { id: 'tokyo-night' as Theme, name: 'Tokyo Night', emoji: '🌆', desc: 'Neon Cyberpunk japonês', previewBg: '#1a1b26', previewAccent: '#bb9af7' },
  { id: 'vampiric' as Theme, name: 'Vampiric Crimson', emoji: '🧛', desc: 'Carmesim & Veludo gótico', previewBg: '#0a0505', previewAccent: '#e11d48' },
  { id: 'dracula' as Theme, name: 'Dracula Digital', emoji: '🦇', desc: 'O clássico dark dos devs', previewBg: '#1e1f29', previewAccent: '#bd93f9' },
  { id: 'swiss-light' as Theme, name: 'Swiss Light', emoji: '🏢', desc: 'Minimalismo escandinavo', previewBg: '#f5f5f7', previewAccent: '#000000' },
];

export const ProfilePage: React.FC = () => {

  const { theme: currentTheme, setTheme } = useThemeStore();
  const userProfile = useAuthStore((state: any) => state.userProfile);

  const navigate = useNavigate();
  const [animes, setAnimes] = useState<AnimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para Recomendações com IA
  const [recommendations, setRecommendations] = useState<AnimeRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const data = await animeService.buscarAnimes();
        setAnimes(data);
      } catch (e) {
        console.error('Erro ao carregar dados do perfil:', e);
      } finally {
        setLoading(false);
      }
    };
    loadProfileData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-[#0b0f19]">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[#0b0f19]">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md backdrop-blur-xl shadow-2xl">
          <span className="text-5xl mb-4 block">⛩️</span>
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-white/60 mb-6 text-sm">Você precisa estar conectado com o MyAnimeList para ver as estatísticas do seu perfil.</p>
          <button 
            onClick={() => navigate('/')} 
            className="px-6 py-2.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white font-medium transition-all shadow-lg shadow-violet-500/20 active:scale-95"
          >
            Ir para a Biblioteca
          </button>
        </div>
      </div>
    );
  }

  // Cálculos de Estatísticas
  const totalAnimes = animes.length;
  const completedAnimes = animes.filter(a => a.status === 'completed').length;
  const watchingAnimes = animes.filter(a => a.status === 'watching').length;
  const planToWatchAnimes = animes.filter(a => a.status === 'plan_to_watch' || a.status === 'planned').length;
  const onHoldAnimes = animes.filter(a => a.status === 'on_hold' || a.status === 'paused').length;
  const droppedAnimes = animes.filter(a => a.status === 'dropped').length;

  const totalEpisodes = animes.reduce((acc, curr) => acc + (curr.currentEpisode || 0), 0);
  
  // Total de dias assistidos (assumindo média de 23 minutos por episódio)
  const totalMinutes = totalEpisodes * 23;
  const totalDays = (totalMinutes / 1440).toFixed(1);

  // Média de nota do usuário
  const ratedAnimes = animes.filter(a => a.rating && a.rating > 0);
  const meanScore = ratedAnimes.length > 0 
    ? (ratedAnimes.reduce((acc, curr) => acc + (curr.rating || 0), 0) / ratedAnimes.length).toFixed(1)
    : '0.0';

  // Animes assistidos recentemente
  const recentWatched = [...animes]
    .filter(a => a.lastWatched)
    .sort((a, b) => new Date(b.lastWatched!).getTime() - new Date(a.lastWatched!).getTime())
    .slice(0, 4);

  // Gêneros mais frequentes
  const genreCounts: { [key: string]: number } = {};
  animes.forEach(anime => {
    anime.genres?.forEach(g => {
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const handleImportXml = async () => {
    try {
      const filePath = await open({
        multiple: false,
        directory: false,
        filters: [
          { name: 'MyAnimeList Export', extensions: ['gz', 'xml.gz', 'xml'] }
        ]
      });

      if (!filePath) return;

      setLoading(true);
      const { total, importados } = await importarListaMALXml(filePath);
      
      // Recarrega lista local
      const data = await animeService.buscarAnimes();
      setAnimes(data);
      
      toast.success(`Sucesso! Importados ${importados} de ${total} animes.`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Falha ao importar o arquivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {

    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Porcentagens para as barras de status
  const getPercentage = (value: number) => {
    if (totalAnimes === 0) return 0;
    return (value / totalAnimes) * 100;
  };

  // Solicitar recomendações da IA
  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setRecsError(null);
    try {
      const recs = await obterRecomendacoesIA(animes);
      if (recs.length === 0) {
        setRecsError('Sua biblioteca precisa de mais animes favoritos avaliados (nota 8 ou superior) para a IA calibrar seu gosto!');
      } else {
        setRecommendations(recs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com a API do Gemini. Verifique se o arquivo .env possui uma chave de API válida.';
      setRecsError(msg);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#0b0f19] text-white p-6 md:p-12 overflow-y-auto">

      <div className="max-w-6xl mx-auto space-y-8 pb-16">
        
        {/* Card do Cabeçalho do Usuário */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-center gap-6 z-10">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-300" />
              <img 
                src={userProfile.picture} 
                alt={`Foto de ${userProfile.name}`} 
                className="relative w-24 h-24 rounded-full object-cover border-4 border-[#0b0f19]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://github.com/github.png';
                }}
              />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-extrabold text-white tracking-tight">{userProfile.name}</h1>
              <p className="text-white/50 text-sm mt-1 flex items-center justify-center md:justify-start gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>MyAnimeList Connected</span>
              </p>
            </div>
          </div>
          
          <div className="z-10 flex flex-wrap gap-3 justify-center md:justify-end">
            <button 
              onClick={handleImportXml}
              className="px-5 py-2.5 bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 border border-violet-500/20 rounded-full font-medium transition-all text-sm active:scale-95 flex items-center gap-2"
              title="Importar lista do MyAnimeList via arquivo .xml.gz ou .xml"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Importar XML backup</span>
            </button>

            <button 
              onClick={handleLogout}
              className="px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-full font-medium transition-all text-sm active:scale-95 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <span>Desconectar Conta</span>
            </button>
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            <BookOpen className="absolute top-4 right-4 w-12 h-12 opacity-10 text-white" />
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Total de Animes</p>
            <h3 className="text-3xl font-bold mt-2 text-white">{totalAnimes}</h3>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            <Clock className="absolute top-4 right-4 w-12 h-12 opacity-10 text-white" />
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Tempo Assistido</p>
            <h3 className="text-3xl font-bold mt-2 text-white">{totalDays} <span className="text-sm font-normal text-white/50">dias</span></h3>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            <Tv className="absolute top-4 right-4 w-12 h-12 opacity-10 text-white" />
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Episódios Vistos</p>
            <h3 className="text-3xl font-bold mt-2 text-white">{totalEpisodes}</h3>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-xl relative overflow-hidden group hover:border-white/20 transition-all duration-300">
            <Star className="absolute top-4 right-4 w-12 h-12 opacity-10 text-white" />
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Nota Média</p>
            <h3 className="text-3xl font-bold mt-2 text-white">{meanScore}</h3>
          </div>
        </div>

        {/* 🎨 Seção de Customização de Painel (Estilo Discord) */}
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

        {/* Layout do Grid de Informações */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          
          {/* Coluna 1 e 2: Status & Recentes */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Bloco de Distribuição por Status */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-violet-400" />
                <span>Distribuição por Status</span>
              </h2>
              
              {/* Barra Única Segmentada */}
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-white/10 mb-8">
                <div style={{ width: `${getPercentage(completedAnimes)}%` }} className="bg-emerald-500 transition-all duration-500" title="Completado" />
                <div style={{ width: `${getPercentage(watchingAnimes)}%` }} className="bg-blue-500 transition-all duration-500" title="Assistindo" />
                <div style={{ width: `${getPercentage(onHoldAnimes)}%` }} className="bg-amber-500 transition-all duration-500" title="Em Pausa" />
                <div style={{ width: `${getPercentage(droppedAnimes)}%` }} className="bg-red-500 transition-all duration-500" title="Desistiu" />
                <div style={{ width: `${getPercentage(planToWatchAnimes)}%` }} className="bg-violet-500 transition-all duration-500" title="Planejado" />
              </div>

              {/* Lista Detalhada */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <div>
                    <p className="text-white/40 text-xs font-medium">Completados</p>
                    <p className="text-sm font-bold text-white">{completedAnimes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-white/40 text-xs font-medium">Assistindo</p>
                    <p className="text-sm font-bold text-white">{watchingAnimes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div>
                    <p className="text-white/40 text-xs font-medium">Em Pausa</p>
                    <p className="text-sm font-bold text-white">{onHoldAnimes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div>
                    <p className="text-white/40 text-xs font-medium">Desistiu</p>
                    <p className="text-sm font-bold text-white">{droppedAnimes}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 col-span-2 md:col-span-1">
                  <div className="w-3 h-3 rounded-full bg-violet-500" />
                  <div>
                    <p className="text-white/40 text-xs font-medium">Planejados</p>
                    <p className="text-sm font-bold text-white">{planToWatchAnimes}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco de Atividade Recente */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-violet-400" />
                <span>Atividade Recente</span>
              </h2>

              {recentWatched.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">Nenhum histórico recente disponível.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentWatched.map(anime => (
                    <div 
                      key={anime.id} 
                      onClick={() => navigate(`/anime/${anime.id}`)}
                      className="flex gap-4 p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all duration-200 cursor-pointer group"
                    >
                      <img 
                        src={anime.coverImage} 
                        alt={anime.title} 
                        className="w-12 h-16 object-cover rounded-lg shadow-md group-hover:scale-105 transition-all duration-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/placeholder.png';
                        }}
                      />
                      <div className="flex flex-col justify-center min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate max-w-[180px]">{anime.title}</h4>
                        <p className="text-xs text-white/50 mt-1">Ep. {anime.currentEpisode} visto</p>
                        <p className="text-[10px] text-white/30 mt-0.5">
                          {anime.lastWatched ? new Date(anime.lastWatched).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Coluna 3: Gêneros Favoritos */}
          <div className="space-y-8">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col h-full">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <Tags className="w-5 h-5 text-violet-400" />
                <span>Gêneros Mais Vistos</span>
              </h2>

              {topGenres.length === 0 ? (
                <p className="text-white/40 text-sm text-center py-8">Nenhum gênero mapeado ainda.</p>
              ) : (
                <div className="space-y-5 flex-1">
                  {topGenres.map(([genre, count], index) => {
                    const barWidth = totalAnimes > 0 ? (count / totalAnimes) * 100 : 0;
                    return (
                      <div key={genre} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-white/80 flex items-center gap-2">
                            <span className="text-white/30 text-xs font-mono">0{index + 1}</span>
                            <span>{genre}</span>
                          </span>
                          <span className="text-white/40 font-mono text-xs">{count} animes</span>
                        </div>
                        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            style={{ width: `${barWidth}%` }} 
                            className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full" 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* 💡 Seção de Recomendações com IA (Gemini) */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-violet-400" />
                <span>Recomendações da IA (Gemini)</span>
              </h2>
              <p className="text-white/50 text-sm mt-1">Análise inteligente baseada nos animes que você deu notas mais altas.</p>
            </div>
            
            <button
              onClick={handleGetRecommendations}
              disabled={loadingRecs}
              className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 self-start md:self-auto"
            >
              {loadingRecs ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  <span>Analisando biblioteca...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Gerar Recomendações</span>
                </>
              )}
            </button>
          </div>

          {recsError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm mb-4">
              {recsError}
            </div>
          )}

          {recommendations.length === 0 && !loadingRecs && !recsError && (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/2">
              <Sparkles className="w-12 h-12 text-white/20 mb-3" />
              <h3 className="text-white font-semibold text-sm">Pronto para encontrar seu próximo anime?</h3>
              <p className="text-white/40 text-xs max-w-sm mt-1">Clique no botão acima para a Inteligência Artificial mapear sua biblioteca e sugerir títulos perfeitos para você.</p>
            </div>
          )}

          {loadingRecs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-32 bg-white/5 rounded-2xl border border-white/5 p-5 flex flex-col justify-between">
                  <div className="h-4 bg-white/10 rounded w-1/3" />
                  <div className="h-3 bg-white/10 rounded w-full mt-2" />
                  <div className="h-3 bg-white/10 rounded w-5/6 mt-1" />
                  <div className="flex gap-2 mt-4">
                    <div className="h-5 bg-white/10 rounded-full w-12" />
                    <div className="h-5 bg-white/10 rounded-full w-12" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {recommendations.length > 0 && !loadingRecs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span className="text-xs font-mono text-violet-400">0{index + 1}</span>
                      <span>{rec.title}</span>
                    </h3>
                    <p className="text-white/60 text-xs mt-2 leading-relaxed">{rec.reason}</p>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mt-6">
                    <div className="flex flex-wrap gap-1.5">
                      {rec.genres.map(g => (
                        <span key={g} className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                          {g}
                        </span>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => navigate(`/?search=${encodeURIComponent(rec.title)}`)}
                      className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-full text-xs font-semibold tracking-tight transition-all active:scale-95"
                    >
                      Buscar no MAL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  </AnimatedPage>
);
};