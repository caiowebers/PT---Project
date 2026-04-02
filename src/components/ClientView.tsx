import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  ChevronDown,
  ChevronUp,
  FileText,
  History,
  CheckCircle2,
  Check,
  X,
  Calendar as CalendarIcon,
  Activity,
  Dumbbell,
  ExternalLink,
  Info,
  Loader2,
  MessageSquare,
  Sparkles,
  TrendingUp,
  Scale,
  Target,
  User,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Student, ClassSession, Exercise, AdminSettings, CompletedWorkout, Workout } from "../types";
import { storageService } from "../services/storageService";
import { v4 as uuidv4 } from "uuid";
import { wgerService } from "../services/wgerService";
import { format, parseISO, addHours, startOfWeek, endOfWeek, isSameWeek, isPast, isToday, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function ClientView() {
  const { shareSlug } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"saude" | "treino" | "agenda" | "historico">("treino");
  const [completionDate, setCompletionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [completionTime, setCompletionTime] = useState(format(new Date(), "HH:mm"));
  const [aiDescriptions, setAiDescriptions] = useState<Record<string, string>>({});
  const [generatingDesc, setGeneratingDesc] = useState<Record<string, boolean>>({});
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [workoutFeedback, setWorkoutFeedback] = useState("");
  const [skippedExercises, setSkippedExercises] = useState<Record<string, string[]>>({});
  const [difficulties, setDifficulties] = useState<Record<string, string>>({});
  const [personalObservations, setPersonalObservations] = useState<Record<string, string>>({});
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});
  const [expandedWorkouts, setExpandedWorkouts] = useState<Record<string, boolean>>({});
  const [isFinishing, setIsFinishing] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestData, setRequestData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    notes: ""
  });
  const [isRequesting, setIsRequesting] = useState(false);
  
  useEffect(() => {
    // Expand current week by default
    const currentWeekKey = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    setExpandedWeeks({ [currentWeekKey]: true });
  }, []);

  useEffect(() => {
    let unsubscribeSessions: (() => void) | null = null;

    const fetchStudent = async () => {
      if (shareSlug) {
        setLoading(true);
        const data = await storageService.getStudentBySlug(shareSlug);
        if (data) {
          setStudent(data);
          
          // Subscribe to sessions for this student in real-time
          unsubscribeSessions = storageService.subscribeToStudentSessions(data.id, (sessionsData) => {
            setSessions(sessionsData);
          });

          // Fetch admin settings for the logo
          if (data.adminId) {
            const settings = await storageService.getAdminSettings(data.adminId);
            if (settings) {
              setAdminSettings(settings);
            }
          }
        }
        setLoading(false);
      }
    };
    fetchStudent();

    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
    };
  }, [shareSlug]);

  const generateDescription = async (exercise: Exercise) => {
    if (aiDescriptions[exercise.id] || generatingDesc[exercise.id]) return;
    
    setGeneratingDesc(prev => ({ ...prev, [exercise.id]: true }));
    try {
      const desc = await wgerService.generateExerciseDescription(exercise.name);
      setAiDescriptions(prev => ({ ...prev, [exercise.id]: desc }));
      
      if (student && student.workouts) {
        const updatedWorkouts = student.workouts.map(w => ({
          ...w,
          exercises: w.exercises.map(e => e.id === exercise.id ? { ...e, description: desc } : e)
        }));
        setStudent(prev => prev ? ({ ...prev, workouts: updatedWorkouts }) : null);
        await storageService.updateStudentWorkouts(student.id, updatedWorkouts);
      }
    } catch (error) {
      console.error("Error generating description:", error);
    } finally {
      setGeneratingDesc(prev => ({ ...prev, [exercise.id]: false }));
    }
  };

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const groupSessionsByWeek = (sessions: ClassSession[]) => {
    const groups: Record<string, ClassSession[]> = {};
    
    sessions.forEach(session => {
      const start = parseISO(session.start);
      const weekStart = startOfWeek(start, { weekStartsOn: 1 });
      const key = format(weekStart, "yyyy-MM-dd");
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(session);
    });
    
    return groups;
  };

  const finishWorkout = async (workout: Workout, sessionId?: string) => {
    if (!student) return;
    
    const completedIds = Object.entries(completedExercises)
      .filter(([id, completed]) => {
        return completed && workout.exercises.some(e => e.id === id);
      })
      .map(([id]) => id);

    const skippedIds = workout.exercises
      .filter(e => !completedExercises[e.id])
      .map(e => e.id);

    if (completedIds.length === 0 && skippedIds.length === workout.exercises.length) {
      toast.error("Marque pelo menos um exercício como concluído!");
      return;
    }

    setIsFinishing(sessionId || workout.id);
    try {
      const combinedDateTime = parseISO(`${completionDate}T${completionTime}`);
      const newCompletedWorkout: CompletedWorkout = {
        id: uuidv4(),
        workoutId: workout.id,
        workoutName: workout.name,
        date: combinedDateTime.toISOString(),
        feedback: workoutFeedback,
        rating: 5,
        exercisesCompleted: completedIds,
        skippedExercises: skippedIds,
        difficulties: difficulties[sessionId || workout.id] || "",
        personalObservations: personalObservations[sessionId || workout.id] || "",
        status: 'completed',
        sessionId: sessionId
      };

      const updatedHistory = [newCompletedWorkout, ...(student.workoutHistory || [])];
      setStudent({ ...student, workoutHistory: updatedHistory });
      await storageService.updateStudentWorkoutHistory(student.id, updatedHistory);
      
      if (sessionId) {
        await storageService.updateSessionStatus(sessionId, 'completed');
      }

      // Clear states for this specific workout/session
      const key = sessionId || workout.id;
      setCompletedExercises(prev => {
        const next = { ...prev };
        workout.exercises.forEach(e => delete next[e.id]);
        return next;
      });
      setWorkoutFeedback("");
      setDifficulties(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setPersonalObservations(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      setIsFinishing(null);
      toast.success("Treino concluído! Bom trabalho!");
      setActiveTab("historico");
    } catch (error) {
      console.error("Error finishing workout:", error);
      setIsFinishing(null);
    }
  };

  const handleRequestSession = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!student) return;

    setIsRequesting(true);
    try {
      const start = parseISO(`${requestData.date}T${requestData.time}`);
      const end = addHours(start, 1);
      
      await storageService.salvarAula(
        student.id,
        start,
        end,
        student.name,
        "Solicitação de Treino",
        requestData.notes,
        "",
        "pending"
      );
      
      toast.success("Solicitação enviada ao instrutor!");
      setIsRequestModalOpen(false);
    } catch (error) {
      console.error("Error requesting session:", error);
      toast.error("Falha ao enviar solicitação.");
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gym-bg">
      <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gym-muted">A carregar...</p>
    </div>
  );

  if (!student) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gym-bg">
      <h2 className="text-2xl font-bold text-gym-text">Plano não encontrado</h2>
      <p className="text-gym-muted">O link pode estar incorreto ou o plano foi removido.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gym-bg pb-32 font-sans text-gym-text relative">
      {/* Header - Black Background */}
      <div className="bg-black h-48 w-full rounded-b-3xl relative flex items-center justify-center">
        {adminSettings?.logoUrl ? (
          <div className="max-w-[200px] max-h-[100px] flex items-center justify-center">
            <img src={adminSettings.logoUrl} alt="Logo" className="w-full h-full object-contain" />
          </div>
        ) : (
          <div className="text-white text-center font-black uppercase tracking-tighter leading-tight">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-8 h-4 border-t-4 border-b-4 border-white relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-white" />
              </div>
            </div>
            <div className="text-2xl">{adminSettings?.instructorName || "PABLO BATISTA"}</div>
            <div className="text-[10px] tracking-widest font-medium">PERSONAL TRAINER</div>
          </div>
        )}
      </div>

      {/* Student Info Card */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 border-2 border-white shadow-sm">
            {student.photoUrl ? (
              <img 
                src={student.photoUrl} 
                alt={student.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}&backgroundColor=e2e8f0`} 
                alt={student.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="font-mono text-sm leading-relaxed text-gray-800">
            <div className="font-bold text-lg mb-1">{student.name}</div>
            <div className="text-gray-600">{student.age} anos</div>
            <div className="text-gray-600">{student.goal}</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-6 mt-8">
        <AnimatePresence mode="wait">
          {activeTab === "saude" && (
            <motion.div 
              key="saude"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-gray-800">Minha Saúde</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">Peso</div>
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[student.evaluations.length - 1]?.weight || "--"} <span className="text-sm font-medium text-gray-400">kg</span></div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">Altura</div>
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[student.evaluations.length - 1]?.height || "--"} <span className="text-sm font-medium text-gray-400">cm</span></div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">IMC</div>
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[student.evaluations.length - 1]?.bmi || "--"}</div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">Gordura</div>
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[student.evaluations.length - 1]?.bodyFat || "--"} <span className="text-sm font-medium text-gray-400">%</span></div>
                </div>
              </div>

              {/* Feedback Section */}
              {student.personalFeedback && (
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-black" />
                    Feedback do Personal
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{student.personalFeedback}"
                  </p>
                </div>
              )}

              {/* Charts Section */}
              <div className="space-y-6">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-black" />
                      Evolução de Peso
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={student.evaluations}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{fontSize: 10, fill: '#9ca3af'}} 
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => format(parseISO(val), 'dd/MM')}
                        />
                        <YAxis 
                          tick={{fontSize: 10, fill: '#9ca3af'}} 
                          axisLine={false}
                          tickLine={false}
                          domain={['dataMin - 5', 'dataMax + 5']}
                        />
                        <Tooltip 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                          labelFormatter={(val) => format(parseISO(val), 'dd/MM/yyyy')}
                        />
                        <Area type="monotone" dataKey="weight" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                      <Target className="w-4 h-4 text-black" />
                      Composição Corporal
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={student.evaluations}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          tick={{fontSize: 10, fill: '#9ca3af'}} 
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => format(parseISO(val), 'dd/MM')}
                        />
                        <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Line type="monotone" dataKey="bodyFat" name="Gordura (%)" stroke="#f97316" strokeWidth={3} dot={{r: 4, fill: '#f97316'}} />
                        <Line type="monotone" dataKey="muscleMass" name="Massa Muscular (kg)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "treino" && (
            <motion.div 
              key="treino"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-gray-800">Meu Treino</h2>
              </div>

              {/* Weekly Tracker */}
              {(() => {
                const weekSessions = sessions.filter(s => isSameWeek(parseISO(s.start), new Date(), { weekStartsOn: 1 }));
                const completedCount = weekSessions.filter(s => s.status === 'completed').length;
                const totalCount = weekSessions.length;
                const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

                return totalCount > 0 ? (
                  <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600">Tracker Semanal</h3>
                      <span className="text-sm font-bold text-black">{completedCount}/{totalCount} treinos concluídos</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-black"
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-right">{percentage}% concluído</p>
                  </div>
                ) : null;
              })()}

              {/* Training Plans Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 px-2 flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-black" />
                  Planos de Treino Sugeridos
                </h3>
                {student.workouts && student.workouts.length > 0 ? (
                  student.workouts.map((workout) => (
                    <div key={workout.id} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-50">
                      <button 
                        onClick={() => setExpandedWorkouts(prev => ({ ...prev, [workout.id]: !prev[workout.id] }))}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{workout.name}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {workout.exercises.length} exercícios • Foco: {workout.exercises[0]?.muscleGroup || "Geral"}
                            </p>
                          </div>
                          {expandedWorkouts[workout.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedWorkouts[workout.id] && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden pt-6 space-y-6 border-t border-gray-50 mt-4"
                          >
                            <div className="space-y-3">
                              {workout.exercises.map((exercise, index) => (
                                <div key={exercise.id} className="p-4 rounded-2xl bg-gray-50 space-y-3">
                                  <div className="flex items-center gap-4">
                                    <button 
                                      onClick={() => toggleExercise(exercise.id)}
                                      className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center font-bold flex-shrink-0 transition-all ${completedExercises[exercise.id] ? 'bg-green-500 text-white' : 'bg-white text-gray-400'}`}
                                    >
                                      {completedExercises[exercise.id] ? <Check className="w-5 h-5" /> : index + 1}
                                    </button>
                                    <div className="flex-1 min-w-0">
                                      <div className={`font-bold text-sm truncate ${completedExercises[exercise.id] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{exercise.name}</div>
                                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{exercise.reps} • {exercise.rest}</div>
                                    </div>
                                    <a 
                                      href={`https://www.google.com/search?q=${encodeURIComponent(exercise.name)}+exercise&tbm=isch`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="space-y-4 pt-4 border-t border-gray-100">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Data de Conclusão</label>
                                  <input 
                                    type="date"
                                    value={completionDate}
                                    onChange={(e) => setCompletionDate(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Horário</label>
                                  <input 
                                    type="time"
                                    value={completionTime}
                                    onChange={(e) => setCompletionTime(e.target.value)}
                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Dificuldades / O que pulou</label>
                                <textarea 
                                  value={difficulties[workout.id] || ""}
                                  onChange={(e) => setDifficulties(prev => ({ ...prev, [workout.id]: e.target.value }))}
                                  placeholder="Ex: Pulei o último exercício por falta de tempo..."
                                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all min-h-[60px]"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Observações Pessoais</label>
                                <textarea 
                                  value={personalObservations[workout.id] || ""}
                                  onChange={(e) => setPersonalObservations(prev => ({ ...prev, [workout.id]: e.target.value }))}
                                  placeholder="Ex: Senti um pouco de dor no ombro..."
                                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all min-h-[60px]"
                                />
                              </div>
                              <button 
                                onClick={() => finishWorkout(workout)}
                                disabled={isFinishing === workout.id}
                                className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/20 hover:bg-gray-900 transition-all disabled:opacity-50"
                              >
                                {isFinishing === workout.id ? (
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-5 h-5" />
                                    Concluir Treino
                                  </>
                                )}
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-[32px] p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-center">
                    <Dumbbell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Nenhum plano de treino sugerido ainda.</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 px-2 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-black" />
                  Aulas Agendadas
                </h3>
                {Object.entries(groupSessionsByWeek(sessions))
                  .sort((a, b) => b[0].localeCompare(a[0])) // Most recent weeks first
                  .map(([weekKey, weekSessions]) => {
                    const weekStart = parseISO(weekKey);
                    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                    const isCurrentWeek = isSameWeek(weekStart, new Date(), { weekStartsOn: 1 });
                    
                    return (
                      <div key={weekKey} className="space-y-3">
                        <button 
                          onClick={() => setExpandedWeeks(prev => ({ ...prev, [weekKey]: !prev[weekKey] }))}
                          className="w-full flex items-center justify-between px-4 py-3 bg-gray-100/50 rounded-2xl hover:bg-gray-100 transition-all"
                        >
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                            Semana {format(weekStart, "d 'a' d 'de' MMMM", { locale: ptBR })}
                            {isCurrentWeek && <span className="ml-2 text-black">(Atual)</span>}
                          </span>
                          {expandedWeeks[weekKey] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        <AnimatePresence>
                          {expandedWeeks[weekKey] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden space-y-4"
                            >
                              {weekSessions
                                .sort((a, b) => a.start.localeCompare(b.start))
                                .map(session => {
                                  const sessionDate = parseISO(session.start);
                                  const workout = student.workouts.find(w => w.name === session.workoutTitle) || student.workouts[0];
                                  const isMissed = isPast(sessionDate) && !isToday(sessionDate) && session.status !== 'completed';
                                  const statusColor = session.status === 'completed' ? 'bg-green-500' : isMissed ? 'bg-red-500' : 'bg-yellow-500';
                                  const statusIcon = session.status === 'completed' ? '🟢' : isMissed ? '🔴' : '🟡';
                                  const statusText = session.status === 'completed' ? 'Concluído' : isMissed ? 'Faltou' : 'Pendente';

                                  return (
                                    <div key={session.id} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-50">
                                      <button 
                                        onClick={() => setExpandedWorkouts(prev => ({ ...prev, [session.id]: !prev[session.id] }))}
                                        className="w-full text-left"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
                                            <h3 className="font-bold text-gray-900 text-lg">{session.workoutTitle}</h3>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                              {format(sessionDate, "EEEE, d", { locale: ptBR })}
                                            </span>
                                            {expandedWorkouts[session.id] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2 mb-4">
                                          <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                            {statusIcon} {statusText}
                                          </span>
                                        </div>
                                      </button>

                                      <AnimatePresence>
                                        {expandedWorkouts[session.id] && workout && (
                                          <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden pt-4 space-y-6 border-t border-gray-50"
                                          >
                                            <div className="space-y-3">
                                              {workout.exercises.map((exercise, index) => (
                                                <div key={exercise.id} className="p-4 rounded-2xl bg-gray-50 space-y-3">
                                                  <div className="flex items-center gap-4">
                                                    <button 
                                                      onClick={() => toggleExercise(exercise.id)}
                                                      className={`w-10 h-10 rounded-xl shadow-sm flex items-center justify-center font-bold flex-shrink-0 transition-all ${completedExercises[exercise.id] ? 'bg-green-500 text-white' : 'bg-white text-gray-400'}`}
                                                    >
                                                      {completedExercises[exercise.id] ? <Check className="w-5 h-5" /> : index + 1}
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                      <div className={`font-bold text-sm truncate ${completedExercises[exercise.id] ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{exercise.name}</div>
                                                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{exercise.reps} • {exercise.rest}</div>
                                                    </div>
                                                    <a 
                                                      href={`https://www.google.com/search?q=${encodeURIComponent(exercise.name)}+exercise&tbm=isch`}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                    >
                                                      <ExternalLink className="w-4 h-4" />
                                                    </a>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>

                                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                              <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Data de Conclusão</label>
                                                  <input 
                                                    type="date"
                                                    value={completionDate}
                                                    onChange={(e) => setCompletionDate(e.target.value)}
                                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all"
                                                  />
                                                </div>
                                                <div>
                                                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Horário</label>
                                                  <input 
                                                    type="time"
                                                    value={completionTime}
                                                    onChange={(e) => setCompletionTime(e.target.value)}
                                                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all"
                                                  />
                                                </div>
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Dificuldades / O que pulou</label>
                                                <textarea 
                                                  value={difficulties[session.id] || ""}
                                                  onChange={(e) => setDifficulties(prev => ({ ...prev, [session.id]: e.target.value }))}
                                                  placeholder="Ex: Pulei o último exercício por falta de tempo..."
                                                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all min-h-[60px]"
                                                />
                                              </div>
                                              <div>
                                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Observações Pessoais</label>
                                                <textarea 
                                                  value={personalObservations[session.id] || ""}
                                                  onChange={(e) => setPersonalObservations(prev => ({ ...prev, [session.id]: e.target.value }))}
                                                  placeholder="Ex: Senti um pouco de dor no ombro..."
                                                  className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-black/5 transition-all min-h-[60px]"
                                                />
                                              </div>
                                              <button 
                                                onClick={() => finishWorkout(workout, session.id)}
                                                disabled={isFinishing === session.id}
                                                className="w-full bg-black text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-black/20 hover:bg-gray-900 transition-all disabled:opacity-50"
                                              >
                                                {isFinishing === session.id ? (
                                                  <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                  <>
                                                    <CheckCircle2 className="w-5 h-5" />
                                                    Concluir Treino
                                                  </>
                                                )}
                                              </button>
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                
                {sessions.length === 0 && (
                  <div className="bg-white rounded-[32px] p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-center">
                    <CalendarIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Nenhum treino agendado.</p>
                    <button 
                      onClick={() => setActiveTab("agenda")}
                      className="mt-4 text-black font-bold text-sm hover:underline"
                    >
                      Agendar agora
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "historico" && (
            <motion.div 
              key="historico"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-gray-800">Relatórios e Evolução</h2>
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-xs font-bold shadow-sm hover:shadow-md transition-all"
                >
                  <FileText className="w-4 h-4" />
                  Exportar PDF
                </button>
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total de Treinos</div>
                  <div className="text-2xl font-black text-black">{student.workoutHistory?.length || 0}</div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Adesão Média</div>
                  <div className="text-2xl font-black text-black">
                    {(() => {
                      const weekSessions = sessions.filter(s => isSameWeek(parseISO(s.start), new Date(), { weekStartsOn: 1 }));
                      const completed = weekSessions.filter(s => s.status === 'completed').length;
                      return weekSessions.length > 0 ? Math.round((completed / weekSessions.length) * 100) : 0;
                    })()}%
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="space-y-6">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 mb-6">Adesão Semanal</h3>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={(() => {
                        const last4Weeks = [3, 2, 1, 0].map(weeksAgo => {
                          const date = startOfWeek(addHours(new Date(), -weeksAgo * 7 * 24), { weekStartsOn: 1 });
                          const weekSessions = sessions.filter(s => isSameWeek(parseISO(s.start), date, { weekStartsOn: 1 }));
                          const completed = weekSessions.filter(s => s.status === 'completed').length;
                          return {
                            name: format(date, "d/MM"),
                            completed: completed,
                            total: weekSessions.length
                          };
                        });
                        return last4Weeks;
                      })()}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                        <Tooltip 
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                        />
                        <Area type="monotone" dataKey="completed" name="Treinos Concluídos" stroke="#000" fill="rgba(0,0,0,0.05)" strokeWidth={3} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detailed History List */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 px-2">Histórico Detalhado</h3>
                {student.workoutHistory && student.workoutHistory.length > 0 ? (
                  student.workoutHistory.map((workout) => (
                    <div key={workout.id} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-gray-50">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-gray-900">{workout.workoutName}</h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {format(parseISO(workout.date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <div key={star} className={`w-1.5 h-1.5 rounded-full ${star <= (workout.rating || 5) ? 'bg-black' : 'bg-gray-200'}`} Star />
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1 bg-gray-50 rounded-2xl p-3">
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Exercícios</div>
                            <div className="text-xs font-bold text-gray-900">{workout.exercisesCompleted.length} concluídos</div>
                          </div>
                          {workout.skippedExercises && workout.skippedExercises.length > 0 && (
                            <div className="flex-1 bg-red-50 rounded-2xl p-3">
                              <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Pulados</div>
                              <div className="text-xs font-bold text-red-900">{workout.skippedExercises.length} exercícios</div>
                            </div>
                          )}
                        </div>

                        {(workout.difficulties || workout.personalObservations || workout.feedback) && (
                          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                            {workout.difficulties && (
                              <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Dificuldades</div>
                                <p className="text-xs text-gray-600 italic mt-1">"{workout.difficulties}"</p>
                              </div>
                            )}
                            {workout.personalObservations && (
                              <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Observações</div>
                                <p className="text-xs text-gray-600 italic mt-1">"{workout.personalObservations}"</p>
                              </div>
                            )}
                            {workout.feedback && (
                              <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Feedback Geral</div>
                                <p className="text-xs text-gray-600 italic mt-1">"{workout.feedback}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-[32px] p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-center">
                    <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Nenhum treino no histórico ainda.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "agenda" && (
            <motion.div 
              key="agenda"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-bold text-gray-800">Minha Agenda</h2>
                <button 
                  onClick={() => setIsRequestModalOpen(true)}
                  className="bg-black px-6 py-2 rounded-full text-sm font-bold shadow-md shadow-black/20 text-white hover:bg-gray-900 transition-all"
                >
                  Marcar
                </button>
              </div>

              {/* Agenda List */}
              <div className="space-y-4">
                {sessions.length > 0 ? [...sessions].sort((a, b) => a.start.localeCompare(b.start)).map(session => {
                  const start = parseISO(session.start);
                  const end = parseISO(session.end);
                  
                  return (
                    <div key={session.id} className="bg-white rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Time Column */}
                        <div className="flex flex-col items-center justify-between h-16 text-xs font-medium text-gray-600 relative">
                          <div>{format(start, "HH:mm")}</div>
                          <div className="w-px h-6 bg-gray-200 my-1" />
                          <div className="text-black font-bold">{format(end, "HH:mm")}</div>
                        </div>

                        {/* Details */}
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">{session.workoutTitle || "Sessão de Treino"}</h3>
                          <p className="text-xs text-gray-600 mt-1 capitalize">
                            {format(start, "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </p>
                        </div>
                      </div>

                      {/* Right Side (Instructor + Status) */}
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                            <img 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Pablo&backgroundColor=f3f4f6`} 
                              alt="Instructor"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="text-[9px] text-gray-400 mt-1.5 font-medium uppercase tracking-wider">Instrutor</span>
                        </div>
                        
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          session.status === 'completed' ? 'bg-green-50 text-green-600' :
                          session.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                          'bg-gray-50 text-gray-400'
                        }`}>
                          {session.status === 'completed' ? (
                            <Check className="w-5 h-5" />
                          ) : session.status === 'cancelled' ? (
                            <X className="w-5 h-5" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="bg-white rounded-[32px] p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-center">
                    <CalendarIcon className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Nenhuma aula agendada no momento.</p>
                    <button 
                      onClick={() => setIsRequestModalOpen(true)}
                      className="mt-4 text-black font-bold text-sm hover:underline"
                    >
                      Solicitar um horário
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session Request Modal */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100"
            >
              <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">Solicitar Treino</h3>
                  <p className="text-sm text-gray-400 font-medium mt-1">Escolha o melhor horário para você</p>
                </div>
                <button 
                  onClick={() => setIsRequestModalOpen(false)} 
                  className="p-2.5 hover:bg-gray-50 rounded-2xl transition-all text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleRequestSession} className="p-8 pt-4 space-y-6">
                {/* Student Info (Self) */}
                <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-[24px] border border-gray-100">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-900">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{student?.name}</p>
                    <p className="text-xs text-gray-400 font-medium">Seu perfil</p>
                  </div>
                </div>

                {/* iOS Style Date & Time Selection */}
                <div className="space-y-6 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                        <CalendarIcon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Data</span>
                    </div>
                    <input
                      type="date"
                      value={requestData.date}
                      onChange={(e) => setRequestData({ ...requestData, date: (e.target as HTMLInputElement).value })}
                      className="bg-gray-200/50 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-900 outline-none transition-colors cursor-pointer"
                      required
                    />
                  </div>

                  <div className="h-px bg-gray-200/50 w-full" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                        <Clock className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Horário</span>
                    </div>
                    <input
                      type="time"
                      value={requestData.time}
                      onChange={(e) => setRequestData({ ...requestData, time: (e.target as HTMLInputElement).value })}
                      className="bg-gray-200/50 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-900 outline-none transition-colors cursor-pointer"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Observações</label>
                  <div className="relative">
                    <div className="absolute left-4 top-4 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <textarea
                      value={requestData.notes}
                      onChange={(e) => setRequestData({ ...requestData, notes: (e.target as HTMLTextAreaElement).value })}
                      placeholder="Algum recado para o instrutor?"
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-[24px] py-4 pl-14 pr-6 text-sm font-semibold text-gray-700 outline-none focus:border-gray-200 focus:bg-white focus:ring-4 focus:ring-gray-500/5 transition-all h-28 resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isRequesting}
                  className="w-full py-5 bg-black text-white rounded-full font-bold text-base shadow-xl shadow-black/20 hover:bg-gray-900 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
                >
                  {isRequesting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {isRequesting ? "Enviando..." : "Enviar Solicitação"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Pill */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-2 py-2 flex items-center justify-between text-xs font-medium z-50 border border-gray-100">
        <button 
          onClick={() => setActiveTab("saude")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "saude" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Activity className="w-4 h-4" />
          <span className={`${activeTab === "saude" ? "block" : "hidden sm:block"}`}>Saúde</span>
        </button>
        <button 
          onClick={() => setActiveTab("treino")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "treino" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className={`${activeTab === "treino" ? "block" : "hidden sm:block"}`}>Treino</span>
        </button>
        <button 
          onClick={() => setActiveTab("historico")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "historico" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <History className="w-4 h-4" />
          <span className={`${activeTab === "historico" ? "block" : "hidden sm:block"}`}>Histórico</span>
        </button>
        <button 
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "agenda" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span className={`${activeTab === "agenda" ? "block" : "hidden sm:block"}`}>Agenda</span>
        </button>
      </div>
    </div>
  );
}

