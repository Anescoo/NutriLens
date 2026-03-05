import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Goals } from '@/types';

interface GoalsState {
  goals: Goals;
  setGoals: (goals: Goals) => void;
  resetGoals: () => void;
}

const DEFAULT_GOALS: Goals = {
  calories: 2000,
  protein: 100,
  carbs: 250,
  fat: 65,
};

export const useGoalsStore = create<GoalsState>()(
  persist(
    (set) => ({
      goals: DEFAULT_GOALS,
      setGoals: (goals) => set({ goals }),
      resetGoals: () => set({ goals: DEFAULT_GOALS }),
    }),
    {
      name: 'nutrilens-goals',
    }
  )
);
