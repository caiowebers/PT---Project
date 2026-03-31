import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  History,
  CheckCircle2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
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
  Target
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Student, ClassSession, Exercise, AdminSettings, CompletedWorkout, Workout } from "../types";
import { storageService } from "../services/storageService";
import { v4 as uuidv4 } from "uuid";
import { wgerService } from "../services/wgerService";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, addHours } from "date-fns";
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
  const [activeTab, setActiveTab] = useState<"saude" | "treino" | "agenda" | "historico">("agenda");
  const [aiDescriptions, setAiDescriptions] = useState<Record<string, string>>({});
  const [generatingDesc, setGeneratingDesc] = useState<Record<string, boolean>>({});
  const [completedExercises, setCompletedExercises] = useState<Record<string, boolean>>({});
  const [workoutFeedback, setWorkoutFeedback] = useState("");
  const [isFinishing, setIsFinishing] = useState<string | null>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [requestData, setRequestData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "09:00",
    notes: ""
  });
  const [isRequesting, setIsRequesting] = useState(false);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  const handleGenerateInsights = async () => {
    if (!student) return;
    setIsGeneratingInsights(true);
    try {
      const insights = await wgerService.generateHealthInsights(student);
      setStudent(prev => prev ? ({ ...prev, healthInsights: insights }) : null);
      await storageService.updateStudentHealthInsights(student.id, insights);
      toast.success("Insights de saúde gerados com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar insights.");
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  const toggleExercise = (exerciseId: string) => {
    setCompletedExercises(prev => ({
      ...prev,
      [exerciseId]: !prev[exerciseId]
    }));
  };

  const finishWorkout = async (workout: Workout) => {
    if (!student) return;
    
    const completedIds = Object.entries(completedExercises)
      .filter(([id, completed]) => {
        return completed && workout.exercises.some(e => e.id === id);
      })
      .map(([id]) => id);

    if (completedIds.length === 0) {
      toast.error("Marque pelo menos um exercício como concluído!");
      return;
    }

    setIsFinishing(workout.id);
    try {
      const newCompletedWorkout: CompletedWorkout = {
        id: uuidv4(),
        workoutId: workout.id,
        workoutName: workout.name,
        date: new Date().toISOString(),
        feedback: workoutFeedback,
        rating: 5,
        exercisesCompleted: completedIds
      };

      const updatedHistory = [newCompletedWorkout, ...(student.workoutHistory || [])];
      setStudent({ ...student, workoutHistory: updatedHistory });
      await storageService.updateStudentWorkoutHistory(student.id, updatedHistory);
      
      setCompletedExercises({});
      setWorkoutFeedback("");
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
      <div className="w-12 h-12 border-4 border-gym-red border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-gym-muted">A carregar...</p>
    </div>
  );

  if (!student) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gym-bg">
      <h2 className="text-2xl font-bold text-gym-text">Plano não encontrado</h2>
      <p className="text-gym-muted">O link pode estar incorreto ou o plano foi removido.</p>
    </div>
  );

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = monthStart;
  const endDate = monthEnd;
  const dateFormat = "d";
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const startDayOfWeek = getDay(monthStart);

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return (
    <div className="min-h-screen bg-gym-bg pb-32 font-sans text-gym-text relative">
      {/* Header - Red Background */}
      <div className="bg-gym-red h-48 w-full rounded-b-3xl relative flex items-center justify-center">
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
                    <MessageSquare className="w-4 h-4 text-gym-red" />
                    Feedback do Personal
                  </h3>
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{student.personalFeedback}"
                  </p>
                </div>
              )}

              {/* AI Insights Section */}
              <div className="bg-red-50 rounded-[32px] p-6 border border-red-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gym-red flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Insights de Saúde (IA)
                  </h3>
                  <button
                    onClick={handleGenerateInsights}
                    disabled={isGeneratingInsights}
                    className="flex items-center gap-2 px-4 py-1.5 bg-white text-gym-red rounded-full text-[10px] font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                  >
                    {isGeneratingInsights ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        {student.healthInsights ? "Atualizar IA" : "Gerar com IA"}
                      </>
                    )}
                  </button>
                </div>
                {student.healthInsights ? (
                  <div className="text-sm text-red-900 leading-relaxed space-y-2">
                    {student.healthInsights.split('\n').map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-400 italic">
                    Clique no botão acima para gerar insights de saúde baseados nos seus dados.
                  </p>
                )}
              </div>

              {/* Charts Section */}
              <div className="space-y-6">
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-gym-red" />
                      Evolução de Peso
                    </h3>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={student.evaluations}>
                        <defs>
                          <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#E31C25" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#E31C25" stopOpacity={0}/>
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
                        <Area type="monotone" dataKey="weight" stroke="#E31C25" strokeWidth={3} fillOpacity={1} fill="url(#colorWeight)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                      <Target className="w-4 h-4 text-gym-red" />
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
              
              <div className="space-y-4">
                {student.workouts && student.workouts.length > 0 ? student.workouts.map(workout => (
                  <div key={workout.id} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="font-bold text-gray-900 text-lg">{workout.name}</h3>
                      <div className="bg-red-50 text-gym-red px-3 py-1 rounded-full text-xs font-bold">
                        {workout.exercises.length} exercícios
                      </div>
                    </div>
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
                              title="Ver Exemplo"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>

                          <div className="pt-3 border-t border-gray-200/50">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1">
                                <Info className="w-3 h-3" /> Instruções IA
                              </span>
                              {!aiDescriptions[exercise.id] && !generatingDesc[exercise.id] && !exercise.description && (
                                <button 
                                  onClick={() => generateDescription(exercise)}
                                  className="text-[9px] font-bold text-gym-red hover:underline"
                                >
                                  Gerar
                                </button>
                              )}
                            </div>
                            
                            {generatingDesc[exercise.id] ? (
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium italic">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Gerando instruções personalizadas...
                              </div>
                            ) : (aiDescriptions[exercise.id] || exercise.description) ? (
                              <p className="text-[11px] text-gray-600 leading-relaxed italic">
                                "{aiDescriptions[exercise.id] || exercise.description}"
                              </p>
                            ) : (
                              <p className="text-[10px] text-gray-400 italic">
                                Clique em gerar para ver como executar.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-100">
                      <div className="mb-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">Feedback do Treino</label>
                        <textarea 
                          value={workoutFeedback}
                          onChange={(e) => setWorkoutFeedback(e.target.value)}
                          placeholder="Como foi o treino hoje? Alguma dor ou dificuldade?"
                          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-gym-red/20 transition-all min-h-[80px]"
                        />
                      </div>
                      <button 
                        onClick={() => finishWorkout(workout)}
                        disabled={isFinishing === workout.id}
                        className="w-full bg-gym-red text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 hover:bg-red-800 transition-all disabled:opacity-50"
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
                  </div>
                )) : (
                  <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-center text-gym-muted">
                    Nenhum treino cadastrado.
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
                <h2 className="text-lg font-bold text-gray-800">Histórico de Treinos</h2>
              </div>

              <div className="space-y-4">
                {student.workoutHistory && student.workoutHistory.length > 0 ? (
                  student.workoutHistory.map((session) => (
                    <div key={session.id} className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-bold text-gray-900">{session.workoutName}</h3>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                            {format(parseISO(session.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="bg-green-50 text-green-600 p-2 rounded-full">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>
                      
                      {session.feedback && (
                        <div className="bg-gray-50 rounded-2xl p-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Seu Feedback</p>
                          <p className="text-xs text-gray-600 italic">"{session.feedback}"</p>
                        </div>
                      )}
                      
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          {session.exercisesCompleted.length} exercícios concluídos
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-white rounded-[32px] p-12 shadow-[0_8px_30px_rgb(0,0,0,0.06)] text-center">
                    <History className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-medium">Você ainda não concluiu nenhum treino.</p>
                    <button 
                      onClick={() => setActiveTab("treino")}
                      className="mt-4 text-gym-red font-bold text-sm hover:underline"
                    >
                      Começar agora
                    </button>
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
                <h2 className="text-lg font-bold text-gray-800">Meu Calendário</h2>
                <button 
                  onClick={() => setIsRequestModalOpen(true)}
                  className="bg-gym-red px-6 py-2 rounded-full text-sm font-bold shadow-md shadow-red-500/20 text-white hover:bg-red-800 transition-all"
                >
                  Marcar
                </button>
              </div>

              {/* Calendar Widget */}
              <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
                <div className="flex items-center justify-between mb-6">
                  <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-600" /></button>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium capitalize">
                      {format(currentDate, "MMM", { locale: ptBR })}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium">
                      {format(currentDate, "yyyy")}
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                  <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronRight className="w-5 h-5 text-gray-600" /></button>
                </div>

                <div className="grid grid-cols-7 gap-y-4 text-center">
                  {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
                    <div key={`header-${i}`} className="text-xs font-bold text-gray-400">{day}</div>
                  ))}
                  
                  {Array.from({ length: startDayOfWeek }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}

                  {days.map(day => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, new Date());
                    
                    return (
                      <div key={day.toString()} className="flex justify-center">
                        <button 
                          onClick={() => setSelectedDate(day)}
                          className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm font-medium transition-all ${
                            isSelected 
                              ? "bg-gym-red text-white shadow-md shadow-red-500/20" 
                              : isToday
                                ? "bg-red-50 text-gym-red"
                                : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {format(day, dateFormat)}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agenda List */}
              <div className="space-y-4">
                {sessions.length > 0 ? sessions.map(session => {
                  const start = parseISO(session.start);
                  const end = parseISO(session.end);
                  
                  return (
                    <div key={session.id} className="bg-white rounded-[32px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Time Column */}
                        <div className="flex flex-col items-center justify-between h-16 text-xs font-medium text-gray-600 relative">
                          <div>{format(start, "HH:mm")}</div>
                          <div className="w-px h-6 bg-gray-200 my-1" />
                          <div className="text-gym-red font-bold">{format(end, "HH:mm")}</div>
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
                  <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-4">
                      {/* Mock Data for visual matching if no sessions exist */}
                      <div className="flex flex-col items-center justify-between h-16 text-xs font-medium text-gray-600 relative">
                        <div>08:00</div>
                        <div className="w-px h-6 bg-gray-200 my-1" />
                        <div className="text-gym-red font-bold">09:00</div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">Nenhuma aula hoje</h3>
                        <p className="text-xs text-gray-600 mt-1">Selecione outra data</p>
                      </div>
                    </div>
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
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="text-xl font-bold text-gray-900">Solicitar Treino</h3>
                <button onClick={() => setIsRequestModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-all">
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleRequestSession} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Data</label>
                  <input
                    type="date"
                    value={requestData.date}
                    onChange={(e) => setRequestData({ ...requestData, date: (e.target as HTMLInputElement).value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm outline-none focus:border-gym-red"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Hora</label>
                  <input
                    type="time"
                    value={requestData.time}
                    onChange={(e) => setRequestData({ ...requestData, time: (e.target as HTMLInputElement).value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-sm outline-none focus:border-gym-red"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Observações</label>
                  <textarea
                    value={requestData.notes}
                    onChange={(e) => setRequestData({ ...requestData, notes: (e.target as HTMLTextAreaElement).value })}
                    placeholder="Algum recado para o instrutor?"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-gym-red h-24 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRequesting}
                  className="w-full py-4 bg-gym-red text-white rounded-2xl font-bold hover:bg-red-800 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isRequesting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
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
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "saude" ? "bg-red-50 text-gym-red" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Activity className="w-4 h-4" />
          <span className={`${activeTab === "saude" ? "block" : "hidden sm:block"}`}>Saúde</span>
        </button>
        <button 
          onClick={() => setActiveTab("treino")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "treino" ? "bg-red-50 text-gym-red" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className={`${activeTab === "treino" ? "block" : "hidden sm:block"}`}>Treino</span>
        </button>
        <button 
          onClick={() => setActiveTab("historico")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "historico" ? "bg-red-50 text-gym-red" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <History className="w-4 h-4" />
          <span className={`${activeTab === "historico" ? "block" : "hidden sm:block"}`}>Histórico</span>
        </button>
        <button 
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "agenda" ? "bg-red-50 text-gym-red" : "text-gray-600 hover:bg-gray-50"}`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span className={`${activeTab === "agenda" ? "block" : "hidden sm:block"}`}>Agenda</span>
        </button>
      </div>
    </div>
  );
}

