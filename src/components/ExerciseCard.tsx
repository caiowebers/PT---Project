import React, { useState } from "react";
import { CheckCircle2, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Exercise } from "../types";

interface ExerciseCardProps {
  exercise: Exercise;
  isCompleted: boolean;
  onToggle: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, isCompleted, onToggle }) => {
  const [imageError, setImageError] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  return (
    <motion.div 
      layout
      className={`glass-card p-4 flex items-center gap-4 transition-all relative group ${
        isCompleted ? "opacity-50 grayscale" : ""
      }`}
      onMouseEnter={() => setShowInfo(true)}
      onMouseLeave={() => setShowInfo(false)}
    >
      <button 
        onClick={onToggle}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all border-2 shrink-0 ${
          isCompleted 
            ? "bg-neon-green border-neon-green text-gym-dark" 
            : "border-gym-border hover:border-neon-green/50"
        }`}
      >
        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <div className="w-2 h-2 rounded-full bg-white/10" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-bold truncate uppercase text-sm tracking-tight">{exercise.name}</h4>
          {exercise.description && (
            <Info className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 mt-1">
          <span className="px-2 py-0.5 rounded bg-white/5 border border-gym-border font-bold text-neon-green">
            {exercise.reps}
          </span>
          <span className="px-2 py-0.5 rounded bg-white/5 border border-gym-border">
            Descanso: {exercise.rest}
          </span>
          {exercise.repType && (
            <span className="px-2 py-0.5 rounded bg-white/5 border border-gym-border italic">
              {exercise.repType}
            </span>
          )}
        </div>

        {/* Detailed Sets Display */}
        {exercise.sets && exercise.sets.length > 0 && (
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-1.5">
            {exercise.sets.map((set, sIdx) => (
              <div key={set.id} className="p-1.5 rounded-lg bg-black/40 border border-gym-border text-center space-y-0.5">
                <p className="text-[8px] font-black text-gray-600 uppercase">S{sIdx + 1}</p>
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] font-bold text-white">{set.reps}</span>
                  <span className="text-[8px] text-gray-500">{set.load}{exercise.loadUnit || "Kg"}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {exercise.gifUrl && !imageError ? (
        <div className="w-16 h-16 rounded-lg overflow-hidden border border-gym-border bg-black shrink-0">
          <img 
            src={exercise.gifUrl} 
            alt={exercise.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-lg flex items-center justify-center border border-gym-border bg-white/5 shrink-0">
          <Info className="w-6 h-6 text-gray-600" />
        </div>
      )}

      {/* Tooltip for description */}
      <AnimatePresence>
        {showInfo && exercise.description && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="absolute z-50 bottom-full left-0 right-0 mb-2 p-3 bg-gym-dark border border-neon-green/30 rounded-xl shadow-2xl text-xs text-gray-300 pointer-events-none"
          >
            <p className="font-bold text-neon-green mb-1">Como fazer:</p>
            {exercise.description}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ExerciseCard;
