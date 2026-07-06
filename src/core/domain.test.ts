import { describe, test, expect } from 'vitest';
import { 
  extrairNumeroEpisodio, 
  ordenarMidiaporNumero, 
  calcularProgressoPercentual, 
  obterCorStatus 
} from './domain';

describe('Domain Core Logic Tests', () => {
  describe('extrairNumeroEpisodio', () => {
    test('deve extrair números de padrões clássicos SxxExx', () => {
      expect(extrairNumeroEpisodio('Frieren - S01E05 - 1080p.mkv')).toBe(5);
      expect(extrairNumeroEpisodio('Show - S2E12.mp4')).toBe(12);
    });

    test('deve extrair de tags EP ou E', () => {
      expect(extrairNumeroEpisodio('One Piece Ep 1072 [1080p].mkv')).toBe(1072);
      expect(extrairNumeroEpisodio('Bleach E366.mp4')).toBe(366);
      expect(extrairNumeroEpisodio('Naruto ep.220.mp4')).toBe(220);
    });

    test('deve extrair de números isolados ou hifens', () => {
      expect(extrairNumeroEpisodio('[SubGroup] Jujutsu Kaisen - 24 [1080p].mkv')).toBe(24);
      expect(extrairNumeroEpisodio('Chainsaw Man - 12 (Dual Audio).mkv')).toBe(12);
    });

    test('deve extrair de colchetes simples', () => {
      expect(extrairNumeroEpisodio('Anime_Show_[08]_HD.mkv')).toBe(8);
    });

    test('deve retornar null quando não houver número de episódio plausível', () => {
      expect(extrairNumeroEpisodio('OST_Frieren_Full.mp3')).toBeNull();
      expect(extrairNumeroEpisodio('Trailer_Zenith.mp4')).toBeNull();
    });
  });

  describe('ordenarMidiaporNumero', () => {
    test('deve ordenar episódios em ordem crescente numérica', () => {
      const list = [
        { name: 'Episode 03.mkv' },
        { name: 'Episode 01.mkv' },
        { name: 'Episode 02.mkv' }
      ];
      const sorted = ordenarMidiaporNumero(list);
      expect(sorted[0].name).toBe('Episode 01.mkv');
      expect(sorted[1].name).toBe('Episode 02.mkv');
      expect(sorted[2].name).toBe('Episode 03.mkv');
    });

    test('deve jogar itens não numerados (Infinity) para o final', () => {
      const list = [
        { name: 'Trailer.mp4' },
        { name: 'Episode 05.mkv' },
        { name: 'Episode 01.mkv' }
      ];
      const sorted = ordenarMidiaporNumero(list);
      expect(sorted[0].name).toBe('Episode 01.mkv');
      expect(sorted[1].name).toBe('Episode 05.mkv');
      expect(sorted[2].name).toBe('Trailer.mp4');
    });
  });

  describe('calcularProgressoPercentual', () => {
    test('deve calcular porcentagem correta', () => {
      expect(calcularProgressoPercentual(5, 10)).toBe(50);
      expect(calcularProgressoPercentual(3, 12)).toBe(25);
    });

    test('deve lidar com divisões por zero ou valores negativos', () => {
      expect(calcularProgressoPercentual(5, 0)).toBe(0);
      expect(calcularProgressoPercentual(5, -1)).toBe(0);
    });

    test('deve limitar a porcentagem entre 0 e 100', () => {
      expect(calcularProgressoPercentual(-5, 10)).toBe(0);
      expect(calcularProgressoPercentual(15, 10)).toBe(100);
    });
  });

  describe('obterCorStatus', () => {
    test('deve retornar cores semânticas corretas para cada status', () => {
      expect(obterCorStatus('watching')).toBe('#3b82f6');
      expect(obterCorStatus('completed')).toBe('#10b981');
      expect(obterCorStatus('on_hold')).toBe('#f59e0b');
      expect(obterCorStatus('dropped')).toBe('#ef4444');
      expect(obterCorStatus('plan_to_watch')).toBe('#6b7280');
      expect(obterCorStatus('invalid_status')).toBe('#6b7280');
    });
  });
});
