import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useSaasAuthStore } from '../../stores/saasAuthStore';
import { syncService } from '../../services/syncService';
import { useQuery } from '@tanstack/react-query';

/**
 * SyncLogPanel — painel collapsível que mostra o estado atual da fila de outbox
 * e o horário da última sincronização bem-sucedida com o Zenith SaaS.
 */
export function SyncLogPanel() {
  const [expanded, setExpanded] = useState(false);
  const isSyncing = useSaasAuthStore(s => s.isSyncing);
  const lastSyncedAt = useSaasAuthStore(s => s.lastSyncedAt);
  const isSaasLoggedIn = useSaasAuthStore(s => s.isSaasLoggedIn);

  // Busca os eventos pendentes da fila de outbox em tempo real
  const { data: pendingEvents = [], refetch } = useQuery({
    queryKey: ['sync-outbox-pending'],
    queryFn: () => syncService.getPendingEvents(),
    refetchInterval: isSyncing ? 1000 : 5000, // Atualiza mais rápido durante sync
    enabled: isSaasLoggedIn && expanded,
  });

  if (!isSaasLoggedIn) return null;

  const statusColor = isSyncing
    ? 'text-violet-400'
    : pendingEvents.length > 0
      ? 'text-amber-400'
      : 'text-emerald-400';

  const statusLabel = isSyncing
    ? 'Sincronizando…'
    : pendingEvents.length > 0
      ? `${pendingEvents.length} evento(s) pendente(s)`
      : 'Sincronizado';

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
      {/* Header clicável */}
      <button
        onClick={() => { setExpanded(v => !v); if (!expanded) refetch(); }}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Indicador de status animado */}
          <div className="relative">
            <div
              className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-violet-400' : pendingEvents.length > 0 ? 'bg-amber-400' : 'bg-emerald-400'}`}
            />
            {isSyncing && (
              <div className="absolute inset-0 rounded-full bg-violet-400 animate-ping opacity-75" />
            )}
          </div>
          <span className="text-sm font-medium text-white/70">Status de Sincronização</span>
          <span className={`text-xs font-semibold ${statusColor}`}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-3">
          {lastSyncedAt && (
            <span className="text-xs text-white/30">
              Última sync: {new Date(lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4 text-white/30"
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </div>
      </button>

      {/* Detalhes expansíveis */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t border-white/10 p-4 space-y-3">
              {pendingEvents.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-emerald-400/70">
                  <span>✅</span>
                  <span>Fila de outbox vazia — tudo sincronizado.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">
                    Fila de Outbox ({pendingEvents.length})
                  </p>
                  {pendingEvents.slice(0, 5).map(event => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between bg-black/20 rounded-xl px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${event.status === 'FAILED' ? 'bg-red-400' : 'bg-amber-400'}`} />
                        <span className="text-xs text-white/60 font-mono">{event.action}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/30">
                        <span>{event.attempts > 0 ? `${event.attempts} tentativa(s)` : 'Pendente'}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          event.status === 'FAILED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {pendingEvents.length > 5 && (
                    <p className="text-xs text-white/30 text-center">
                      +{pendingEvents.length - 5} eventos adicionais
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
