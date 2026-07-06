/**
 * Algoritmo de busca difusa (Fuzzy Match) de alta performance para SaaS.
 * Verifica se os caracteres da busca aparecem em ordem sequencial no texto alvo,
 * permitindo ignorar erros de digitação e espaçamento (ex: "fmab" encontra "Fullmetal Alchemist: Brotherhood").
 */
export function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true;
  if (!target) return false;
  
  const q = query.toLowerCase().trim().replace(/\s+/g, '');
  const t = target.toLowerCase();
  
  // 1. Caso direto (melhor performance)
  if (t.includes(q)) return true;
  
  // 2. Correspondência de sequência de caracteres
  let qIdx = 0;
  let tIdx = 0;
  
  while (qIdx < q.length && tIdx < t.length) {
    if (q[qIdx] === t[tIdx]) {
      qIdx++;
    }
    tIdx++;
  }
  
  return qIdx === q.length;
}
