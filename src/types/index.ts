export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;   // per 100g
  protein: number;    // per 100g (grams)
  carbs: number;      // per 100g (grams)
  fat: number;        // per 100g (grams)
  source?: 'off' | 'estimate'; // Open Food Facts or estimated
}

export interface MealEntry {
  id: string;
  foodItem: FoodItem;
  grams: number;
  mealType: MealType;
  timestamp: number;  // Unix ms
  date: string;       // YYYY-MM-DD
}

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DetectedFood {
  name: string;
  estimatedGrams: number;
  foodItem?: FoodItem;  // resolved after nutrition fetch
  loading?: boolean;
  error?: string;
}

export interface DailyLog {
  date: string;
  entries: MealEntry[];
}

export type GoalPreset = 'weightLoss' | 'maintenance' | 'muscleGain';

export const GOAL_PRESETS: Record<GoalPreset, Goals> = {
  weightLoss: { calories: 1600, protein: 130, carbs: 150, fat: 55 },
  maintenance: { calories: 2000, protein: 100, carbs: 250, fat: 65 },
  muscleGain: { calories: 2500, protein: 180, carbs: 300, fat: 70 },
};

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

// ─── Body measurement types ───────────────────────────────────────────────────

export interface BodyMeasurement {
  id: string;
  date: string;          // YYYY-MM-DD
  weight: number;        // kg
  height?: number;       // cm
  bodyFat?: number;      // %
  muscleMass?: number;   // kg (computed if bodyFat known: weight * (1 - bodyFat/100))
  waist?: number;        // cm
  chest?: number;        // cm
  leftArm?: number;      // cm
  rightArm?: number;     // cm
  notes?: string;
}

// ─── Workout types ────────────────────────────────────────────────────────────

export type GroupType = 'biset' | 'superset';

export interface WorkoutSet {
  id: string;
  weight: string | null;  // supports "80" or "80-60-50" for drop sets
  reps: string | null;    // supports "10" or "10-8-6" for drop sets
  isDropSet: boolean;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
  groupId?: string;     // exercises with same groupId are done together
  groupType?: GroupType;
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string;         // YYYY-MM-DD
  exercises: WorkoutExercise[];
  completedAt?: number; // Unix ms
  notes?: string;
}

// ─── Workout Plan types ────────────────────────────────────────────────────────

export interface WorkoutPlanExercise {
  id: string;
  name: string;
  sets: number;          // number of sets
  groupId?: string;
  groupType?: GroupType;
}

export interface WorkoutPlanSession {
  id: string;
  name: string;          // "Push", "Pull", "Legs"
  exercises: WorkoutPlanExercise[];
}

export interface WorkoutPlan {
  id: string;
  name: string;          // "PPL", "Full Body", etc.
  sessions: WorkoutPlanSession[];
  createdAt: number;     // Unix ms
}
