import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { animeService } from '../services/animeService';
import { LocalFileService } from '../services/localFileService';
import { useLocalAnimeStore } from '../stores/localAnimeStore';
import { FileEntry } from '../services/localFileService';
import { 
  BookOpen, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LocalMediaGrid } from '../components/anime/LocalMediaGrid';
import { AnimeMetadataPanel } from '../components/anime/AnimeMetadataPanel';
import { AnimeScreenshots } from '../components/anime/AnimeScreenshots';

interface StatusOption {
  value: string;
  label: string;
  icon: string;
}

const statusOptions: StatusOption[] = [
  { value: 'watching', label: 'Assistindo', icon: '▶️' },
  { value: 'completed', label: 'Completo', icon: '✅' },
  { value: 'on_hold', label: 'Em Pausa', icon: '⏸️' },
  { value: 'dropped', label: 'Desistiu', icon: '🗑️' },
  { value: 'plan_to_watch', label: 'Planejo Assistir', icon: '🗓️' }
];



const AnimeDetail: React.FC = (): JSX.Element => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [isAddingToList, setIsAddingToList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const animeId = id ? Number(id) : 0;

  const { data: anime, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['anime', id],
    queryFn: () => {
      if (!id) throw new Error('ID do anime não encontrado');
      return animeService.obterDetalhesAnime(id);
    },
    enabled: !!id,
  });

  const {
    addFolder,
    addWatchedEpisode,
    removeWatchedEpisode,
    isEpisodeWatched,
    getFolder
  } = useLocalAnimeStore();

  const [videoFiles, setVideoFiles] = useState<FileEntry[]>([]);
  const folder = getFolder(animeId);
  const folderPath = folder?.folderPath;
  
  useEffect(() => {
    if (folderPath) {
      LocalFileService.listVideoFiles(folderPath)
        .then(files => setVideoFiles(LocalFileService.sortEpisodes(files)))
        .catch(console.error);
    } else {
      setVideoFiles([]);
    }
  }, [folderPath]);

  // Seta erro de ID no boot
  useEffect(() => {
    if (!id) {
      setError('ID do anime não encontrado');
    }
  }, [id]);




  const handleAddToList = async (status: string) => {
    setIsAddingToList(true);
    try {
      if (anime && animeId) {
        await animeService.adicionarAnimeALista(String(animeId), status);
        toast.success('Anime adicionado à sua lista!');
      }
    } catch (err) {
      console.error('Erro ao adicionar anime à lista:', err);
      toast.error('Erro ao adicionar anime à lista');
    } finally {
      setIsAddingToList(false);
      setShowStatusMenu(false);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selectedPath = await LocalFileService.selectFolder();
      if (selectedPath && typeof selectedPath === 'string') {
        addFolder(animeId, selectedPath);
        const files = await LocalFileService.listVideoFiles(selectedPath);
        setVideoFiles(LocalFileService.sortEpisodes(files));
        toast.success('Pasta associada com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao selecionar pasta:', err);
      toast.error('Erro ao selecionar pasta');
    }
  };

  const handlePlayEpisode = async (file: FileEntry) => {
    try {
      await LocalFileService.playVideo(file.path ?? '');
      const episodeNumber = LocalFileService.findEpisodeNumber(file.name || '');
      if (episodeNumber && anime) {
        addWatchedEpisode(Number(animeId), episodeNumber);
        
        // Se assistiu a um episódio maior, avança o progresso no MAL e SQLite de forma reativa!
        if (episodeNumber > anime.currentEpisode) {
          await animeService.adicionarAnimeALista(
            String(animeId),
            anime.status,
            anime.rating,
            episodeNumber,
            anime.notes
          );
          queryClient.invalidateQueries({ queryKey: ['anime', id] });
        }
      }
    } catch (err) {
      console.error('Erro ao reproduzir episódio:', err);
      toast.error('Erro ao reproduzir episódio');
    }
  };

  const handleToggleWatched = async (episodeNumber: number) => {
    if (!anime) return;
    
    let nextEpisode = anime.currentEpisode;
    if (isEpisodeWatched(Number(animeId), episodeNumber)) {
      removeWatchedEpisode(Number(animeId), episodeNumber);
      // Se desmarcou o episódio atual, retrocede o progresso
      if (episodeNumber === anime.currentEpisode) {
        nextEpisode = Math.max(0, episodeNumber - 1);
      }
    } else {
      addWatchedEpisode(Number(animeId), episodeNumber);
      // Se marcou um episódio maior, avança o progresso
      if (episodeNumber > anime.currentEpisode) {
        nextEpisode = episodeNumber;
      }
    }

    try {
      // Atualiza o progresso local, MAL e a fila Outbox SaaS
      await animeService.adicionarAnimeALista(
        String(animeId),
        anime.status,
        anime.rating,
        nextEpisode,
        anime.notes
      );
      queryClient.invalidateQueries({ queryKey: ['anime', id] });
    } catch (err) {
      console.error('Erro ao atualizar progresso de episódios:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/20 border-t-white mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-purple-400 animate-spin" style={{ animationDelay: '0.5s' }}></div>
          </div>
          <p className="text-white text-lg font-medium">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (error || queryError || !anime) {
    const displayError = error || (queryError instanceof Error ? queryError.message : String(queryError)) || 'Anime não encontrado';
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md">
          <div className="flex justify-center mb-4">
            <AlertCircle className="w-16 h-16 text-white/50 animate-bounce" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2">Oops!</h2>
          <p className="text-white/80 mb-6">{displayError}</p>
          <button
            onClick={() => navigate(-1)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative">
      {/* Hero Section */}
      <div className="relative h-[500px] overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src={anime.bannerImage || anime.coverImage || '/placeholder-banner.jpg'}
            alt={anime.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-black/60"></div>
        </div>
        
        {/* Floating Navigation */}
        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
          <button
            onClick={() => navigate(-1)}
            className="bg-black/30 hover:bg-black/50 backdrop-blur-md text-white p-3 rounded-full transition-all duration-200 border border-white/20 hover:scale-110 shadow-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          
          <div className="flex items-center space-x-3">
            <button className="bg-black/30 hover:bg-black/50 backdrop-blur-md text-white p-3 rounded-full transition-all duration-200 border border-white/20 hover:scale-110">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <button className="bg-black/30 hover:bg-black/50 backdrop-blur-md text-white p-3 rounded-full transition-all duration-200 border border-white/20 hover:scale-110">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start lg:items-end space-y-6 lg:space-y-0 lg:space-x-8">
              {/* Poster */}
              <div className="flex-shrink-0 relative group">
                <img
                  src={anime.coverImage || '/placeholder.png'}
                  alt={anime.title}
                  className="w-56 h-80 object-cover rounded-2xl shadow-2xl border-2 border-white/20 transform group-hover:scale-105 transition-all duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
              
              {/* Info */}
              <div className="flex-1 text-white space-y-4">
                <div>
                  <h1 className="text-4xl lg:text-6xl font-bold mb-2 drop-shadow-lg bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    {anime.title}
                  </h1>
                  {anime.alternativeTitles && (
                    <p className="text-lg text-white/80 mb-4 drop-shadow-md font-medium">
                      {anime.alternativeTitles[0] || ''}
                    </p>
                  )}
                </div>
                
                {/* Enhanced Quick Stats */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  {anime.rating && (
                    <div className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-full px-4 py-2 border border-yellow-400/30">
                      <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="font-bold text-yellow-100">{anime.rating.toFixed(2)}</span>
                    </div>
                  )}
                  {anime.year && (
                    <span className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium border border-white/20">
                      {anime.year}
                    </span>
                  )}
                  {anime.status && (
                    <span className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium border border-green-400/30">
                      {anime.status}
                    </span>
                  )}
                  {anime.episodes && (
                    <span className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium border border-blue-400/30">
                      {anime.episodes} eps
                    </span>
                  )}
                </div>
                
                {/* Genres */}
                {anime.genres && anime.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {anime.genres.map((genre: string, index: number) => (
                      <span 
                        key={genre} 
                        className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm border border-white/20 hover:scale-105 transition-transform duration-200 font-medium"
                        style={{ 
                          animationDelay: `${index * 0.1}s`,
                          animation: 'fadeInUp 0.5s ease-out forwards'
                        }}
                      >
                        {genre}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enhanced Add to List Button */}
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  disabled={isAddingToList}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-medium transition-all duration-200 border border-white/20 disabled:opacity-50 flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  {isAddingToList ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                      <span>Adicionando...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Adicionar à Lista</span>
                    </>
                  )}
                </button>
                
                {/* Enhanced Status Menu */}
                {showStatusMenu && (
                  <div className="absolute right-0 top-full mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl z-50 border border-white/20 overflow-hidden">
                    <div className="p-2">
                      {statusOptions.map((option, index) => (
                        <button
                          key={option.value}
                          onClick={() => handleAddToList(option.value)}
                          disabled={isAddingToList}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100/80 disabled:opacity-50 flex items-center space-x-3 transition-all duration-200 rounded-xl hover:scale-105"
                          style={{ animationDelay: `${index * 0.05}s` }}
                        >
                          <span className="text-xl">{option.icon}</span>
                          <span className="font-medium">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Synopsis */}
            {anime.synopsis && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl hover:shadow-3xl transition-all duration-300">
                <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-violet-400" />
                  <span>Sinopse</span>
                </h2>
                <p className="text-white/90 leading-relaxed text-lg font-medium">
                  {anime.synopsis}
                </p>
              </div>
            )}
            
            {/* Galeria de Screenshots Modular */}
            <AnimeScreenshots screenshots={anime.screenshots || []} animeTitle={anime.title} />
          </div>
          
          {/* Enhanced Sidebar */}
          <div className="space-y-6">
            {/* Painel de Metadados Modular */}
            <AnimeMetadataPanel anime={anime} />
            
            {anime.related_anime && anime.related_anime.length > 0 && (
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                  <span>Relacionados</span>
                </h2>
                <div className="space-y-4">
                  {anime.related_anime.slice(0, 5).map((related: any, index: number) => (
                    <div key={index} className="flex items-center space-x-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors duration-200 cursor-pointer" onClick={() => navigate(`/anime/${related.node.id}`)}>
                      <img
                        src={related.node?.main_picture?.medium || related.node?.main_picture?.large || '/placeholder.png'}
                        alt={related.node?.title}
                        className="w-14 h-20 object-cover rounded-lg shadow-md"
                      />
                      <div className="flex-1">
                        <p className="text-white font-medium text-sm line-clamp-2 mb-1">
                          {related.node?.title}
                        </p>
                        <p className="text-white/60 text-xs bg-purple-500/20 px-2 py-1 rounded-full inline-block">
                          {related.relation_type_formatted || related.relation_type}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <LocalMediaGrid
        animeId={animeId!}
        anime={anime}
        folderPath={folderPath}
        videoFiles={videoFiles}
        handleSelectFolder={handleSelectFolder}
        handlePlayEpisode={handlePlayEpisode}
        handleToggleWatched={handleToggleWatched}
        isEpisodeWatched={isEpisodeWatched}
      />

      
      {showStatusMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStatusMenu(false)}
        ></div>
      )}
      
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

export default AnimeDetail;