const EXERCISES_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json";
const IMAGES_BASE_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

export interface WgerExercise {
  id: string | number;
  name: string;
  description: string;
  category: string;
  images: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

let cachedExercises: any[] = [];

export const wgerService = {
  getMuscles: async (): Promise<string[]> => {
    if (cachedExercises.length === 0) {
      await wgerService.searchExercises("");
    }
    const muscles = new Set<string>();
    cachedExercises.forEach(ex => {
      ex.primaryMuscles?.forEach((m: string) => muscles.add(m));
    });
    return Array.from(muscles).sort();
  },

  searchExercises: async (term: string, muscle?: string): Promise<WgerExercise[]> => {
    try {
      if (cachedExercises.length === 0) {
        console.log("Fetching exercises from GitHub...");
        const response = await fetch(EXERCISES_URL);
        cachedExercises = await response.json();
      }

      console.log(`Searching exercise-db for: ${term} (Muscle: ${muscle || 'any'})`);
      
      let filtered = cachedExercises;
      
      if (muscle) {
        filtered = filtered.filter((ex: any) => 
          ex.primaryMuscles?.includes(muscle) || ex.secondaryMuscles?.includes(muscle)
        );
      }

      if (term) {
        filtered = filtered.filter((ex: any) => 
          ex.name.toLowerCase().includes(term.toLowerCase())
        );
      }

      const results = filtered
        .slice(0, 30)
        .map((ex: any) => ({
          id: ex.id,
          name: ex.name,
          description: ex.instructions?.join(" ") || "",
          category: ex.category || "Geral",
          images: ex.images || [],
          primaryMuscles: ex.primaryMuscles || [],
          secondaryMuscles: ex.secondaryMuscles || []
        }));

      return results;
    } catch (error) {
      console.error("Exercise DB Error:", error);
      return [];
    }
  },

  getExerciseImage: (exercise: WgerExercise): string | undefined => {
    if (exercise.images && exercise.images.length > 0) {
      return `${IMAGES_BASE_URL}/${exercise.images[0]}`;
    }
    return undefined;
  }
};
