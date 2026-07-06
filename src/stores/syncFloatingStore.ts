// animevault/src/stores/syncFloatingStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ... (interface SyncFloatingState - mantenha a rehydratePausedState que adicionamos)
interface SyncFloatingState {
  syncProgress: { current: number; total: number; title?: string } | null;
  syncLoading: boolean;
  minimized: boolean;
  isPaused: boolean;
  position: { x: number; y: number };
  cancelRequested: boolean;
  isSyncing: boolean;
  setSyncProgress: (progress: { current: number; total: number; title?: string } | null) => void;
  setSyncLoading: (loading: boolean) => void;
  setMinimized: (min: boolean) => void;
  setPosition: (pos: { x: number; y: number }) => void;
  setCancelRequested: (cancel: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  rehydratePausedState: (progress: { current: number; total: number; title?: string }) => void; 
  startSync: () => void;
  pauseSync: () => void;
  resumeSync: () => void;
  cancelSync: () => void;
  completeSync: () => void;
}


export const useSyncFloatingStore = create<SyncFloatingState>()(
  persist(
    (set, get) => ({
      syncProgress: null,
      syncLoading: false,
      minimized: false,
      isPaused: false,
      position: { x: 0, y: 0 },
      cancelRequested: false,
      isSyncing: false,

      // Ação para restaurar o estado pausado corretamente.
      rehydratePausedState: (progress) => {
        set({
          isPaused: true,
          syncLoading: false, // Correto: loading é false quando pausado.
          isSyncing: true,
          syncProgress: progress,
          cancelRequested: false,
        });
      },

      setSyncProgress: (progress) => {
        set({ syncProgress: progress });
      },
      setSyncLoading: (loading) => set({ syncLoading: loading }),
      setMinimized: (min) => set({ minimized: min }),
      setPosition: (pos) => set({ position: pos }),
      setCancelRequested: (cancel) => set({ cancelRequested: cancel }),
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      startSync: () => {
        if (get().isSyncing || get().isPaused) return;
        localStorage.removeItem('syncState');
        set({
          syncLoading: true,
          isPaused: false,
          cancelRequested: false,
          isSyncing: true,
          syncProgress: { current: 0, total: 0, title: 'Iniciando...' },
        });
      },

      pauseSync: () => {
        if (!get().isSyncing) return;
        const currentProgress = get().syncProgress;

        console.log('[SyncFloating] Pausando sincronização');
        
        // Define o estado correto para "pausado"
        set({ 
          isPaused: true,
          syncLoading: false, // Importante: loading é false
          isSyncing: true,
        });
          
        // Salva o estado para recuperação após F5
        const currentState = {
          isPaused: true,
          syncProgress: currentProgress,
          lastSync: Date.now()
        };
        localStorage.setItem('syncState', JSON.stringify(currentState));
      },

      resumeSync: () => {
        if (!get().isPaused) return;
        console.log('[SyncFloating] Retomando sincronização');
        const currentProgress = get().syncProgress;
        set({
          isPaused: false,
          syncLoading: true, // Correto: loading é true ao retomar
          cancelRequested: false,
          isSyncing: true,
          syncProgress: currentProgress
        });
        localStorage.removeItem('syncState');
      },

      cancelSync: () => {
        localStorage.removeItem('syncState');
        set({
          cancelRequested: true,
          syncLoading: false,
          isPaused: false,
          isSyncing: false,
          syncProgress: null,
        });
        setTimeout(() => set({ cancelRequested: false }), 500);
      },

      completeSync: () => {
        localStorage.removeItem('syncState');
        set({
          syncLoading: false,
          isPaused: false,
          isSyncing: false,
          cancelRequested: false,
          syncProgress: null,
        });
      }
    }),
    {
      name: 'sync-floating-storage',
      // ========== CORREÇÃO PRINCIPAL APLICADA AQUI ==========
      // Remova o `customStorage` completamente.
      // Deixe o Zustand usar o `localStorage` padrão.
      // A lógica de reidratação específica está agora no `useEffect` do componente.
    }
  )
);