/**
 * Extrai o número do episódio com base em padrões comuns de nomes de arquivos de anime.
 * Ex: S01E05 -> 5, Ep 05 -> 5, - 12 [Sub] -> 12
 */
export function extrairNumeroEpisodio(nomeArquivo: string): number | null {
  const patterns = [
    /[Ss]\d+[Ee](\d+)/, // S01E05 -> 5
    /[Ee][Pp]?\s*(\d+)/, // Ep 05, E05 -> 5
    /-\s*(\d+)\s*(\[|\()/, // - 05 [Sub] -> 5
    /\s+(\d+)\s*(\[|\()/, // 05 (1080p) -> 5
    /\[(\d+)\]/, // [05] -> 5
    /(?:^|[^a-zA-Z0-9])(\d+)(?:$|[^a-zA-Z0-9])/ // qualquer número isolado
  ];

  for (const pattern of patterns) {
    const match = nomeArquivo.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

/**
 * Ordena uma lista de arquivos de mídia com base no número de episódio extraído do nome.
 */
export function ordenarMidiaporNumero<T extends { name: string }>(arquivos: T[]): T[] {
  return [...arquivos].sort((a, b) => {
    const epA = extrairNumeroEpisodio(a.name) ?? Infinity;
    const epB = extrairNumeroEpisodio(b.name) ?? Infinity;
    
    if (epA === epB) {
      return a.name.localeCompare(b.name);
    }
    return epA - epB;
  });
}

/**
 * Calcula a porcentagem do progresso assistido.
 */
export function calcularProgressoPercentual(current: number, total: number): number {
  if (!total || total <= 0) return 0;
  const percent = Math.round((current / total) * 100);
  return Math.max(0, Math.min(100, percent));
}

/**
 * Retorna as classes ou cores correspondentes a cada status de anime.
 */
export function obterCorStatus(status: string): string {
  switch (status) {
    case 'watching':
      return '#3b82f6'; // Azul
    case 'completed':
      return '#10b981'; // Verde
    case 'on_hold':
      return '#f59e0b'; // Laranja
    case 'dropped':
      return '#ef4444'; // Vermelho
    case 'plan_to_watch':
    default:
      return '#6b7280'; // Cinza
  }
}
