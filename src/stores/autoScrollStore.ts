import { create } from 'zustand';

interface AutoScrollState {
  autoScroll: boolean;
  userScrolledUp: boolean; // Novo: para saber se foi o usuário que rolou
  setAutoScroll: (active: boolean) => void;
  setUserScrolledUp: (scrolled: boolean) => void;
}

export const useAutoScrollStore = create<AutoScrollState>((set) => ({
  autoScroll: true,
  userScrolledUp: false,
  setAutoScroll: (active) => set({ autoScroll: active }),
  setUserScrolledUp: (scrolled) => set({ userScrolledUp: scrolled }),
}));