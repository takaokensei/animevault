import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AnimeEntry } from '../../types/anime';

interface ActivityCalendarProps {
  animes: AnimeEntry[];
}

interface DayBucket {
  date: string;
  count: number;
}

const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DAYS_PT = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

function getIntensity(count: number, max: number): string {
  if (count === 0) return 'bg-white/5';
  const ratio = count / max;
  if (ratio < 0.25) return 'bg-violet-900/60';
  if (ratio < 0.5) return 'bg-violet-700/70';
  if (ratio < 0.75) return 'bg-violet-500/80';
  return 'bg-violet-400';
}

export const ActivityCalendar: React.FC<ActivityCalendarProps> = ({ animes }) => {
  const { buckets, maxCount, weeks, monthLabels } = useMemo(() => {
    // Gera os últimos 365 dias
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364);
    // Alinha para Domingo
    startDate.setDate(startDate.getDate() - startDate.getDay());

    // Mapeia lastWatched para dias
    const countMap: Record<string, number> = {};
    animes.forEach(anime => {
      if (anime.lastWatched) {
        const d = new Date(anime.lastWatched).toISOString().split('T')[0];
        countMap[d] = (countMap[d] || 0) + 1;
      }
    });

    const allDays: DayBucket[] = [];
    const cursor = new Date(startDate);
    while (cursor <= today) {
      const key = cursor.toISOString().split('T')[0];
      allDays.push({ date: key, count: countMap[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    const max = Math.max(...allDays.map(d => d.count), 1);

    // Divide em semanas (arrays de 7 dias)
    const weeksArr: DayBucket[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
      weeksArr.push(allDays.slice(i, i + 7));
    }

    // Gera rótulos de mês
    const labels: { label: string; weekIdx: number }[] = [];
    let lastMonth = -1;
    weeksArr.forEach((week, wi) => {
      const month = new Date(week[0].date).getMonth();
      if (month !== lastMonth) {
        labels.push({ label: MONTHS_PT[month], weekIdx: wi });
        lastMonth = month;
      }
    });

    return { buckets: allDays, maxCount: max, weeks: weeksArr, monthLabels: labels };
  }, [animes]);

  const totalActive = buckets.filter(d => d.count > 0).length;

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <span>📅</span> Atividade no Último Ano
        </h3>
        <span className="text-xs text-white/30">{totalActive} dias ativos</span>
      </div>

      <div className="overflow-x-auto pb-1">
        {/* Labels dos meses */}
        <div className="flex gap-1 mb-1 pl-5">
          {monthLabels.map(({ label, weekIdx }) => (
            <div
              key={`${label}-${weekIdx}`}
              className="text-[10px] text-white/30 min-w-0"
              style={{ marginLeft: weekIdx === 0 ? 0 : `${weekIdx * 13}px`, position: 'relative' }}
            >
              {label}
            </div>
          ))}
        </div>

        <div className="flex gap-1">
          {/* Labels dos dias */}
          <div className="flex flex-col gap-1 mr-1">
            {DAYS_PT.map((d, i) => (
              <div key={i} className="text-[10px] text-white/20 w-3 h-3 flex items-center justify-center">
                {i % 2 === 0 ? d : ''}
              </div>
            ))}
          </div>

          {/* Grid de semanas */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {week.map((day, di) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: wi * 0.003 + di * 0.001, duration: 0.2 }}
                  title={day.count > 0 ? `${day.date}: ${day.count} anime(s) atualizado(s)` : day.date}
                  className={`w-3 h-3 rounded-sm cursor-default transition-all duration-200 hover:scale-125 hover:brightness-125 ${getIntensity(day.count, maxCount)}`}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex items-center gap-1.5 mt-3 justify-end">
          <span className="text-[10px] text-white/30">Menos</span>
          {[0, 0.2, 0.4, 0.7, 1].map((r) => (
            <div
              key={r}
              className={`w-3 h-3 rounded-sm ${getIntensity(r * maxCount, maxCount)}`}
            />
          ))}
          <span className="text-[10px] text-white/30">Mais</span>
        </div>
      </div>
    </div>
  );
};
