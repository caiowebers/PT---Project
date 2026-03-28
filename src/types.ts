export interface PhysicalEvaluation {
  date: string;
  weight: number;
  height: number;
  bmi: number;
  bmr: number;
  maxHr: number;
}

export interface BodyMeasurements {
  date: string;
  chest: number;
  bicepsR: number;
  bicepsL: number;
  waist: number;
  abdomen: number;
  hips: number;
  thighR: number;
  thighL: number;
  calfR: number;
  calfL: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: "Ativação" | "Aquecimento" | "Principal" | "Abdominais" | "Alongamentos";
  reps: string;
  rest: string;
  gifUrl?: string;
  completed?: boolean;
}

export interface Workout {
  id: string;
  name: string; // Treino A, B, C...
  exercises: Exercise[];
}

export interface Student {
  id: string;
  shareSlug: string;
  name: string;
  age: number;
  goal: string;
  startDate: string;
  notes: string;
  evaluations: PhysicalEvaluation[];
  measurements: BodyMeasurements[];
  workouts: Workout[];
}
