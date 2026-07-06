import { open, invoke, readDir } from './tauriService';
import { extrairNumeroEpisodio, ordenarMidiaporNumero } from '../core/domain';

export type FileEntry = {
  name?: string;
  path: string; // O caminho é essencial
  children?: FileEntry[]; // A presença de 'children' indica que é um diretório
  [key: string]: any;
};

export class LocalFileService {
  /**
   * Abre um diálogo para o usuário selecionar UMA PASTA.
   */
  static async selectFolder(): Promise<string | null> {
    const selected = await open({
      directory: true, // Continua sendo a seleção de uma pasta
      multiple: false,
      title: 'Selecione a pasta do anime', // Um título ajuda o usuário a entender
    });

    if (Array.isArray(selected) || selected === null) {
      return null;
    }
    return selected;
  }

  /**
   * Lista apenas os ARQUIVOS de vídeo dentro de um caminho de pasta especificado.
   */
  static async listVideoFiles(folderPath: string): Promise<FileEntry[]> {
    try {
      const entries = await readDir(folderPath);

      // Filtra as DirEntries e converte para FileEntry com caminho absoluto
      return entries
        .filter((entry) => entry.isFile && entry.name?.match(/\.(mp4|mkv|avi)$/i))
        .map((entry) => ({
          name: entry.name,
          path: `${folderPath}\\${entry.name}`, // Concatenando para compor o path completo no Windows
        }));
    } catch (error) {
      console.error('Erro ao listar arquivos de vídeo:', error);
      return [];
    }
  }

  // ... (seus outros métodos como playVideo, findEpisodeNumber, etc. continuam os mesmos)
  static async playVideo(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verifica se o arquivo ainda existe físicamente antes de chamar o player
      // Evita erros silenciosos de arquivos movidos ou deletados
      const exists = await invoke<boolean>('check_file_exists', { path: filePath });

      if (!exists) {
        const msg = `Arquivo não encontrado: ${filePath}`;
        console.warn(`[LocalFileService] ${msg}`);
        return { success: false, error: 'Arquivo de vídeo não encontrado. Ele pode ter sido movido ou deletado.' };
      }

      await invoke('plugin:shell|open', { path: filePath });
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('[LocalFileService] Erro ao reproduzir vídeo:', msg);
      return { success: false, error: `Falha ao abrir o player: ${msg}` };
    }
  }

  static findEpisodeNumber(filename: string): number | null {
    return extrairNumeroEpisodio(filename);
  }

  static sortEpisodes(files: FileEntry[]): FileEntry[] {
    // Garantimos que a chave name exista ao passar para o domain puro
    const mapped = files.map(f => ({ ...f, name: f.name || '' }));
    return ordenarMidiaporNumero(mapped);
  }

  static matchEpisodeFiles(files: FileEntry[], episodeNumber: number): FileEntry[] {
    return files.filter(file => {
      const epNum = this.findEpisodeNumber(file.name || '');
      return epNum === episodeNumber;
    });
  }
}