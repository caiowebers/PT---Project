const BASE_URL = "https://wger.de/api/v2";

export interface WgerExercise {
  id: number;
  name: string;
  description: string;
  category: { id: number; name: string };
  images: { image: string; is_main: boolean }[];
}

export const wgerService = {
  searchExercises: async (term: string): Promise<WgerExercise[]> => {
    try {
      console.log(`Searching wger for: ${term}`);
      
      // Strategy 1: Try direct name filtering on exerciseinfo
      const response = await fetch(`${BASE_URL}/exerciseinfo/?name=${encodeURIComponent(term)}`);
      const data = await response.json();
      let results: WgerExercise[] = data.results || [];

      // Strategy 2: If no results, try a broader search on exerciseinfo with a larger limit
      if (results.length === 0) {
        console.log("No exact match found, trying broad search...");
        const broadResponse = await fetch(`${BASE_URL}/exerciseinfo/?limit=200`);
        const broadData = await broadResponse.json();
        results = (broadData.results || []).filter((ex: any) => 
          ex.name.toLowerCase().includes(term.toLowerCase())
        );
      }

      // Strategy 3: Try the dedicated search endpoint if still nothing
      if (results.length === 0) {
        console.log("Still nothing, trying search endpoint...");
        const searchResponse = await fetch(`${BASE_URL}/exercise/search/?term=${encodeURIComponent(term)}`);
        const searchData = await searchResponse.json();
        // The search endpoint returns a different format, we'd need to fetch info for each
        // but for now let's just use what we have from Strategy 2 or return empty
      }
      
      console.log(`Found ${results.length} results`);
      return results;
    } catch (error) {
      console.error("Wger API Error:", error);
      return [];
    }
  },

  getExerciseImage: (exercise: WgerExercise): string | undefined => {
    if (exercise.images && exercise.images.length > 0) {
      const mainImage = exercise.images.find(img => img.is_main) || exercise.images[0];
      return mainImage.image;
    }
    return undefined;
  }
};
