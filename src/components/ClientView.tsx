import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Dumbbell, 
  Activity, 
  Ruler, 
  ChevronRight, 
  ChevronDown,
  Calendar,
  Target,
  Trophy,
  Share2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { Student, Workout, Exercise } from "../types";
import ExerciseCard from "./ExerciseCard";
import { storageService } from "../services/storageService";

import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";

export default function ClientView() {
  const { shareSlug } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [activeWorkoutIdx, setActiveWorkoutIdx] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<Set<string>>(new Set());
  const [showMetrics, setShowMetrics] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStudent = async () => {
      if (shareSlug) {
        setLoading(true);
        const data = await storageService.getStudentBySlug(shareSlug);
        if (data) {
          setStudent(data);
        }
        setLoading(false);
      }
    };
    fetchStudent();
  }, [shareSlug]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <div className="w-12 h-12 border-4 border-neon-green border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gray-500">A carregar o teu plano de treino...</p>
    </div>
  );

  if (!student) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <Dumbbell className="w-16 h-16 text-gray-700 mb-4" />
      <h2 className="text-2xl font-bold">Plano não encontrado</h2>
      <p className="text-gray-500">O link pode estar incorreto ou o plano foi removido.</p>
    </div>
  );

  const currentWorkout = student.workouts[activeWorkoutIdx];
  const isWorkoutComplete = currentWorkout?.exercises.every(e => completedExercises.has(e.id));

  const chartData = student.evaluations.map(ev => ({
    date: ev.date,
    weight: ev.weight,
    bodyFat: ev.bodyFat || 0,
    muscleMass: ev.muscleMass || 0,
  }));

  const toggleExercise = (id: string) => {
    const newSet = new Set(completedExercises);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setCompletedExercises(newSet);

    // Check if this was the last one
    const allDone = currentWorkout.exercises.every(e => 
      e.id === id ? !completedExercises.has(id) : completedExercises.has(e.id)
    );

    if (allDone && !completedExercises.has(id)) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#00FF00", "#FF5F1F", "#ffffff"]
      });
    }
  };

  const categories = ["Ativação", "Aquecimento", "Principal", "Abdominais", "Alongamentos"] as const;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-24">
      {/* Header */}
      <header className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-neon-green/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{student.name}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Target className="w-4 h-4 text-neon-green" />
                <span>{student.goal}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link do seu plano copiado!");
                }}
                className="p-3 rounded-full bg-white/5 border border-gym-border text-gray-400 hover:text-white transition-all"
              >
                <Share2 className="w-5 h-5" />
              </button>
              <div className="p-3 rounded-full bg-neon-green/10">
                <Dumbbell className="w-6 h-6 text-neon-green" />
              </div>
            </div>
          </div>

          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1 text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Início: {student.startDate}</span>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <Activity className="w-3 h-3" />
              <span>Idade: {student.age}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics Accordion */}
      <section className="glass-card overflow-hidden">
        <button 
          onClick={() => setShowMetrics(!showMetrics)}
          className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-all"
        >
          <div className="flex items-center gap-2 font-bold">
            <Activity className="w-5 h-5 text-neon-orange" />
            <span>Minha Evolução</span>
          </div>
          {showMetrics ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        
        <AnimatePresence>
          {showMetrics && (
            <motion.div 
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              exit={{ height: 0 }}
              className="px-4 pb-4 space-y-4 overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-black/40 border border-gym-border h-64">
                <h4 className="text-[10px] font-black uppercase text-gray-500 mb-4">Comparativo de Avaliações</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#666" 
                      fontSize={10} 
                      tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    />
                    <YAxis stroke="#666" fontSize={10} />
                    <ChartTooltip 
                      contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px', fontSize: '10px' }}
                      itemStyle={{ padding: '0' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="weight" name="Peso" stroke="#00FF00" strokeWidth={2} dot={{ r: 4, fill: '#00FF00' }} />
                    <Line type="monotone" dataKey="bodyFat" name="% Gordura" stroke="#FF5F1F" strokeWidth={2} dot={{ r: 4, fill: '#FF5F1F' }} />
                    <Line type="monotone" dataKey="muscleMass" name="Massa Muscular" stroke="#00D1FF" strokeWidth={2} dot={{ r: 4, fill: '#00D1FF' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-black/40 border border-gym-border">
                  <p className="text-xs text-gray-500 uppercase">Peso Atual</p>
                  <p className="text-xl font-bold text-neon-green">{student.evaluations[student.evaluations.length-1].weight}kg</p>
                </div>
                <div className="p-3 rounded-lg bg-black/40 border border-gym-border">
                  <p className="text-xs text-gray-500 uppercase">IMC</p>
                  <p className="text-xl font-bold text-neon-orange">{student.evaluations[student.evaluations.length-1].bmi}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                  <Ruler className="w-3 h-3" /> Medidas (cm)
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-[10px] text-gray-500">Peito</p>
                    <p className="font-bold">{student.measurements[student.measurements.length-1].chest}</p>
                  </div>
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-[10px] text-gray-500">Bíceps D</p>
                    <p className="font-bold">{student.measurements[student.measurements.length-1].bicepsR}</p>
                  </div>
                  <div className="p-2 rounded bg-white/5">
                    <p className="text-[10px] text-gray-500">Cintura</p>
                    <p className="font-bold">{student.measurements[student.measurements.length-1].waist}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Workout Tabs */}
      <div className="flex gap-2 p-1 rounded-xl bg-gym-card border border-gym-border overflow-x-auto no-scrollbar">
        {student.workouts.map((workout, idx) => (
          <button
            key={workout.id}
            onClick={() => setActiveWorkoutIdx(idx)}
            className={`whitespace-nowrap px-6 py-3 rounded-lg font-bold transition-all ${
              activeWorkoutIdx === idx 
                ? "bg-neon-green text-gym-dark shadow-lg" 
                : "text-gray-400 hover:text-white"
            }`}
          >
            {workout.name}
          </button>
        ))}
      </div>

      {/* Exercises List */}
      <div className="space-y-8">
        {categories.map(category => {
          const categoryExercises = currentWorkout.exercises.filter(e => e.category === category);
          if (categoryExercises.length === 0) return null;

          return (
            <div key={category} className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-neon-green/70 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neon-green" />
                {category}
              </h3>
              
              <div className="space-y-3">
                {categoryExercises.map(exercise => (
                  <ExerciseCard 
                    key={exercise.id}
                    exercise={exercise}
                    isCompleted={completedExercises.has(exercise.id)}
                    onToggle={() => toggleExercise(exercise.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Celebration Overlay */}
      <AnimatePresence>
        {isWorkoutComplete && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-x-4 bottom-24 glass-card p-6 bg-neon-green text-gym-dark text-center z-50 neon-shadow-green"
          >
            <Trophy className="w-12 h-12 mx-auto mb-2" />
            <h2 className="text-2xl font-black uppercase italic">Treino Concluído!</h2>
            <p className="font-bold opacity-80">Excelente trabalho hoje. Continua focado!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
