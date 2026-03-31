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

  fetchExerciseMedia: async (name: string, category: string): Promise<string | null> => {
    try {
      console.log(`Fetching media for: ${name} (${category})`);
      const prompt = `Find a direct URL to a high-quality GIF or image for the exercise "${name}" (Category: ${category}). 
      The URL must be a direct link to an image or GIF file (e.g., ending in .gif, .jpg, .png).
      Prefer reliable fitness sources.
      Return the result as a JSON object with a single field "mediaUrl".`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mediaUrl: { type: Type.STRING }
            },
            required: ["mediaUrl"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      return result.mediaUrl || null;
    } catch (error) {
      console.error("Fetch Media Error:", error);
      return null;
    }
  },

  getExerciseImage: (exercise: WgerExercise): string | undefined => {
    return exercise.gifUrl || (exercise.images && exercise.images[0]);
  },

  optimizeWorkout: async (workout: any): Promise<any[]> => {
    try {
      console.log(`Optimizing workout sequence for: ${workout.name}`);
      const prompt = `Optimize the sequence of the following gym exercises for a workout named "${workout.name}". 
      The goal is to provide the most efficient and safe sequence (e.g., starting with compound movements, then isolation, then core/stretching).
      Exercises: ${workout.exercises.map((ex: any) => `${ex.name} (${ex.category})`).join(", ")}.
      
      Return the optimized sequence as a JSON array of exercise names in the correct order.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });

      const optimizedNames = JSON.parse(response.text || "[]");
      
      // Reorder based on AI response
      const optimizedExercises = [...workout.exercises].sort((a, b) => {
        const indexA = optimizedNames.indexOf(a.name);
        const indexB = optimizedNames.indexOf(b.name);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      return optimizedExercises;
    } catch (error) {
      console.error("Optimize Workout Error:", error);
      return workout.exercises;
    }
  },

  generateExerciseDescription: async (exerciseName: string): Promise<string> => {
    try {
      console.log(`Generating AI description for: ${exerciseName}`);
      const prompt = `Provide a very brief (max 2 sentences) and clear instruction on how to perform the gym exercise "${exerciseName}" in Portuguese. Focus on form and safety.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      return response.text || "Descrição não disponível.";
    } catch (error) {
      console.error("Generate Description Error:", error);
      return "Erro ao gerar descrição.";
    }
  },

  generateHealthInsights: async (studentData: any): Promise<string> => {
    try {
      console.log(`Generating health insights for: ${studentData.name}`);
      const prompt = `Com base nos dados do aluno abaixo, gere um resumo conciso (máximo 4 parágrafos curtos) com dicas de saúde, alertas e sugestões de treino/nutrição em Português.
      Dados:
      Nome: ${studentData.name}
      Idade: ${studentData.age}
      Objetivo: ${studentData.goal}
      Peso: ${studentData.evaluations?.[studentData.evaluations.length - 1]?.weight}kg
      Altura: ${studentData.evaluations?.[studentData.evaluations.length - 1]?.height}m
      IMC: ${studentData.evaluations?.[studentData.evaluations.length - 1]?.bmi}
      % Gordura: ${studentData.evaluations?.[studentData.evaluations.length - 1]?.bodyFat}%
      Notas: ${studentData.notes}
      
      Seja motivador e profissional. Use bullet points para as dicas principais.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      return response.text || "Insights não disponíveis no momento.";
    } catch (error) {
      console.error("Generate Health Insights Error:", error);
      return "Erro ao gerar insights de saúde.";
    }
  }
};
