import { open, invoke, readDir } from './tauriService';

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
  static async playVideo(filePath: string) {
    try {
      await invoke('plugin:shell|open', { path: filePath });
    } catch (error) {
      console.error('Erro ao reproduzir vídeo:', error);
    }
  }

  static findEpisodeNumber(filename: string): number | null {
    const patterns = [
      /[eE]p(?:isodio)?[\s._-]*(\d+)/i,
      /[\s._-](\d{2,3})[\s._-]/,
      /\[(\d{2,3})\]/,
      /\((\d{2,3})\)/
    ];

    for (const pattern of patterns) {
      const matches = filename.match(pattern);
      if (matches) {
        return parseInt(matches[1]);
      }
    }
    return null;
  }

  static sortEpisodes(files: FileEntry[]): FileEntry[] {
    return files.sort((a, b) => {
      const numA = this.findEpisodeNumber(a.name || '') || 0;
      const numB = this.findEpisodeNumber(b.name || '') || 0;
      return numA - numB;
    });
  }

  static matchEpisodeFiles(files: FileEntry[], episodeNumber: number): FileEntry[] {
    return files.filter(file => {
      const epNum = this.findEpisodeNumber(file.name || '');
      return epNum === episodeNumber;
    });
  }
}