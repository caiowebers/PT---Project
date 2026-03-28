import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon, Search, Loader2 } from "lucide-react";
import { Exercise, Workout } from "../types";
import { v4 as uuidv4 } from "uuid";
import { wgerService, WgerExercise } from "../services/wgerService";

interface WorkoutEditorProps {
  workout: Workout;
  onUpdate: (workout: Workout) => void;
}

export default function WorkoutEditor({ workout, onUpdate }: WorkoutEditorProps) {
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, WgerExercise[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const addExercise = () => {
    const newExercise: Exercise = {
      id: uuidv4(),
      name: "",
      category: "Principal",
      reps: "3x12",
      rest: "60s",
      gifUrl: ""
    };
    onUpdate({ ...workout, exercises: [...workout.exercises, newExercise] });
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    const newExercises = workout.exercises.map(e => 
      e.id === id ? { ...e, ...updates } : e
    );
    onUpdate({ ...workout, exercises: newExercises });
  };

  const removeExercise = (id: string) => {
    onUpdate({ ...workout, exercises: workout.exercises.filter(e => e.id !== id) });
  };

  const handleSearch = async (id: string, term: string) => {
    setSearchTerms(prev => ({ ...prev, [id]: term }));
    
    if (term.length < 2) {
      setSuggestions(prev => ({ ...prev, [id]: [] }));
      return;
    }

    setLoading(prev => ({ ...prev, [id]: true }));
    
    // Debounce logic could be added here, but for now let's just make sure the search is robust
    try {
      const results = await wgerService.searchExercises(term);
      setSuggestions(prev => ({ ...prev, [id]: results }));
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions(prev => ({ ...prev, [id]: [] }));
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const selectSuggestion = (id: string, suggestion: WgerExercise) => {
    const imageUrl = wgerService.getExerciseImage(suggestion);
    updateExercise(id, { 
      name: suggestion.name, 
      gifUrl: imageUrl || "" 
    });
    setSuggestions(prev => ({ ...prev, [id]: [] }));
    setSearchTerms(prev => ({ ...prev, [id]: suggestion.name })); // Keep the name in the input
  };

  const categories = ["Ativação", "Aquecimento", "Principal", "Abdominais", "Alongamentos"] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {workout.exercises.map((exercise, idx) => (
          <div key={exercise.id} className="p-4 rounded-lg bg-white/5 border border-gym-border space-y-4 relative">
            <div className="flex items-center gap-3">
              <GripVertical className="w-5 h-5 text-gray-600 cursor-grab" />
              <div className="flex-1 relative">
                <div className="relative">
                  <Search className="absolute w-4 h-4 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                  <input 
                    type="text" 
                    value={searchTerms[exercise.id] !== undefined ? searchTerms[exercise.id] : exercise.name}
                    onChange={e => handleSearch(exercise.id, e.target.value)}
                    placeholder="Pesquisar exercício (ex: Bench Press)..."
                    className="w-full bg-black border border-gym-border rounded-lg py-2 pl-9 pr-4 focus:border-neon-green outline-hidden font-bold text-sm"
                  />
                  {loading[exercise.id] && (
                    <Loader2 className="absolute w-4 h-4 text-neon-green -translate-y-1/2 right-3 top-1/2 animate-spin" />
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {(suggestions[exercise.id]?.length > 0 || (searchTerms[exercise.id]?.length >= 2 && !loading[exercise.id])) && (
                  <div className="absolute z-50 w-full mt-1 bg-gym-card border border-gym-border rounded-lg shadow-2xl max-h-60 overflow-y-auto">
                    {suggestions[exercise.id]?.length > 0 ? (
                      suggestions[exercise.id].map(s => (
                        <button
                          key={s.id}
                          onClick={() => selectSuggestion(exercise.id, s)}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 text-left border-b border-gym-border last:border-0"
                        >
                          {wgerService.getExerciseImage(s) ? (
                            <img 
                              src={wgerService.getExerciseImage(s)} 
                              className="w-10 h-10 rounded object-cover border border-gym-border" 
                              alt={s.name}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center border border-gym-border">
                              <ImageIcon className="w-4 h-4 text-gray-600" />
                            </div>
                          )}
                          <span className="text-sm font-bold">{s.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-500 text-sm">
                        Nenhum exercício encontrado para "{searchTerms[exercise.id]}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button 
                onClick={() => removeExercise(exercise.id)}
                className="text-red-500/30 hover:text-red-500"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Categoria</label>
                <select 
                  value={exercise.category}
                  onChange={e => updateExercise(exercise.id, { category: e.target.value as any })}
                  className="w-full bg-black border border-gym-border rounded p-1 text-xs"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Séries/Reps</label>
                <input 
                  type="text" 
                  value={exercise.reps}
                  onChange={e => updateExercise(exercise.id, { reps: e.target.value })}
                  className="w-full bg-black border border-gym-border rounded p-1 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">Descanso</label>
                <input 
                  type="text" 
                  value={exercise.rest}
                  onChange={e => updateExercise(exercise.id, { rest: e.target.value })}
                  className="w-full bg-black border border-gym-border rounded p-1 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold">GIF/Imagem URL</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={exercise.gifUrl}
                    onChange={e => updateExercise(exercise.id, { gifUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 bg-black border border-gym-border rounded p-1 text-xs"
                  />
                  {exercise.gifUrl && (
                    <div className="w-6 h-6 rounded bg-neon-green/10 flex items-center justify-center">
                      <ImageIcon className="w-3 h-3 text-neon-green" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={addExercise}
        className="w-full py-3 border-2 border-dashed border-gym-border rounded-xl text-gray-500 hover:text-neon-green hover:border-neon-green/50 transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Adicionar Exercício
      </button>
    </div>
  );
}
