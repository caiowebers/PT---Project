export interface PhysicalEvaluation {
  date: string;
  weight: number;
  height: number;
  bmi: number;
  bmr: number;
  maxHr: number;
  bodyFat?: number;
  muscleMass?: number;
  fatMass?: number;
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

export interface ExerciseSet {
  id: string;
  reps: string;
  load: string;
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  category: "Ativação" | "Aquecimento" | "Principal" | "Abdominais" | "Alongamentos";
  reps: string;
  rest: string;
  gifUrl?: string;
  completed?: boolean;
  sets?: ExerciseSet[];
  loadUnit?: "Kg" | "Libras" | "Pesos" | "%";
  repType?: "Repetições" | "Minutos" | "Segundos";
  aiDescription?: string;
}

export interface Workout {
  id: string;
  name: string; // Treino A, B, C...
  exercises: Exercise[];
  lastUpdated?: string;
  rating?: number;
  feedback?: string;
}

export interface ClassSession {
  id: string;
  studentId: string;
  studentName: string;
  instructorId: string; // This is the UID of the Personal Trainer (Admin)
  workoutTitle: string;
  start: string; // ISO string
  end: string;   // ISO string
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  notes?: string;
  googleEventId?: string;
}

export interface CompletedWorkout {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string; // ISO string
  feedback: string;
  rating: number;
  exercisesCompleted: string[]; // IDs of exercises marked as done
}

export interface Student {
  id: string;
  adminId: string; // This is the UID of the Personal Trainer (Admin)
  shareSlug: string;
  name: string;
  email?: string;
  age: number;
  goal: string;
  startDate: string;
  notes: string;
  evaluations: PhysicalEvaluation[];
  measurements: BodyMeasurements[];
  workouts: Workout[];
  sessions?: ClassSession[];
  photoUrl?: string;
  personalFeedback?: string;
  healthInsights?: string;
  workoutHistory?: CompletedWorkout[];
}

export interface AdminSettings {
  id: string;
  logoUrl?: string;
  instructorName?: string;
}
