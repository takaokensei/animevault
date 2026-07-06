import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'dark' | 'tokyo-night' | 'vampiric' | 'dracula' | 'swiss-light';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const themesOrder: Theme[] = ['dark', 'tokyo-night', 'vampiric', 'dracula', 'swiss-light'];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        document.documentElement.setAttribute('data-theme', theme);
      },
      toggleTheme: () => {
        const currentTheme = get().theme;
        const currentIndex = themesOrder.indexOf(currentTheme);
        const nextIndex = (currentIndex + 1) % themesOrder.length;
        const nextTheme = themesOrder[nextIndex];
        
        set({ theme: nextTheme });
        document.documentElement.setAttribute('data-theme', nextTheme);
      }
    }),
    { 
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.theme);
        }
      }
    }
  )
);
