import React from 'react';
import { FolderOpen } from 'lucide-react';
import { FileEntry, LocalFileService } from '../../services/localFileService';
import { AnimeEntry } from '../../types/anime';

interface LocalMediaGridProps {
  animeId: number;
  anime: AnimeEntry;
  folderPath: string | null | undefined;
  videoFiles: FileEntry[];
  handleSelectFolder: () => void;
  handlePlayEpisode: (file: FileEntry) => void;
  handleToggleWatched: (episodeNumber: number) => void;
  isEpisodeWatched: (animeId: number, episodeNumber: number) => boolean;
}

export const LocalMediaGrid: React.FC<LocalMediaGridProps> = ({
  animeId,
  anime,
  folderPath,
  videoFiles,
  handleSelectFolder,
  handlePlayEpisode,
  handleToggleWatched,
  isEpisodeWatched,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-6 pb-12">
      <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <FolderOpen className="w-8 h-8 text-violet-400" />
            <span>Arquivos Locais</span>
          </h2>
          <button
            onClick={handleSelectFolder}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{folderPath ? 'Alterar Pasta' : 'Associar Pasta'}</span>
          </button>
        </div>
        
        {folderPath ? (
          videoFiles.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {videoFiles.map((file, idx) => {
                const episodeNumber = LocalFileService.findEpisodeNumber(file.name || '');
                const isWatched = episodeNumber ? isEpisodeWatched(animeId, episodeNumber) : false;
                
                // Selecionar imagem de fundo baseada nas screenshots do anime
                let cardBgImage = anime.coverImage || '/placeholder.png';
                if (anime.screenshots && anime.screenshots.length > 0) {
                  const screenshotIdx = episodeNumber 
                    ? (episodeNumber - 1) % anime.screenshots.length 
                    : idx % anime.screenshots.length;
                  cardBgImage = anime.screenshots[screenshotIdx];
                }

                // Nome do episódio formatado sem tags de fansubbers
                const cleanTitle = file.name 
                  ? file.name.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/\.[^/.]+$/, '').trim()
                  : 'Episódio';

                return (
                  <div
                    key={file.path}
                    className="relative rounded-2xl overflow-hidden border border-white/10 bg-[#161B22] aspect-video group cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-300 hover:border-violet-500/50 hover:scale-[1.03]"
                    onClick={() => handlePlayEpisode(file)}
                  >
                    {/* Imagem de Fundo do Episódio */}
                    <img 
                      src={cardBgImage} 
                      alt={cleanTitle}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    
                    {/* Gradiente Escuro de Fundo */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/50 z-10" />

                    {/* Círculo superior esquerdo de visto */}
                    <div className="absolute top-3 left-3 z-20 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (episodeNumber) handleToggleWatched(episodeNumber);
                        }}
                        className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all active:scale-90 ${
                          isWatched 
                            ? 'bg-green-500 border-green-400 text-white shadow-lg shadow-green-500/20' 
                            : 'bg-black/50 border-white/20 text-white/70 hover:bg-black/75 hover:text-white'
                        }`}
                        title={isWatched ? 'Marcar como não assistido' : 'Marcar como assistido'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                    </div>

                    {/* Botão de Play centralizado */}
                    <div className="absolute inset-0 flex items-center justify-center z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-violet-600/90 text-white flex items-center justify-center shadow-lg shadow-violet-500/30 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                        <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* Metadados inferiores do Episódio */}
                    <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col justify-end">
                      <h3 className="text-[10px] font-bold tracking-widest text-violet-400 uppercase">
                        Episódio {episodeNumber || (idx + 1)}
                      </h3>
                      <p className="text-white text-xs font-semibold mt-0.5 truncate drop-shadow-md" title={cleanTitle}>
                        {cleanTitle}
                      </p>
                    </div>

                    {/* Barra de progresso inferior discreta */}
                    {isWatched && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-green-500 z-20" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center text-white/60 py-8">
              <p className="text-lg mb-2">Nenhum arquivo de vídeo encontrado nesta pasta</p>
              <p className="text-sm">Certifique-se de que os arquivos de vídeo (.mp4, .mkv, etc.) estão na pasta selecionada.</p>
            </div>
          )
        ) : (
          <div className="text-center text-white/60 py-8">
            <p className="text-lg mb-2">Nenhuma pasta associada</p>
            <p className="text-sm">Clique em "Associar Pasta" para selecionar a pasta com os episódios deste anime.</p>
          </div>
        )}
      </div>
    </div>
  );
};
