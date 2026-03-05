import { openDB, type IDBPDatabase } from 'idb';
import type { MealEntry, DailyLog, WorkoutSession, BodyMeasurement } from '@/types';

const DB_NAME = 'nutrilens-db';
const DB_VERSION = 3;
const MEALS_STORE = 'meals';
const WORKOUTS_STORE = 'workout-sessions';
const BODY_STORE = 'body-measurements';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(MEALS_STORE, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        if (oldVersion < 2) {
          const ws = db.createObjectStore(WORKOUTS_STORE, { keyPath: 'id' });
          ws.createIndex('date', 'date', { unique: false });
        }
        if (oldVersion < 3) {
          const bs = db.createObjectStore(BODY_STORE, { keyPath: 'id' });
          bs.createIndex('date', 'date', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveMealEntry(entry: MealEntry): Promise<void> {
  const db = await getDB();
  await db.put(MEALS_STORE, entry);
}

export async function getMealsByDate(date: string): Promise<MealEntry[]> {
  const db = await getDB();
  return db.getAllFromIndex(MEALS_STORE, 'date', date);
}

export async function deleteMealEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(MEALS_STORE, id);
}

export async function getDailyLog(date: string): Promise<DailyLog> {
  const entries = await getMealsByDate(date);
  return { date, entries };
}

export async function getAllDates(): Promise<string[]> {
  const db = await getDB();
  const all = await db.getAll(MEALS_STORE);
  const dates = [...new Set(all.map((e: MealEntry) => e.date))];
  return dates.sort();
}

// ─── Workout helpers ──────────────────────────────────────────────────────────

export async function saveWorkoutSession(session: WorkoutSession): Promise<void> {
  const db = await getDB();
  await db.put(WORKOUTS_STORE, session);
}

export async function getWorkoutSession(id: string): Promise<WorkoutSession | undefined> {
  const db = await getDB();
  return db.get(WORKOUTS_STORE, id);
}

export async function getAllWorkoutSessions(): Promise<WorkoutSession[]> {
  const db = await getDB();
  const all = await db.getAll(WORKOUTS_STORE);
  return (all as WorkoutSession[]).sort((a, b) => b.date.localeCompare(a.date));
}

export async function deleteWorkoutSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(WORKOUTS_STORE, id);
}

export async function getLastSessionForExercise(
  exerciseName: string,
  beforeSessionId: string
): Promise<WorkoutSession | undefined> {
  const all = await getAllWorkoutSessions();
  return all.find(
    (s) =>
      s.id !== beforeSessionId &&
      s.exercises.some((e) => e.name.toLowerCase() === exerciseName.toLowerCase())
  );
}

// ─── Body measurement helpers ──────────────────────────────────────────────────

export async function saveBodyMeasurement(entry: BodyMeasurement): Promise<void> {
  const db = await getDB();
  await db.put(BODY_STORE, entry);
}

export async function getAllBodyMeasurements(): Promise<BodyMeasurement[]> {
  const db = await getDB();
  const all = await db.getAll(BODY_STORE);
  return (all as BodyMeasurement[]).sort((a, b) => a.date.localeCompare(b.date));
}

export async function deleteBodyMeasurement(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(BODY_STORE, id);
}
