import { create } from 'zustand';
import type { Goals } from '@/types';

const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 100,
  carbs: 250,
  fat: 65,
};

interface GoalsState {
  goals: Goals;
  isLoading: boolean;
  loadGoals: () => Promise<void>;
  setGoals: (goals: Goals) => Promise<void>;
  resetGoals: () => Promise<void>;
}

export const useGoalsStore = create<GoalsState>()((set) => ({
  goals: DEFAULT_GOALS,
  isLoading: false,

  loadGoals: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/goals');
      if (res.ok) {
        const data = await res.json();
        set({ goals: { calories: data.calories, protein: data.protein, carbs: data.carbs, fat: data.fat } });
      }
    } catch {
      // keep defaults
    } finally {
      set({ isLoading: false });
    }
  },

  setGoals: async (goals: Goals) => {
    set({ goals });
    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goals),
    });
  },

  resetGoals: async () => {
    set({ goals: DEFAULT_GOALS });
    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(DEFAULT_GOALS),
    });
  },
}));
