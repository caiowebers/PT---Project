import { useState } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon } from "lucide-react";
import { Exercise, Workout } from "../types";
import { v4 as uuidv4 } from "uuid";

interface WorkoutEditorProps {
  workout: Workout;
  onUpdate: (workout: Workout) => void;
}

export default function WorkoutEditor({ workout, onUpdate }: WorkoutEditorProps) {
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

  const categories = ["Ativação", "Aquecimento", "Principal", "Abdominais", "Alongamentos"] as const;

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {workout.exercises.map((exercise, idx) => (
          <div key={exercise.id} className="p-4 rounded-lg bg-white/5 border border-gym-border space-y-4">
            <div className="flex items-center gap-3">
              <GripVertical className="w-5 h-5 text-gray-600 cursor-grab" />
              <input 
                type="text" 
                value={exercise.name}
                onChange={e => updateExercise(exercise.id, { name: e.target.value })}
                placeholder="Nome do Exercício"
                className="flex-1 bg-transparent border-b border-gym-border focus:border-neon-green outline-hidden font-bold"
              />
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
                <label className="text-[10px] uppercase text-gray-500 font-bold">GIF URL</label>
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
