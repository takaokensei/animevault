import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ZenithUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  createdAt: string;
}

interface SaasAuthState {
  zenithUser: ZenithUser | null;
  zenithToken: string | null;
  isSaasLoggedIn: boolean;
  /** Indica se o syncService está ativamente processando a fila de outbox. */
  isSyncing: boolean;
  lastSyncedAt: string | null;
  loginSaas: (user: ZenithUser, token: string) => void;
  logoutSaas: () => void;
  setSyncing: (value: boolean) => void;
  setLastSyncedAt: (ts: string) => void;
}

export const useSaasAuthStore = create<SaasAuthState>()(
  persist(
    (set) => ({
      zenithUser: null,
      zenithToken: null,
      isSaasLoggedIn: false,
      isSyncing: false,
      lastSyncedAt: null,
      loginSaas: (user, token) => set({
        zenithUser: user,
        zenithToken: token,
        isSaasLoggedIn: true,
      }),
      logoutSaas: () => set({
        zenithUser: null,
        zenithToken: null,
        isSaasLoggedIn: false,
      }),
      setSyncing: (value) => set({ isSyncing: value }),
      setLastSyncedAt: (ts) => set({ lastSyncedAt: ts }),
    }),
    {
      name: 'saas-auth-storage',
      // isSyncing é transiente — não persiste entre sessões
      partialize: (state) => ({
        zenithUser: state.zenithUser,
        isSaasLoggedIn: state.isSaasLoggedIn,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
