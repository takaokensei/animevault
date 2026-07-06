import React, { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import { Image as ImageIcon } from 'lucide-react';

interface AnimeScreenshotsProps {
  screenshots: string[];
  animeTitle: string;
}

export const AnimeScreenshots: React.FC<AnimeScreenshotsProps> = ({ screenshots, animeTitle }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [index, setIndex] = useState(0);

  if (!screenshots || screenshots.length === 0) return null;

  // Filtra imagens vazias ou inválidas
  const validScreenshots = screenshots.filter(src => src && src.trim().length > 0);
  if (validScreenshots.length === 0) return null;

  const slides = validScreenshots.map(src => ({ src }));

  const openLightbox = (idx: number) => {
    setIndex(idx);
    setIsOpen(true);
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
          <ImageIcon className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Galeria de Imagens</h3>
          <p className="text-white/40 text-xs mt-0.5">Capturas de tela e cenas promocionais do anime.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {validScreenshots.map((src, idx) => (
          <div
            key={idx}
            onClick={() => openLightbox(idx)}
            className="group relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-white/2 cursor-pointer shadow-md hover:border-violet-500/30 transition-all duration-300 transform hover:scale-[1.02]"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#080b14]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3 z-10">
              <span className="text-[10px] font-bold text-white tracking-wider uppercase">Visualizar Imagem</span>
            </div>
            
            <img
              src={src}
              alt={`Screenshot ${idx + 1} de ${animeTitle}`}
              className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
              onError={(e) => {
                // Esconde imagem com erro para não quebrar o layout
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        ))}
      </div>

      <Lightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        index={index}
        slides={slides}
        plugins={[Zoom]}
      />
    </div>
  );
};
