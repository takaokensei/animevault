import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MalUserProfile } from '../database/schema';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isLoggedIn: boolean;
  userProfile: MalUserProfile | null;
  login: (tokens: { accessToken: string; refreshToken: string }, profile: MalUserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isLoggedIn: false,
      userProfile: null,
      login: (tokens, profile) => set({ 
        accessToken: tokens.accessToken, 
        refreshToken: tokens.refreshToken,
        isLoggedIn: true,
        userProfile: profile,
      }),
      logout: () => set({ accessToken: null, refreshToken: null, isLoggedIn: false, userProfile: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        userProfile: state.userProfile,
      }),
    }
  )
); 