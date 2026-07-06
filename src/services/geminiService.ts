import { AnimeEntry } from '../types/anime';

// API key must be set in .env as VITE_GEMINI_API_KEY
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

if (!GEMINI_API_KEY) {
  console.warn('[GeminiService] VITE_GEMINI_API_KEY not set in .env');
}

export async function askGemini(prompt: string): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('A API Key do Gemini não foi configurada no arquivo .env');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    }
  );
  if (!res.ok) throw new Error(`Falha na requisição ao Gemini: ${res.status}`);
  const data = await res.json();
  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ||
    data.candidates?.[0]?.content?.text ||
    "Sem resposta da IA"
  );
}

export interface AnimeRecommendation {
  title: string;
  reason: string;
  genres: string[];
}

/**
 * Obtém recomendações personalizadas com base nos animes mais bem avaliados pelo usuário no banco local
 */
export async function obterRecomendacoesIA(animesUsuario: AnimeEntry[]): Promise<AnimeRecommendation[]> {
  const animesFavoritos = animesUsuario
    .filter(a => a.rating && a.rating >= 8)
    .slice(0, 15)
    .map(a => `${a.title} (Nota: ${a.rating})`)
    .join(', ');

  if (!animesFavoritos) {
    return [];
  }

  const prompt = `
    Abaixo está a lista de animes favoritos de um usuário (com notas altas atribuídas por ele):
    [${animesFavoritos}]

    Recomende 4 animes similares que NÃO estão nessa lista.
    Para cada recomendação, forneça o título, uma justificativa de 1 a 2 linhas em português (Brasil) explicando a relação com os animes favoritos dele, e até 3 gêneros.
    Retorne a resposta EXCLUSIVAMENTE em formato JSON puro, sem formatação markdown (NÃO use cercas de código como \`\`\`json ou \`\`\`), contendo uma lista de objetos com a seguinte estrutura de tipos exata:
    [
      { "title": "Nome do Anime", "reason": "Sua explicação em português...", "genres": ["Gênero1", "Gênero2"] }
    ]
  `;

  try {
    const rawResponse = await askGemini(prompt);
    // Remove qualquer envelope markdown que o LLM possa ter colocado por engano
    const cleaned = rawResponse
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    
    return JSON.parse(cleaned) as AnimeRecommendation[];
  } catch (error) {
    console.error('Erro ao processar recomendações do Gemini:', error);
    throw error;
  }
}
