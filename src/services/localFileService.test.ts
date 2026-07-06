import { describe, it, expect } from 'vitest';
import { LocalFileService, FileEntry } from './localFileService';

describe('LocalFileService', () => {
  describe('findEpisodeNumber', () => {
    it('deve extrair número de episódio no formato padrão com traço', () => {
      expect(LocalFileService.findEpisodeNumber('Shingeki no Kyojin - 03.mkv')).toBe(3);
    });

    it('deve extrair número de episódio no formato com colchetes de Fansub', () => {
      expect(LocalFileService.findEpisodeNumber('[Fansub] Naruto Shippuden - 120 [1080p].mkv')).toBe(120);
    });

    it('deve extrair número de episódio no formato com "Ep" ou "Episodio"', () => {
      expect(LocalFileService.findEpisodeNumber('One Piece Ep 982 PT-BR.mp4')).toBe(982);
      expect(LocalFileService.findEpisodeNumber('Demon Slayer - Episodio 05 [1080p].mp4')).toBe(5);
    });

    it('deve extrair número de episódio no formato com underline e EP', () => {
      expect(LocalFileService.findEpisodeNumber('Bleach_Ep_24_HD.mp4')).toBe(24);
    });

    it('deve extrair número de episódio no formato em parênteses', () => {
      expect(LocalFileService.findEpisodeNumber('Fairy Tail (09) PTBR.mkv')).toBe(9);
    });

    it('deve retornar null quando não houver indicação de número de episódio', () => {
      expect(LocalFileService.findEpisodeNumber('Sword Art Online - Trailer Promocional.mp4')).toBe(null);
    });
  });

  describe('sortEpisodes', () => {
    it('deve ordenar episódios em ordem numérica crescente', () => {
      const files: FileEntry[] = [
        { name: '[Sub] Anime - 03.mkv', path: 'C:/anime/03.mkv' },
        { name: '[Sub] Anime - 01.mkv', path: 'C:/anime/01.mkv' },
        { name: '[Sub] Anime - 02.mkv', path: 'C:/anime/02.mkv' },
      ];

      const sorted = LocalFileService.sortEpisodes(files);
      
      expect(sorted[0].name).toBe('[Sub] Anime - 01.mkv');
      expect(sorted[1].name).toBe('[Sub] Anime - 02.mkv');
      expect(sorted[2].name).toBe('[Sub] Anime - 03.mkv');
    });
  });

  describe('matchEpisodeFiles', () => {
    it('deve filtrar arquivos do episódio correspondente', () => {
      const files: FileEntry[] = [
        { name: 'Anime - 01.mkv', path: 'C:/anime/01.mkv' },
        { name: 'Anime - 02.mkv', path: 'C:/anime/02.mkv' },
        { name: 'Anime - 01 [Dublado].mkv', path: 'C:/anime/01_dub.mkv' },
      ];

      const matched = LocalFileService.matchEpisodeFiles(files, 1);
      
      expect(matched.length).toBe(2);
      expect(matched[0].name).toBe('Anime - 01.mkv');
      expect(matched[1].name).toBe('Anime - 01 [Dublado].mkv');
    });
  });
});
