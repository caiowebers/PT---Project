import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon, Search, Loader2, Copy, X, ChevronRight, Clock, BarChart3, Zap, Eye } from "lucide-react";
import { Exercise, Workout } from "../types";
import { v4 as uuidv4 } from "uuid";
import { wgerService, WgerExercise } from "../services/wgerService";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface WorkoutEditorProps {
  workout: Workout;
  onUpdate: (workout: Workout) => void;
  accentColor?: string;
}

function SortableExerciseItem({ 
  exercise, 
  idx, 
  searchTerms, 
  suggestions, 
  loading, 
  selectedMuscle, 
  muscles, 
  handleSearch, 
  selectSuggestion, 
  updateExercise, 
  duplicateExercise, 
  removeExercise, 
  categories,
  repPresets,
  restPresets,
  setSearchTerms,
  setSuggestions,
  isHighlighted,
  accentColor
}: any) {
  const [showInfo, setShowInfo] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
  };

  return (
    <motion.div 
      ref={setNodeRef}
      style={style}
      initial={isHighlighted ? { scale: 0.98, opacity: 0 } : {}}
      animate={isHighlighted ? { 
        scale: 1,
        opacity: 1,
        borderColor: ["rgba(243,244,246,1)", accentColor, "rgba(243,244,246,1)"],
        backgroundColor: ["rgba(255,255,255,1)", `${accentColor}1A`, "rgba(255,255,255,1)"],
        boxShadow: ["0 8px 30px rgba(0,0,0,0.04)", `0 0 30px ${accentColor}4D`, "0 8px 30px rgba(0,0,0,0.04)"]
      } : {}}
      transition={{ 
        duration: isHighlighted ? 2 : 0.3, 
        ease: "easeOut"
      }}
      className={`group flex flex-col gap-4 p-5 rounded-2xl bg-white border border-gray-100 hover:border-red-200 transition-all relative ${isDragging ? 'opacity-50 ring-2 ring-red-500/50 shadow-2xl' : 'shadow-[0_8px_30px_rgb(0,0,0,0.04)]'}`}
    >
      {/* Header: Drag, Title, Actions */}
      <div className="flex items-center gap-4">
        <div {...attributes} {...listeners} className="p-2 hover:bg-gray-50 rounded-lg cursor-grab active:cursor-grabbing transition-colors">
          <GripVertical className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="relative group/title">
            <input 
              type="text" 
              value={searchTerms[exercise.id] !== undefined ? searchTerms[exercise.id] : exercise.name}
              onChange={e => setSearchTerms(prev => ({ ...prev, [exercise.id]: (e.target as HTMLInputElement).value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch(exercise.id, searchTerms[exercise.id] || "", undefined, true)}
              placeholder="Nome do Exercício..."
              className="w-full bg-transparent border-none p-0 focus:ring-0 font-black text-xl md:text-2xl text-gray-900 placeholder:text-gray-300 transition-all uppercase tracking-tight"
            />
            <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gym-red group-focus-within/title:w-full transition-all duration-300" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">#{idx + 1}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <select 
              value={exercise.category}
              onChange={e => updateExercise(exercise.id, { category: (e.target as HTMLSelectElement).value as any })}
              className="bg-transparent border-none p-0 text-[10px] font-black uppercase tracking-widest text-gray-500 focus:ring-0 cursor-pointer hover:text-gray-700 transition-colors"
            >
              {categories.map((c: string) => <option key={c} value={c} className="bg-white">{c}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => duplicateExercise(exercise)}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-xl transition-all"
            title="Duplicar"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button 
            onClick={() => removeExercise(exercise.id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            title="Remover"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search & Suggestions Row */}
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute w-3.5 h-3.5 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
            <input 
              type="text" 
              value={searchTerms[exercise.id] || ""}
              onChange={e => setSearchTerms(prev => ({ ...prev, [exercise.id]: (e.target as HTMLInputElement).value }))}
              onKeyDown={e => e.key === 'Enter' && handleSearch(exercise.id, searchTerms[exercise.id] || "", undefined, true)}
              placeholder="Refinar exercício com IA..."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2 pl-9 pr-10 focus:ring-1 focus:ring-red-500/20 focus:border-gym-red text-xs text-gray-700 transition-all"
            />
            {loading[exercise.id] && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gym-red animate-spin" />
            )}
          </div>
          <button 
            onClick={() => handleSearch(exercise.id, searchTerms[exercise.id] || "", undefined, true)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 transition-all"
          >
            Buscar
          </button>
        </div>

        {/* Suggestions Dropdown */}
        <AnimatePresence>
          {suggestions[exercise.id]?.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden"
            >
              {suggestions[exercise.id].map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => selectSuggestion(exercise.id, s)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 group/item transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{s.name}</div>
                    <div className="text-[9px] text-gray-500 uppercase font-bold">{s.category} • {s.primaryMuscles[0]}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover/item:text-gym-red transition-colors" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Configuration Grid (12 Columns) */}
      <div className="grid grid-cols-12 gap-6 items-end">
        {/* Rep Type - 4 cols */}
        <div className="col-span-12 md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tipo de Repetição</label>
          <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
            {["Repetições", "Minutos", "Segundos"].map(type => (
              <button
                key={type}
                onClick={() => updateExercise(exercise.id, { repType: type as any })}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                  (exercise.repType || "Repetições") === type 
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {type === "Repetições" ? "Reps" : type}
              </button>
            ))}
          </div>
        </div>

        {/* Load Unit - 4 cols */}
        <div className="col-span-12 md:col-span-4 space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Unidade de Carga</label>
          <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
            {["Kg", "Libras", "Pesos", "%"].map(unit => (
              <button
                key={unit}
                onClick={() => updateExercise(exercise.id, { loadUnit: unit as any })}
                className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
                  (exercise.loadUnit || "Kg") === unit 
                    ? "bg-white text-gray-900 shadow-sm border border-gray-200" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Rest Slider - 4 cols */}
        <div className="col-span-12 md:col-span-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Descanso</label>
            <span className="text-xs font-black text-gray-900">{exercise.rest}</span>
          </div>
          <div className="flex items-center gap-3">
            <input 
              type="range"
              min="0"
              max="300"
              step="5"
              value={parseInt(exercise.rest) || 60}
              onChange={e => updateExercise(exercise.id, { rest: `${(e.target as HTMLInputElement).value}s` })}
              className="flex-1 h-1 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gym-red"
            />
          </div>
        </div>
      </div>

      {/* Sets Management */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Séries e Cargas</h5>
          <button 
            onClick={() => {
              const newSets = [...(exercise.sets || []), { id: uuidv4(), reps: "10", load: "0" }];
              updateExercise(exercise.id, { sets: newSets, reps: `${newSets.length} sets` });
            }}
            className="text-[9px] font-black uppercase tracking-widest text-gym-red hover:text-red-800 transition-colors flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Novo Set
          </button>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {(exercise.sets || []).map((set, sIdx) => (
            <div key={set.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 hover:border-red-200 transition-all group/set">
              <span className="text-[9px] font-black text-gray-400 w-4">S{sIdx + 1}</span>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={set.reps}
                  onChange={e => {
                    const newSets = [...(exercise.sets || [])];
                    newSets[sIdx] = { ...set, reps: (e.target as HTMLInputElement).value };
                    updateExercise(exercise.id, { sets: newSets });
                  }}
                  className="w-8 bg-transparent border-none p-0 text-center text-xs font-bold focus:ring-0 text-gray-900"
                  placeholder="0"
                />
                <span className="text-[8px] text-gray-400 font-black">×</span>
                <input 
                  type="text" 
                  value={set.load}
                  onChange={e => {
                    const newSets = [...(exercise.sets || [])];
                    newSets[sIdx] = { ...set, load: (e.target as HTMLInputElement).value };
                    updateExercise(exercise.id, { sets: newSets });
                  }}
                  className="w-10 bg-transparent border-none p-0 text-center text-xs font-bold focus:ring-0 text-gray-900"
                  placeholder="0"
                />
              </div>
              <button 
                onClick={() => {
                  const newSets = (exercise.sets || []).filter(s => s.id !== set.id);
                  updateExercise(exercise.id, { sets: newSets, reps: `${newSets.length} sets` });
                }}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover/set:opacity-100 transition-all"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function WorkoutEditor({ workout, onUpdate, accentColor = "var(--gym-red)" }: WorkoutEditorProps) {
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, WgerExercise[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedMuscle, setSelectedMuscle] = useState<Record<string, string>>({});
  const [muscles, setMuscles] = useState<string[]>([]);
  const [libraryMuscle, setLibraryMuscle] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalSuggestions, setGlobalSuggestions] = useState<WgerExercise[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    wgerService.getMuscles().then(setMuscles);
  }, []);

  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  const handleGlobalSearch = async (term: string) => {
    setGlobalSearchTerm(term);
    if (term.length < 2) {
      setGlobalSuggestions([]);
      return;
    }
    setGlobalLoading(true);
    try {
      const results = await wgerService.searchExercises(term);
      setGlobalSuggestions(results);
    } catch (error) {
      setGlobalSuggestions([]);
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleWorkoutUpdate = (updatedWorkout: Workout) => {
    onUpdate({
      ...updatedWorkout,
      lastUpdated: new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const addExercise = (name: any = "") => {
    const newId = uuidv4();
    const exerciseName = typeof name === 'string' ? name : "";
    const newExercise: Exercise = {
      id: newId,
      name: exerciseName,
      category: "Principal",
      reps: "3x12",
      rest: "60s",
      gifUrl: ""
    };
    handleWorkoutUpdate({ ...workout, exercises: [...workout.exercises, newExercise] });
    
    if (exerciseName) {
      // Set search term for the new item so it shows up
      setSearchTerms(prev => ({ ...prev, [newId]: exerciseName }));
      // Trigger search to get description
      handleSearch(newId, exerciseName, undefined, true);
    }
  };

  const addCombo = (name: string) => {
    const combos: Record<string, Partial<Exercise>[]> = {
      "Peito/Tríceps": [
        { name: "Supino Reto", category: "Principal", reps: "3x10", rest: "60s", gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKv6eScgqW80zS0/giphy.gif" },
        { name: "Tríceps Corda", category: "Principal", reps: "3x12", rest: "45s", gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKv6eScgqW80zS0/giphy.gif" }
      ],
      "Costas/Bíceps": [
        { name: "Puxada Frontal", category: "Principal", reps: "3x10", rest: "60s", gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKv6eScgqW80zS0/giphy.gif" },
        { name: "Rosca Direta", category: "Principal", reps: "3x12", rest: "45s", gifUrl: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJ6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKv6eScgqW80zS0/giphy.gif" }
      ]
    };

    const selectedCombo = combos[name];
    if (selectedCombo) {
      const newExercises = selectedCombo.map(ex => ({
        ...ex,
        id: uuidv4()
      } as Exercise));
      handleWorkoutUpdate({ ...workout, exercises: [...workout.exercises, ...newExercises] });
    }
  };

  const duplicateExercise = (exercise: Exercise) => {
    const newId = uuidv4();
    const newExercise: Exercise = {
      ...exercise,
      id: newId
    };
    
    const originalIndex = workout.exercises.findIndex(ex => ex.id === exercise.id);
    const newExercises = [...workout.exercises];
    newExercises.splice(originalIndex + 1, 0, newExercise);
    
    handleWorkoutUpdate({ ...workout, exercises: newExercises });
    setHighlightedId(newId);
  };

  const updateExercise = (id: string, updates: Partial<Exercise>) => {
    const newExercises = workout.exercises.map(e => 
      e.id === id ? { ...e, ...updates } : e
    );
    handleWorkoutUpdate({ ...workout, exercises: newExercises });
  };

  const removeExercise = (id: string) => {
    handleWorkoutUpdate({ ...workout, exercises: workout.exercises.filter(e => e.id !== id) });
  };

  const optimizeWorkout = async () => {
    const toastId = toast.loading("Otimizando treino com IA...");
    try {
      const optimizedExercises = await wgerService.optimizeWorkout(workout);
      
      // Ensure all exercises have at least one set
      const validatedExercises = optimizedExercises.map(ex => {
        if (!ex.sets || ex.sets.length === 0) {
          return {
            ...ex,
            sets: [{ id: uuidv4(), reps: "12", load: "0" }],
            reps: "1 set"
          };
        }
        return ex;
      });

      handleWorkoutUpdate({ ...workout, exercises: validatedExercises });
      toast.success("Treino otimizado com sucesso!", {
        id: toastId,
        description: "Sequência otimizada por IA e séries validadas."
      });
    } catch (error) {
      console.error("Optimization error:", error);
      toast.error("Erro ao otimizar treino.", { id: toastId });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = workout.exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = workout.exercises.findIndex((ex) => ex.id === over.id);

      handleWorkoutUpdate({
        ...workout,
        exercises: arrayMove(workout.exercises, oldIndex, newIndex),
      });
    }
  };

  const handleSearch = async (id: string, term: string, muscle?: string, force: boolean = false) => {
    const currentTerm = term !== undefined ? term : (searchTerms[id] || "");
    const currentMuscle = muscle !== undefined ? muscle : (selectedMuscle[id] || "");
    
    setSearchTerms(prev => ({ ...prev, [id]: currentTerm }));
    setSelectedMuscle(prev => ({ ...prev, [id]: currentMuscle }));
    
    // Only search automatically if it's a muscle filter change, 
    // otherwise wait for the search button or Enter key
    if (!force && !muscle) return;

    if (currentTerm.length < 2 && !currentMuscle) {
      setSuggestions(prev => ({ ...prev, [id]: [] }));
      return;
    }

    setLoading(prev => ({ ...prev, [id]: true }));
    
    try {
      const results = await wgerService.searchExercises(currentTerm, currentMuscle);
      setSuggestions(prev => ({ ...prev, [id]: results }));
    } catch (error) {
      console.error("Search error:", error);
      setSuggestions(prev => ({ ...prev, [id]: [] }));
    } finally {
      setLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const selectSuggestion = (id: string, suggestion: WgerExercise) => {
    updateExercise(id, { 
      name: suggestion.name, 
      description: suggestion.description
    });
    setSuggestions(prev => ({ ...prev, [id]: [] }));
    setSearchTerms(prev => ({ ...prev, [id]: suggestion.name }));
  };

  const categories = ["Ativação", "Aquecimento", "Principal", "Abdominais", "Alongamentos"] as const;
  const repPresets = ["3x10", "3x12", "4x8", "4x10", "4x12", "5x5"];
  const restPresets = ["30s", "45s", "60s", "90s", "2min"];

  const stats = useMemo(() => {
    const totalExercises = workout.exercises.length;
    let totalSets = 0;
    const muscleVolume: Record<string, number> = {};

    workout.exercises.forEach(ex => {
      const match = ex.reps.match(/^(\d+)/);
      const sets = match ? parseInt(match[1]) : 0;
      totalSets += sets;
      
      // Simple muscle volume estimation based on name for now
      // In a real app, we'd store the muscle in the exercise object
      const muscle = ex.name.toLowerCase().includes("bench") ? "Peito" :
                     ex.name.toLowerCase().includes("lat") ? "Costas" :
                     ex.name.toLowerCase().includes("squat") ? "Pernas" : "Geral";
      
      muscleVolume[muscle] = (muscleVolume[muscle] || 0) + sets;
    });

    const estimatedTime = totalExercises * 2 + totalSets * 1; // 2 min per exercise transition + 1 min per set

    return { totalExercises, totalSets, estimatedTime, muscleVolume };
  }, [workout.exercises]);

  return (
    <div className="flex flex-col lg:flex-row gap-8 relative">
      <div className="flex-1 min-w-0 space-y-6">
        {/* Compact Search & Filter Library */}
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-4 top-1/2" />
              <input 
                type="text" 
                placeholder="Pesquisar na biblioteca de exercícios..."
                value={globalSearchTerm}
                onChange={e => handleGlobalSearch((e.target as HTMLInputElement).value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-1 focus:ring-red-500/20 focus:border-gym-red font-bold text-xs text-gray-900 transition-all placeholder:text-gray-500"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addExercise(globalSearchTerm);
                    setGlobalSearchTerm("");
                    setGlobalSuggestions([]);
                  }
                }}
              />
              {globalLoading && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 text-gym-red animate-spin" />
                </div>
              )}
              
              <AnimatePresence>
                {globalSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto overflow-x-hidden no-scrollbar"
                  >
                    {globalSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          addExercise(suggestion.name);
                          setGlobalSearchTerm("");
                          setGlobalSuggestions([]);
                        }}
                        className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between group transition-all"
                      >
                        <div>
                          <p className="text-xs font-bold text-gray-900 group-hover:text-gym-red transition-colors">{suggestion.name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">{suggestion.description}</p>
                        </div>
                        <Plus className="w-4 h-4 text-gray-300 group-hover:text-gym-red" />
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="flex gap-1 overflow-x-auto no-scrollbar w-full md:w-auto">
              {muscles.slice(0, 6).map(m => (
                <button
                  key={m}
                  onClick={() => setLibraryMuscle(libraryMuscle === m ? null : m)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 border ${
                    libraryMuscle === m 
                      ? 'bg-gym-red text-white border-gym-red shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Compact Suggestions Row */}
          {libraryMuscle && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2 overflow-x-auto no-scrollbar">
              {wgerService.getPopularExercises(libraryMuscle).map(exName => (
                <button
                  key={exName}
                  onClick={() => addExercise(exName)}
                  className="px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[10px] font-bold text-gray-700 transition-all whitespace-nowrap"
                >
                  {exName} +
                </button>
              ))}
            </div>
          )}
        </div>

        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={workout.exercises.map(ex => ex.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid gap-4">
              {workout.exercises.map((exercise, idx) => (
                <SortableExerciseItem 
                  key={exercise.id}
                  exercise={exercise}
                  idx={idx}
                  searchTerms={searchTerms}
                  suggestions={suggestions}
                  loading={loading}
                  selectedMuscle={selectedMuscle}
                  muscles={muscles}
                  handleSearch={handleSearch}
                  selectSuggestion={selectSuggestion}
                  updateExercise={updateExercise}
                  duplicateExercise={duplicateExercise}
                  removeExercise={removeExercise}
                  categories={categories}
                  repPresets={repPresets}
                  restPresets={restPresets}
                  setSearchTerms={setSearchTerms}
                  setSuggestions={setSuggestions}
                  isHighlighted={exercise.id === highlightedId}
                  accentColor={accentColor}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button 
          onClick={addExercise}
          className="w-full py-6 border-2 border-dashed border-gray-200 rounded-3xl text-gray-500 hover:text-gym-red hover:border-red-200 hover:bg-red-50 transition-all flex items-center justify-center gap-3 font-black uppercase text-xs tracking-[0.2em]"
        >
          <Plus className="w-5 h-5" />
          Novo Exercício
        </button>
      </div>

      {/* Sticky Sidebar Summary */}
      <div className="lg:w-80 shrink-0">
        <div className="lg:sticky lg:top-24 space-y-6">
          <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Resumo do Treino
              </h4>
              {workout.lastUpdated && (
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                  Atu: {workout.lastUpdated}
                </span>
              )}
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Exercícios</span>
                <span className="text-lg font-black text-gray-900">{stats.totalExercises}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Séries Totais</span>
                <span className="text-lg font-black text-gray-900">{stats.totalSets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500">Tempo Estimado</span>
                <div className="flex items-center gap-2 text-lg font-black text-gray-900">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {stats.estimatedTime}m
                </div>
              </div>

              <div className="pt-8 border-t border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-4 block">Distribuição de Volume</span>
                <div className="space-y-4">
                  {Object.entries(stats.muscleVolume).map(([muscle, volume]) => (
                    <div key={muscle} className="space-y-2">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                         <span className="text-gray-500">{muscle}</span>
                         <span className="text-gray-900">{volume} séries</span>
                      </div>
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gym-red transition-all duration-700 ease-out" 
                          style={{ width: `${Math.min(100, ((volume as number) / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={optimizeWorkout}
                className="w-full py-4 bg-gym-red text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md shadow-red-500/20 mt-4"
              >
                <Zap className="w-4 h-4" />
                Otimizar Treino
              </button>
            </div>
          </div>
        </div>
      </div>

      </div>
  );
}
