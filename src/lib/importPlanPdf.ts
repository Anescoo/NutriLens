export interface ParsedPlanExercise {
  name: string;
  sets: number;
  reps?: number;   // from "4x15" → 15
  time?: string;   // from "30sec", "4min", "4,5 min", etc.
}

export interface ParsedPlanSession {
  name: string;
  exercises: ParsedPlanExercise[];
}

export interface ParsedPlan {
  name: string;
  sessions: ParsedPlanSession[];
}

// Extract text from a PDF file via server-side API route (avoids client worker issues)
async function extractPdfText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/parse-pdf', { method: 'POST', body: formData });
  if (!res.ok) throw new Error(`PDF parse failed: ${res.status}`);
  const { text, error } = await res.json();
  if (error) throw new Error(error);
  return text as string;
}

const TIME_RE = /(\d+[,.]?\d*)\s*(sec(?:ondes?)?|min(?:utes?)?)/i;

function extractTime(text: string): string | undefined {
  const match = text.match(TIME_RE);
  if (!match) return undefined;
  return match[0].trim();
}

function extractReps(text: string): number | undefined {
  // Only extract reps when there is no time unit right after the second number
  const match = text.match(/\d+\s*[x×]\s*(\d+)/);
  if (match) {
    // Make sure the captured number isn't followed by a time unit
    const afterMatch = text.slice(text.indexOf(match[0]) + match[0].length);
    if (TIME_RE.test(match[0]) || /^\s*(sec(?:ondes?)?|min(?:utes?)?)/i.test(afterMatch)) {
      return undefined; // it's a time-based exercise, e.g. "3x60 sec"
    }
    const n = parseInt(match[1]);
    if (n >= 1 && n <= 200) return n;
  }
  return undefined;
}

function extractSets(text: string): number {
  const match =
    text.match(/(\d+)\s*[x×]/) ||        // "4x15" or "4x" alone
    text.match(/(\d+)\s*s[eé]ries?/i) ||
    text.match(/(\d+)\s*sets?/i);
  if (match) {
    const n = parseInt(match[1]);
    if (n >= 1 && n <= 20) return n;
  }
  return 3;
}

const SESSION_TRIGGERS = [
  'push', 'pull', 'legs', 'chest', 'back', 'shoulders', 'arms', 'core',
  'upper', 'lower', 'full body', 'poitrine', 'dos', 'épaules', 'bras',
  'jambes', 'abdos', 'jour', 'day', 'session', 'séance',
  'haut', 'bas', 'cardio', 'gainage', 'étirements', 'échauffement',
];

// Words that start instruction/note lines — never exercise names
const SKIP_STARTERS = /^(repos|option|consigne|note|attention|important|contrôle|privilégie|bois|récupération|warning|info)\b/i;

function isSessionHeader(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 55) return false;
  if (t.endsWith(':')) return true;
  if (/^(jour|day|session|séance)\s*[a-z\d]/i.test(t)) return true;
  if (t === t.toUpperCase() && t.length > 2 && /[A-Z]/.test(t)) return true;
  const lower = t.toLowerCase().replace(/:$/, '');
  return SESSION_TRIGGERS.some((k) => lower === k || lower.startsWith(k + ' ') || lower.startsWith(k + ':'));
}

function isExerciseLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.length < 3 || t.length > 90) return false;
  if (SKIP_STARTERS.test(t)) return false;
  // Must START with Nx pattern (most reliable signal)
  if (/^\d+\s*[x×]/.test(t)) return true;
  // Has explicit sets/séries count
  if (/\d+\s*s[eé]ries?|\d+\s*sets?/i.test(t)) return true;
  // Starts directly with a time value (e.g. "30sec planche", "2min gainage")
  if (/^\d+[,.]?\d*\s*(sec(?:ondes?)?|min(?:utes?)?)/.test(t)) return true;
  // Starts with a bullet
  if (/^[-•·*▸→]\s/.test(t)) return true;
  return false;
}

function cleanExerciseName(line: string): string {
  return line
    .trim()
    .replace(/^[-•·*▸→]\s*/, '')
    // Strip leading "3x12", "3x60 sec", "3x" — the set×rep(×time) prefix
    .replace(/^\d+\s*[x×]\s*(?:\d+[,.]?\d*\s*(?:sec(?:ondes?)?|min(?:utes?)?)?\s*)?/, '')
    .replace(/\s*\d+\s*s[eé]ries?.*$/i, '')
    .replace(/\s*\d+\s*sets?.*$/i, '')
    .replace(/\s*\d+[,.]?\d*\s*(sec(?:ondes?)?|min(?:utes?)?)\s*/gi, '') // remaining time tokens
    .replace(/[:\-–]+$/, '')
    .trim();
}

/**
 * Normalize raw PDF/TXT text into individual lines.
 * Always applied: PDFs from unpdf may arrive as one big line or with sparse newlines.
 */
function normalizeText(text: string): string {
  return text
    // Insert newlines before known session-header patterns (not already on their own line)
    .replace(/([^\n])\s+([Ss][eéè]ance\s)/g, '$1\n$2')
    .replace(/([^\n])\s+(Jour\s*\d)/gi, '$1\n$2')
    .replace(/([^\n])\s+(Day\s*\d)/gi, '$1\n$2')
    .replace(/([^\n])\s+(Session\s)/gi, '$1\n$2')
    // Split on bullet points (•, ·) used as list separators
    .replace(/\s*[•·]\s*/g, '\n');
}

export function parsePlanText(text: string, fallbackName = 'Plan importé'): ParsedPlan {
  const normalized = normalizeText(text);
  const lines = normalized.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);

  let planName = fallbackName;
  if (
    lines[0] &&
    !isSessionHeader(lines[0]) &&
    !isExerciseLine(lines[0]) &&
    lines[0].length < 60
  ) {
    planName = lines[0].replace(/^(plan|programme)\s*:?\s*/i, '').trim() || fallbackName;
  }

  const sessions: ParsedPlanSession[] = [];
  let current: ParsedPlanSession | null = null;

  for (const line of lines) {
    if (isSessionHeader(line)) {
      current = { name: line.replace(/:$/, '').trim(), exercises: [] };
      sessions.push(current);
    } else if (isExerciseLine(line)) {
      if (!current) {
        current = { name: 'Séance principale', exercises: [] };
        sessions.push(current);
      }
      const name = cleanExerciseName(line);
      if (name.length >= 2) {
        const ex: ParsedPlanExercise = { name, sets: extractSets(line) };
        const reps = extractReps(line);
        const time = extractTime(line);
        if (reps !== undefined) ex.reps = reps;
        if (time !== undefined) ex.time = time;
        current.exercises.push(ex);
      }
    }
  }

  // Fallback: if nothing matched, grab plausible lines as exercises in one session
  if (sessions.length === 0 || sessions.every((s) => s.exercises.length === 0)) {
    const fallback: ParsedPlanSession = { name: 'Séance principale', exercises: [] };
    for (const line of lines.slice(planName !== fallbackName ? 1 : 0)) {
      const name = cleanExerciseName(line);
      if (name.length >= 3 && name.length < 65) {
        const ex: ParsedPlanExercise = { name, sets: extractSets(line) };
        const reps = extractReps(line);
        const time = extractTime(line);
        if (reps !== undefined) ex.reps = reps;
        if (time !== undefined) ex.time = time;
        fallback.exercises.push(ex);
      }
    }
    if (fallback.exercises.length > 0) {
      return { name: planName, sessions: [fallback] };
    }
  }

  return {
    name: planName,
    sessions: sessions.filter((s) => s.exercises.length > 0),
  };
}

export async function importPlanFromFile(file: File): Promise<ParsedPlan> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  // CSV: expect columns Séance,Exercice,Séries
  if (ext === 'csv') {
    const text = await file.text();
    const lines = text.split(/[\n\r]+/);
    const sessionMap = new Map<string, ParsedPlanSession>();

    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      const [rawSession, rawExercise, rawSets] = line.split(',').map((s) =>
        s.trim().replace(/^"|"$/g, '')
      );
      if (!rawExercise) continue;
      const key = rawSession?.trim() || 'Séance principale';
      if (!sessionMap.has(key)) sessionMap.set(key, { name: key, exercises: [] });
      sessionMap.get(key)!.exercises.push({ name: rawExercise, sets: parseInt(rawSets) || 3 });
    }

    return {
      name: file.name.replace(/\.csv$/i, ''),
      sessions: [...sessionMap.values()].filter((s) => s.exercises.length > 0),
    };
  }

  let text = '';
  if (ext === 'pdf') {
    text = await extractPdfText(file);
  } else {
    text = await file.text();
  }

  return parsePlanText(text, file.name.replace(/\.[^.]+$/, ''));
}
