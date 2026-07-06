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
  loginSaas: (user: ZenithUser, token: string) => void;
  logoutSaas: () => void;
}

export const useSaasAuthStore = create<SaasAuthState>()(
  persist(
    (set) => ({
      zenithUser: null,
      zenithToken: null,
      isSaasLoggedIn: false,
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
    }),
    {
      name: 'saas-auth-storage',
    }
  )
);
