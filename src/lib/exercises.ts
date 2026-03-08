export type MuscleGroup =
  | 'Pectoraux'
  | 'Dos'
  | 'Épaules'
  | 'Biceps'
  | 'Triceps'
  | 'Jambes'
  | 'Fessiers'
  | 'Mollets'
  | 'Abdominaux';

export type ExerciseType = 'Polyarticulaire' | 'Isolation';

export interface ExerciseEntry {
  name: string;
  muscle: MuscleGroup;
  type: ExerciseType;
}

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps',
  'Jambes', 'Fessiers', 'Mollets', 'Abdominaux',
];

export const EXERCISES: ExerciseEntry[] = [
  // ─── Pectoraux ───────────────────────────────────────────────────────────────
  { name: 'Développé couché barre',          muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Développé couché haltères',       muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Développé incliné barre',         muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Développé incliné haltères',      muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Développé décliné barre',         muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Dips pectoraux',                  muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Pompes',                          muscle: 'Pectoraux', type: 'Polyarticulaire' },
  { name: 'Écarté couché haltères',          muscle: 'Pectoraux', type: 'Isolation' },
  { name: 'Écarté incliné haltères',         muscle: 'Pectoraux', type: 'Isolation' },
  { name: 'Crossover poulie haute',          muscle: 'Pectoraux', type: 'Isolation' },
  { name: 'Crossover poulie basse',          muscle: 'Pectoraux', type: 'Isolation' },
  { name: 'Peck deck / butterfly machine',   muscle: 'Pectoraux', type: 'Isolation' },

  // ─── Dos ─────────────────────────────────────────────────────────────────────
  { name: 'Tractions',                       muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Tractions assistées',             muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Rowing barre',                    muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Rowing haltère unilatéral',       muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Rowing poulie basse',             muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Tirage vertical prise large',     muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Tirage vertical prise serrée',    muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Tirage horizontal',               muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Soulevé de terre',               muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Soulevé de terre roumain',       muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Good morning',                    muscle: 'Dos', type: 'Polyarticulaire' },
  { name: 'Pull-over poulie',               muscle: 'Dos', type: 'Isolation' },
  { name: 'Pull-over haltère',              muscle: 'Dos', type: 'Isolation' },
  { name: 'Extensions lombaires',            muscle: 'Dos', type: 'Isolation' },

  // ─── Épaules ─────────────────────────────────────────────────────────────────
  { name: 'Développé militaire barre',       muscle: 'Épaules', type: 'Polyarticulaire' },
  { name: 'Développé militaire haltères',    muscle: 'Épaules', type: 'Polyarticulaire' },
  { name: 'Développé Arnold',               muscle: 'Épaules', type: 'Polyarticulaire' },
  { name: 'Upright row barre',              muscle: 'Épaules', type: 'Polyarticulaire' },
  { name: 'Élévations latérales haltères',  muscle: 'Épaules', type: 'Isolation' },
  { name: 'Élévations latérales poulie',    muscle: 'Épaules', type: 'Isolation' },
  { name: 'Élévations frontales haltères',  muscle: 'Épaules', type: 'Isolation' },
  { name: 'Oiseau haltères',               muscle: 'Épaules', type: 'Isolation' },
  { name: 'Oiseau poulie',                 muscle: 'Épaules', type: 'Isolation' },
  { name: 'Face pull',                      muscle: 'Épaules', type: 'Isolation' },
  { name: 'Shrugs haltères',               muscle: 'Épaules', type: 'Isolation' },
  { name: 'Shrugs barre',                  muscle: 'Épaules', type: 'Isolation' },

  // ─── Biceps ──────────────────────────────────────────────────────────────────
  { name: 'Curl barre droite',              muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl barre EZ',                 muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl haltères bilatéral',        muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl haltères alterné',          muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl marteau haltères',          muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl poulie basse',             muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl incliné haltères',         muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl concentré haltère',        muscle: 'Biceps', type: 'Isolation' },
  { name: 'Curl pupitre (Scott)',           muscle: 'Biceps', type: 'Isolation' },

  // ─── Triceps ─────────────────────────────────────────────────────────────────
  { name: 'Dips triceps',                   muscle: 'Triceps', type: 'Polyarticulaire' },
  { name: 'Développé couché prise serrée',  muscle: 'Triceps', type: 'Polyarticulaire' },
  { name: 'Skull crusher barre EZ',         muscle: 'Triceps', type: 'Isolation' },
  { name: 'Skull crusher haltères',         muscle: 'Triceps', type: 'Isolation' },
  { name: 'French press',                   muscle: 'Triceps', type: 'Isolation' },
  { name: 'Extensions triceps poulie haute',muscle: 'Triceps', type: 'Isolation' },
  { name: 'Extensions triceps corde',       muscle: 'Triceps', type: 'Isolation' },
  { name: 'Extensions triceps unilatéral',  muscle: 'Triceps', type: 'Isolation' },
  { name: 'Kickbacks haltère',             muscle: 'Triceps', type: 'Isolation' },

  // ─── Jambes ──────────────────────────────────────────────────────────────────
  { name: 'Squat barre',                    muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Squat goblet haltère',           muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Squat hack machine',             muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Leg press',                      muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Fentes barre',                   muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Fentes haltères',               muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Bulgarian split squat',          muscle: 'Jambes', type: 'Polyarticulaire' },
  { name: 'Leg extension',                  muscle: 'Jambes', type: 'Isolation' },
  { name: 'Leg curl couché',               muscle: 'Jambes', type: 'Isolation' },
  { name: 'Leg curl assis',                muscle: 'Jambes', type: 'Isolation' },
  { name: 'Adducteurs machine',             muscle: 'Jambes', type: 'Isolation' },
  { name: 'Abducteurs machine',             muscle: 'Jambes', type: 'Isolation' },

  // ─── Fessiers ────────────────────────────────────────────────────────────────
  { name: 'Hip thrust barre',              muscle: 'Fessiers', type: 'Isolation' },
  { name: 'Hip thrust machine',            muscle: 'Fessiers', type: 'Isolation' },
  { name: 'Kickbacks poulie basse',        muscle: 'Fessiers', type: 'Isolation' },
  { name: 'Abductions fessiers machine',   muscle: 'Fessiers', type: 'Isolation' },
  { name: 'Soulevé de terre sumo',         muscle: 'Fessiers', type: 'Polyarticulaire' },

  // ─── Mollets ─────────────────────────────────────────────────────────────────
  { name: 'Mollets debout machine',        muscle: 'Mollets', type: 'Isolation' },
  { name: 'Mollets assis machine',         muscle: 'Mollets', type: 'Isolation' },
  { name: 'Mollets leg press',             muscle: 'Mollets', type: 'Isolation' },
  { name: 'Mollets haltère unilatéral',    muscle: 'Mollets', type: 'Isolation' },

  // ─── Abdominaux ──────────────────────────────────────────────────────────────
  { name: 'Crunch machine',                muscle: 'Abdominaux', type: 'Isolation' },
  { name: 'Crunch au sol',                 muscle: 'Abdominaux', type: 'Isolation' },
  { name: 'Câble crunch',                  muscle: 'Abdominaux', type: 'Isolation' },
  { name: 'Relevés de jambes',             muscle: 'Abdominaux', type: 'Isolation' },
  { name: 'Gainage (planche)',             muscle: 'Abdominaux', type: 'Isolation' },
  { name: 'Wheel rollout',                 muscle: 'Abdominaux', type: 'Isolation' },
  { name: 'Russian twist',                 muscle: 'Abdominaux', type: 'Isolation' },
];
