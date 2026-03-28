import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface WgerExercise {
  id: string | number;
  name: string;
  description: string;
  category: string;
  images: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  gifUrl?: string;
}

export const wgerService = {
  getMuscles: async (): Promise<string[]> => {
    return [
      "Peito", "Costas", "Pernas", "Ombros", "Bíceps", "Tríceps", 
      "Abdominais", "Glúteos", "Gémeos", "Lombar", "Cardio", "Mobilidade"
    ];
  },

  getPopularExercises: (muscle?: string | null): string[] => {
    if (!muscle) {
      return ["Supino Reto", "Agachamento", "Levantamento Terra", "Puxada Frontal", "Desenvolvimento", "Prancha", "Rosca Direta", "Tríceps Corda"];
    }
    const popular: Record<string, string[]> = {
      "Peito": ["Supino Reto", "Supino Inclinado", "Crucifixo", "Flexões", "Chest Press"],
      "Costas": ["Puxada Frontal", "Remada Curvada", "Levantamento Terra", "Barra Fixa", "Remada Baixa"],
      "Pernas": ["Agachamento", "Leg Press", "Extensora", "Flexora", "Agachamento Búlgaro"],
      "Ombros": ["Desenvolvimento", "Elevação Lateral", "Elevação Frontal", "Face Pull"],
      "Bíceps": ["Rosca Direta", "Rosca Martelo", "Rosca Concentrada", "Rosca Scott"],
      "Tríceps": ["Tríceps Corda", "Tríceps Testa", "Mergulho", "Tríceps Coice"],
      "Abdominais": ["Prancha", "Crunch", "Elevação de Pernas", "Abdominal Bicicleta", "Prancha Lateral"],
      "Glúteos": ["Elevação Pélvica", "Afundo", "Stiff", "Cadeira Abdutora"],
      "Gémeos": ["Elevação de Gémeos em Pé", "Elevação de Gémeos Sentado"],
      "Antebraço": ["Rosca Inversa", "Flexão de Punho"],
      "Lombar": ["Hiperextensão", "Good Morning"],
      "Cardio": ["Corrida", "Bicicleta", "Elíptica", "Remo", "Corda"],
      "Mobilidade": ["Mobilidade de Quadril", "Mobilidade de Ombro", "Gato-Vaca", "Cão Olhando para Baixo"]
    };
    return popular[muscle] || [];
  },

  searchExercises: async (term: string, muscle?: string): Promise<WgerExercise[]> => {
    if (!term && !muscle) return [];

    try {
      console.log(`Searching for exercises using AI: ${term} (Muscle: ${muscle || 'any'})`);
      
      const prompt = `Find 8-12 fitness exercises related to "${term || 'popular exercises'}" ${muscle ? `targeting ${muscle}` : ""}. 
      Include a mix of common, advanced, and alternative variations to provide a comprehensive library.
      For each exercise, provide:
      1. Name (in Portuguese, e.g., "Supino Reto" instead of "Bench Press")
      2. Detailed instructions (in Portuguese)
      3. Category (Ativação, Aquecimento, Principal, Abdominais, Alongamentos)
      4. Primary muscle group (in Portuguese)
      5. A direct URL to a high-quality GIF or image of the exercise (prefer GIFs from reliable fitness sources like Giphy, Pinterest, or fitness wikis).
      
      Return the results as a JSON array of objects.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                category: { type: Type.STRING },
                primaryMuscle: { type: Type.STRING },
                mediaUrl: { type: Type.STRING, description: "Direct URL to a GIF or image" }
              },
              required: ["name", "description", "category", "primaryMuscle", "mediaUrl"]
            }
          }
        }
      });

      const results = JSON.parse(response.text || "[]");
      
      return results.map((ex: any, idx: number) => ({
        id: `ai-${Date.now()}-${idx}`,
        name: ex.name,
        description: ex.description,
        category: ex.category,
        images: [ex.mediaUrl],
        gifUrl: ex.mediaUrl,
        primaryMuscles: [ex.primaryMuscle],
        secondaryMuscles: []
      }));
    } catch (error) {
      console.error("AI Search Error:", error);
      return [];
    }
  },

  getExerciseImage: (exercise: WgerExercise): string | undefined => {
    return exercise.gifUrl || (exercise.images && exercise.images[0]);
  }
};
