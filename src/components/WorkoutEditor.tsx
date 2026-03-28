import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, GripVertical, Image as ImageIcon, Search, Loader2, Copy, X, ChevronRight, Clock, BarChart3, Zap, Eye } from "lucide-react";
import { Exercise, Workout } from "../types";
import { v4 as uuidv4 } from "uuid";
import { wgerService, WgerExercise } from "../services/wgerService";
import { motion, AnimatePresence } from "motion/react";
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
  setPreviewImage,
  categories,
  repPresets,
  restPresets,
  setSearchTerms,
  setSuggestions
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
    <div 
      ref={setNodeRef}
      style={style}
      className={`group flex flex-col md:flex-row items-start md:items-center gap-3 p-2 rounded-xl bg-white/5 border border-gym-border hover:border-neon-green/30 transition-all relative overflow-hidden ${isDragging ? 'opacity-50 ring-2 ring-neon-green/50' : ''}`}
    >
      {/* Drag Handle & Index */}
      <div className="flex items-center gap-2 shrink-0">
        <div {...attributes} {...listeners} className="p-1 hover:bg-white/10 rounded cursor-grab active:cursor-grabbing">
          <GripVertical className="w-5 h-5 text-gray-700 group-hover:text-neon-green" />
        </div>
        <span className="text-[10px] font-black text-gray-800 w-4">{idx + 1}</span>
      </div>

              {/* Exercise Search & Name */}
              <div 
                className="flex-1 min-w-0 w-full relative"
                onMouseEnter={() => setShowInfo(true)}
                onMouseLeave={() => setShowInfo(false)}
              >
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute w-3 h-3 text-gray-600 -translate-y-1/2 left-3 top-1/2" />
                    <input 
                      type="text" 
                      value={searchTerms[exercise.id] !== undefined ? searchTerms[exercise.id] : exercise.name}
                      onChange={e => setSearchTerms(prev => ({ ...prev, [exercise.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleSearch(exercise.id, searchTerms[exercise.id] || "", undefined, true)}
                      placeholder="Buscar exercício com IA..."
                      className="w-full bg-black/40 border border-gym-border rounded-lg py-1.5 pl-8 pr-10 focus:border-neon-green outline-hidden font-bold text-xs transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {loading[exercise.id] && (
                        <Loader2 className="w-3 h-3 text-neon-green animate-spin" />
                      )}
                      {(searchTerms[exercise.id] || exercise.name) && (
                        <button 
                          onClick={() => {
                            setSearchTerms(prev => ({ ...prev, [exercise.id]: "" }));
                            setSuggestions(prev => ({ ...prev, [exercise.id]: [] }));
                          }}
                          className="p-1 text-gray-600 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleSearch(exercise.id, searchTerms[exercise.id] || "", undefined, true)}
                    disabled={loading[exercise.id]}
                    className="px-3 py-1.5 bg-neon-green/10 border border-neon-green/30 rounded-lg text-[10px] font-black uppercase text-neon-green hover:bg-neon-green hover:text-black transition-all shrink-0 disabled:opacity-50"
                  >
                    {loading[exercise.id] ? "..." : "Buscar"}
                  </button>
                </div>

                {/* Tooltip for description in Editor */}
                <AnimatePresence>
                  {showInfo && exercise.description && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 bottom-full left-0 right-0 mb-2 p-3 bg-gym-dark border border-neon-green/30 rounded-xl shadow-2xl text-[10px] text-gray-300 pointer-events-none"
                    >
                      <p className="font-bold text-neon-green mb-1 uppercase tracking-wider">Instruções:</p>
                      {exercise.description}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Muscle Filters below Search Bar */}
                <div className="mt-1.5 flex gap-1 overflow-x-auto no-scrollbar pb-1">
                  <button 
                    onClick={() => handleSearch(exercise.id, searchTerms[exercise.id] || "", "", true)}
                    className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all shrink-0 border ${!selectedMuscle[exercise.id] ? 'bg-neon-green border-neon-green text-black' : 'bg-white/5 border-gym-border text-gray-500 hover:border-gray-700'}`}
                  >
                    Todos
                  </button>
                  {muscles.slice(0, 8).map((m: string) => (
                    <button 
                      key={m}
                      onClick={() => handleSearch(exercise.id, searchTerms[exercise.id] || "", m, true)}
                      className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase transition-all shrink-0 border ${selectedMuscle[exercise.id] === m ? 'bg-neon-green border-neon-green text-black' : 'bg-white/5 border-gym-border text-gray-500 hover:border-gray-700'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {(suggestions[exercise.id]?.length > 0 || (searchTerms[exercise.id]?.length >= 2 && !loading[exercise.id])) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute z-50 w-full mt-1 bg-gym-card border border-gym-border rounded-xl shadow-2xl max-h-80 overflow-y-auto"
                    >
                      {suggestions[exercise.id]?.length > 0 ? (
                        suggestions[exercise.id].map((s: any) => (
                  <button
                    key={s.id}
                    onClick={() => selectSuggestion(exercise.id, s)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-white/5 text-left border-b border-gym-border last:border-0 group/item"
                  >
                    {wgerService.getExerciseImage(s) ? (
                      <img 
                        src={wgerService.getExerciseImage(s)} 
                        className="w-10 h-10 rounded-lg object-cover border border-gym-border" 
                        alt={s.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-gym-border">
                        <ImageIcon className="w-4 h-4 text-gray-700" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold group-hover/item:text-neon-green transition-colors truncate">{s.name}</div>
                      <div className="text-[9px] text-gray-600 uppercase font-bold">{s.category} • {s.primaryMuscles[0]}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {wgerService.getExerciseImage(s) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage(wgerService.getExerciseImage(s) || null);
                          }}
                          className="p-1.5 text-gray-700 hover:text-blue-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-3 h-3 text-gray-800 group-hover/item:text-neon-green" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-gray-600 text-xs font-bold">
                  Nenhum exercício encontrado
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detailed Inputs */}
      <div className="flex flex-col gap-4 w-full mt-2 p-4 bg-black/20 rounded-xl border border-gym-border/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <select 
              value={exercise.category}
              onChange={e => updateExercise(exercise.id, { category: e.target.value as any })}
              className="bg-black/40 border border-gym-border rounded-lg px-2 py-1.5 text-[10px] font-bold focus:border-neon-green outline-hidden"
            >
              {categories.map((c: string) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button 
              onClick={() => exercise.gifUrl && setPreviewImage(exercise.gifUrl)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${exercise.gifUrl ? 'bg-neon-green/10 border-neon-green/30 text-neon-green hover:bg-neon-green hover:text-black' : 'bg-white/5 border-gym-border text-gray-800'}`}
            >
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => duplicateExercise(exercise)}
              className="p-2 text-gray-700 hover:text-blue-400 transition-colors"
              title="Duplicar"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={() => removeExercise(exercise.id)}
              className="p-2 text-gray-700 hover:text-red-500 transition-colors"
              title="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rep Type */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500">Tipo de Repetição</label>
            <div className="flex gap-1">
              {["Repetições", "Minutos", "Segundos"].map(type => (
                <button
                  key={type}
                  onClick={() => updateExercise(exercise.id, { repType: type as any })}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all border ${
                    (exercise.repType || "Repetições") === type 
                      ? "bg-neon-green border-neon-green text-black" 
                      : "bg-white/5 border-gym-border text-gray-400"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Load Unit */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500">Unidade de Carga</label>
            <div className="flex gap-1">
              {["Kg", "Libras", "Pesos", "%"].map(unit => (
                <button
                  key={unit}
                  onClick={() => updateExercise(exercise.id, { loadUnit: unit as any })}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold transition-all border ${
                    (exercise.loadUnit || "Kg") === unit 
                      ? "bg-neon-green border-neon-green text-black" 
                      : "bg-white/5 border-gym-border text-gray-400"
                  }`}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>

          {/* Rest Slider */}
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-gray-500 flex justify-between">
              Descanso entre séries <span>{exercise.rest}</span>
            </label>
            <input 
              type="range"
              min="0"
              max="300"
              step="5"
              value={parseInt(exercise.rest) || 60}
              onChange={e => updateExercise(exercise.id, { rest: `${e.target.value}s` })}
              className="w-full h-1.5 bg-gym-border rounded-lg appearance-none cursor-pointer accent-neon-green"
            />
          </div>
        </div>

        {/* Sets Management */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase text-gray-500">Número de Sets</label>
            <button 
              onClick={() => {
                const newSets = [...(exercise.sets || []), { id: uuidv4(), reps: "10", load: "0" }];
                updateExercise(exercise.id, { sets: newSets, reps: `${newSets.length} sets` });
              }}
              className="flex items-center gap-1 px-2 py-1 bg-neon-green/10 text-neon-green rounded-lg text-[9px] font-black uppercase hover:bg-neon-green hover:text-black transition-all"
            >
              <Plus className="w-3 h-3" /> Adicionar Set
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {(exercise.sets || []).map((set, sIdx) => (
              <div key={set.id} className="relative group/set p-2 bg-white/5 border border-gym-border rounded-lg space-y-1">
                <div className="text-[8px] font-black text-gray-600 uppercase">S{sIdx + 1}</div>
                <div className="flex flex-col gap-1">
                  <input 
                    type="text" 
                    value={set.reps}
                    onChange={e => {
                      const newSets = [...(exercise.sets || [])];
                      newSets[sIdx] = { ...set, reps: e.target.value };
                      updateExercise(exercise.id, { sets: newSets });
                    }}
                    placeholder="Reps"
                    className="w-full bg-transparent border-b border-gym-border text-[10px] font-bold focus:border-neon-green outline-hidden text-center"
                  />
                  <input 
                    type="text" 
                    value={set.load}
                    onChange={e => {
                      const newSets = [...(exercise.sets || [])];
                      newSets[sIdx] = { ...set, load: e.target.value };
                      updateExercise(exercise.id, { sets: newSets });
                    }}
                    placeholder="Carga"
                    className="w-full bg-transparent border-b border-gym-border text-[10px] font-bold focus:border-neon-green outline-hidden text-center"
                  />
                </div>
                <button 
                  onClick={() => {
                    const newSets = (exercise.sets || []).filter(s => s.id !== set.id);
                    updateExercise(exercise.id, { sets: newSets, reps: `${newSets.length} sets` });
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover/set:opacity-100 flex items-center justify-center transition-all"
                >
                  <X className="w-2 h-2" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutEditor({ workout, onUpdate, accentColor = "var(--neon-green)" }: WorkoutEditorProps) {
  const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});
  const [suggestions, setSuggestions] = useState<Record<string, WgerExercise[]>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [selectedMuscle, setSelectedMuscle] = useState<Record<string, string>>({});
  const [muscles, setMuscles] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [libraryMuscle, setLibraryMuscle] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    wgerService.getMuscles().then(setMuscles);
  }, []);

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
    onUpdate({ ...workout, exercises: [...workout.exercises, newExercise] });
    
    if (exerciseName) {
      // Set search term for the new item so it shows up
      setSearchTerms(prev => ({ ...prev, [newId]: exerciseName }));
      // Trigger search to get image/description
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
      onUpdate({ ...workout, exercises: [...workout.exercises, ...newExercises] });
    }
  };

  const duplicateExercise = (exercise: Exercise) => {
    const newExercise: Exercise = {
      ...exercise,
      id: uuidv4()
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = workout.exercises.findIndex((ex) => ex.id === active.id);
      const newIndex = workout.exercises.findIndex((ex) => ex.id === over.id);

      onUpdate({
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
    const imageUrl = wgerService.getExerciseImage(suggestion);
    updateExercise(id, { 
      name: suggestion.name, 
      gifUrl: imageUrl || "",
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
    <div className="flex flex-col lg:flex-row gap-6 relative">
      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500">Exercícios</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => addCombo("Peito/Tríceps")}
              className="px-2 py-1 bg-white/5 border border-gym-border rounded-lg text-[9px] font-bold uppercase text-gray-400 hover:text-neon-green hover:border-neon-green/30 transition-all"
            >
              + Combo Peito
            </button>
            <button 
              onClick={() => addCombo("Costas/Bíceps")}
              className="px-2 py-1 bg-white/5 border border-gym-border rounded-lg text-[9px] font-bold uppercase text-gray-400 hover:text-neon-green hover:border-neon-green/30 transition-all"
            >
              + Combo Costas
            </button>
          </div>
        </div>

        {/* Quick Library Section */}
        <div className="bg-gym-card border border-gym-border rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-neon-green flex items-center gap-2">
              <Zap className="w-3 h-3" /> Biblioteca Rápida
            </h4>
            <div className="relative w-48">
              <Search className="absolute w-3 h-3 text-gray-600 -translate-y-1/2 left-3 top-1/2" />
              <input 
                type="text" 
                placeholder="Procurar na biblioteca..."
                className="w-full bg-black/40 border border-gym-border rounded-lg py-1 pl-8 pr-4 focus:border-neon-green outline-hidden font-bold text-[9px] transition-all"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    addExercise(e.currentTarget.value);
                    e.currentTarget.value = "";
                  }
                }}
              />
            </div>
          </div>

          {/* Muscle Selection */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {muscles.map(m => (
              <button
                key={m}
                onClick={() => setLibraryMuscle(libraryMuscle === m ? null : m)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 border ${
                  libraryMuscle === m 
                    ? 'bg-neon-green border-neon-green text-black shadow-lg shadow-neon-green/20' 
                    : 'bg-white/5 border-gym-border text-gray-500 hover:border-gray-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Popular Exercises for selected muscle or Global Popular */}
          <AnimatePresence mode="wait">
            <motion.div
              key={libraryMuscle || 'global'}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2"
            >
              {wgerService.getPopularExercises(libraryMuscle).map(exName => (
                <button
                  key={exName}
                  onClick={() => addExercise(exName)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-black/40 border border-gym-border hover:border-neon-green/40 hover:bg-neon-green/5 transition-all group text-left"
                >
                  <span className="text-[10px] font-bold text-gray-300 group-hover:text-neon-green transition-colors line-clamp-1">{exName}</span>
                  <span className="text-[8px] text-gray-600 uppercase font-black mt-1">Adicionar +</span>
                </button>
              ))}
              
              {/* AI Search Trigger for this muscle */}
              {libraryMuscle && (
                <button
                  onClick={() => {
                    const newId = uuidv4();
                    const newEx: Exercise = { id: newId, name: "", category: "Principal", reps: "3x12", rest: "60s", gifUrl: "" };
                    onUpdate({ ...workout, exercises: [...workout.exercises, newEx] });
                    handleSearch(newId, "", libraryMuscle, true);
                  }}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-neon-green/5 border border-dashed border-neon-green/30 hover:border-neon-green transition-all group text-left"
                >
                  <span className="text-[10px] font-bold text-neon-green/80 group-hover:text-neon-green transition-colors">Mais com IA...</span>
                  <span className="text-[8px] text-neon-green/40 uppercase font-black mt-1">Explorar</span>
                </button>
              )}
            </motion.div>
          </AnimatePresence>
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
            <div className="grid gap-2">
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
                  setPreviewImage={setPreviewImage}
                  categories={categories}
                  repPresets={repPresets}
                  restPresets={restPresets}
                  setSearchTerms={setSearchTerms}
                  setSuggestions={setSuggestions}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <button 
          onClick={addExercise}
          className="w-full py-4 border-2 border-dashed border-gym-border rounded-2xl text-gray-600 hover:text-neon-green hover:border-neon-green/50 hover:bg-neon-green/5 transition-all flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest"
        >
          <Plus className="w-5 h-5" />
          Adicionar Exercício
        </button>
      </div>

      {/* Sticky Sidebar Summary */}
      <div className="lg:w-64 shrink-0">
        <div className="lg:sticky lg:top-24 space-y-4">
          <div className="glass-card p-5 border-neon-green/20">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-neon-green" />
              Resumo do Treino
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Exercícios</span>
                <span className="text-sm font-bold">{stats.totalExercises}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Séries Totais</span>
                <span className="text-sm font-bold text-blue-400">{stats.totalSets}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Tempo Estimado</span>
                <div className="flex items-center gap-1 text-sm font-bold text-neon-orange">
                  <Clock className="w-3 h-3" />
                  {stats.estimatedTime} min
                </div>
              </div>

              <div className="pt-4 border-t border-gym-border">
                <span className="text-[10px] font-black uppercase text-gray-600 mb-2 block">Volume por Grupo</span>
                <div className="space-y-2">
                  {Object.entries(stats.muscleVolume).map(([muscle, volume]) => (
                    <div key={muscle} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold">
                         <span>{muscle}</span>
                         <span>{volume} séries</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-neon-green transition-all duration-500" 
                          style={{ width: `${Math.min(100, ((volume as number) / 20) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full py-3 bg-neon-green text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Zap className="w-3 h-3" />
                Otimizar Treino
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full aspect-square bg-gym-card border border-gym-border rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={previewImage} 
                className="w-full h-full object-contain" 
                alt="Preview" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  const parent = (e.target as HTMLImageElement).parentElement;
                  if (parent) {
                    const msg = document.createElement('div');
                    msg.className = 'text-gray-500 text-xs font-bold text-center p-8';
                    msg.innerText = 'Imagem não disponível. Verifique as instruções no card do exercício.';
                    parent.appendChild(msg);
                  }
                }}
              />
              <button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500 text-white rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
