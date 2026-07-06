import React, { useState } from 'react';
import { obterRecomendacoesIA, AnimeRecommendation } from '../../services/geminiService';
import { AnimeEntry } from '../../types/anime';
import { Sparkles } from 'lucide-react';

interface GeminiRecommendationsProps {
  animes: AnimeEntry[];
  navigate: (path: string) => void;
}

export const GeminiRecommendations: React.FC<GeminiRecommendationsProps> = ({ animes, navigate }) => {
  const [recommendations, setRecommendations] = useState<AnimeRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);

  const handleGetRecommendations = async () => {
    setLoadingRecs(true);
    setRecsError(null);
    try {
      const recs = await obterRecomendacoesIA(animes);
      if (recs.length === 0) {
        setRecsError('Sua biblioteca precisa de mais animes favoritos avaliados (nota 8 ou superior) para a IA calibrar seu gosto!');
      } else {
        setRecommendations(recs);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com a API do Gemini. Verifique se o arquivo .env possui uma chave de API válida.';
      setRecsError(msg);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-violet-400" />
            <span>Recomendações da IA (Gemini)</span>
          </h2>
          <p className="text-white/50 text-sm mt-1">Análise inteligente baseada nos animes que você deu notas mais altas.</p>
        </div>
        
        <button
          onClick={handleGetRecommendations}
          disabled={loadingRecs}
          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full font-semibold text-sm transition-all shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2 self-start md:self-auto"
        >
          {loadingRecs ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Analisando biblioteca...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Gerar Recomendações</span>
            </>
          )}
        </button>
      </div>

      {recsError && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm mb-4">
          {recsError}
        </div>
      )}

      {recommendations.length === 0 && !loadingRecs && !recsError && (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/2">
          <Sparkles className="w-12 h-12 text-white/20 mb-3" />
          <h3 className="text-white font-semibold text-sm">Pronto para encontrar seu próximo anime?</h3>
          <p className="text-white/40 text-xs max-w-sm mt-1">Clique no botão acima para a Inteligência Artificial mapear sua biblioteca e sugerir títulos perfeitos para você.</p>
        </div>
      )}

      {loadingRecs && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-32 bg-white/5 rounded-2xl border border-white/5 p-5 flex flex-col justify-between">
              <div className="h-4 bg-white/10 rounded w-1/3" />
              <div className="h-3 bg-white/10 rounded w-full mt-2" />
              <div className="h-3 bg-white/10 rounded w-5/6 mt-1" />
              <div className="flex gap-2 mt-4">
                <div className="h-5 bg-white/10 rounded-full w-12" />
                <div className="h-5 bg-white/10 rounded-full w-12" />
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && !loadingRecs && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec, index) => (
            <div 
              key={index} 
              className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="text-xs font-mono text-violet-400">0{index + 1}</span>
                  <span>{rec.title}</span>
                </h3>
                <p className="text-white/60 text-xs mt-2 leading-relaxed">{rec.reason}</p>
              </div>
              
              <div className="flex items-center justify-between gap-4 mt-6">
                <div className="flex flex-wrap gap-1.5">
                  {rec.genres.map(g => (
                    <span key={g} className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                      {g}
                    </span>
                  ))}
                </div>
                
                <button
                  onClick={() => navigate(`/?search=${encodeURIComponent(rec.title)}`)}
                  className="px-3.5 py-1.5 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-full text-xs font-semibold tracking-tight transition-all active:scale-95"
                >
                  Buscar no MAL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
