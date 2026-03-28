import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import { Exercise } from "../types";

interface ExerciseCardProps {
  exercise: Exercise;
  isCompleted: boolean;
  onToggle: () => void;
}

export default function ExerciseCard({ exercise, isCompleted, onToggle }: ExerciseCardProps) {
  return (
    <motion.div 
      layout
      className={`glass-card p-4 flex items-center gap-4 transition-all ${
        isCompleted ? "opacity-50 grayscale" : ""
      }`}
    >
      <button 
        onClick={onToggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 shrink-0 ${
          isCompleted 
            ? "bg-neon-green border-neon-green text-gym-dark" 
            : "border-gym-border hover:border-neon-green/50"
        }`}
      >
        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-2 h-2 rounded-full bg-white/20" />}
      </button>

      <div className="flex-1 min-w-0">
        <h4 className="font-bold truncate">{exercise.name}</h4>
        <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-gym-border">{exercise.reps}</span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-gym-border">Descanso: {exercise.rest}</span>
        </div>
      </div>

      {exercise.gifUrl && (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gym-border bg-black shrink-0">
          <img 
            src={exercise.gifUrl} 
            alt={exercise.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </motion.div>
  );
}
