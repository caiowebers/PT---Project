import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { 
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Calendar as CalendarIcon,
  Activity,
  Dumbbell
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { Student, ClassSession } from "../types";
import { storageService } from "../services/storageService";
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientView() {
  const { shareSlug } = useParams();
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"saude" | "treino" | "agenda">("agenda");
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  useEffect(() => {
    const fetchStudent = async () => {
      if (shareSlug) {
        setLoading(true);
        const data = await storageService.getStudentBySlug(shareSlug);
        if (data) {
          setStudent(data);
          // Fetch sessions for this student
          const allSessions = await storageService.getSessions();
          setSessions(allSessions.filter(s => s.studentId === data.id));
        }
        setLoading(false);
      }
    };
    fetchStudent();
  }, [shareSlug]);

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
        {/* Placeholder for Logo */}
        <div className="text-white text-center font-black uppercase tracking-tighter leading-tight">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="w-8 h-4 border-t-4 border-b-4 border-white relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-white" />
            </div>
          </div>
          <div className="text-2xl">PABLO BATISTA</div>
          <div className="text-[10px] tracking-widest font-medium">PERSONAL TRAINER</div>
        </div>
      </div>

      {/* Student Info Card */}
      <div className="px-6 -mt-16 relative z-10">
        <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex items-center gap-6">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-200 flex-shrink-0">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}&backgroundColor=e2e8f0`} 
              alt={student.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="font-mono text-sm leading-relaxed text-gray-800">
            <div className="font-bold text-lg mb-1">{student.name}</div>
            <div className="text-gray-500">{student.age} anos</div>
            <div className="text-gray-500">{student.goal}</div>
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
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[0]?.weight || "--"} <span className="text-sm font-medium text-gray-400">kg</span></div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">Altura</div>
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[0]?.height || "--"} <span className="text-sm font-medium text-gray-400">cm</span></div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">IMC</div>
                  <div className="text-3xl font-bold text-gray-800">{student.evaluations?.[0]?.bmi || "--"}</div>
                </div>
                <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.06)] flex flex-col items-center justify-center text-center">
                  <div className="text-gym-muted text-xs font-medium mb-1 uppercase tracking-wider">Gordura</div>
                  <div className="text-3xl font-bold text-gray-800">-- <span className="text-sm font-medium text-gray-400">%</span></div>
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
                        <div key={exercise.id} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50">
                          <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center font-bold text-gray-400 flex-shrink-0">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-bold text-gray-800 text-sm">{exercise.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{exercise.reps} • {exercise.rest}</div>
                          </div>
                        </div>
                      ))}
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
                <button className="bg-white px-6 py-2 rounded-full text-sm font-medium shadow-sm border border-gray-100 text-gray-700 hover:bg-gray-50 transition-colors">
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
                        <div className="flex flex-col items-center justify-between h-16 text-xs font-medium text-gray-500 relative">
                          <div>{format(start, "HH:mm")}</div>
                          <div className="w-px h-6 bg-gray-200 my-1" />
                          <div className="text-gym-red font-bold">{format(end, "HH:mm")}</div>
                        </div>

                        {/* Details */}
                        <div>
                          <h3 className="font-bold text-gray-900 text-base">{session.workoutTitle || "Sessão de Treino"}</h3>
                          <p className="text-xs text-gray-500 mt-1 capitalize">
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
                      <div className="flex flex-col items-center justify-between h-16 text-xs font-medium text-gray-500 relative">
                        <div>08:00</div>
                        <div className="w-px h-6 bg-gray-200 my-1" />
                        <div className="text-gym-red font-bold">09:00</div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-base">Nenhuma aula hoje</h3>
                        <p className="text-xs text-gray-500 mt-1">Selecione outra data</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Navigation Pill */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] px-2 py-2 flex items-center justify-between text-xs font-medium z-50 border border-gray-100">
        <button 
          onClick={() => setActiveTab("saude")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "saude" ? "bg-red-50 text-gym-red" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Activity className="w-4 h-4" />
          <span className={`${activeTab === "saude" ? "block" : "hidden sm:block"}`}>Saúde</span>
        </button>
        <button 
          onClick={() => setActiveTab("treino")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "treino" ? "bg-red-50 text-gym-red" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Dumbbell className="w-4 h-4" />
          <span className={`${activeTab === "treino" ? "block" : "hidden sm:block"}`}>Treino</span>
        </button>
        <button 
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full transition-all ${activeTab === "agenda" ? "bg-red-50 text-gym-red" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <CalendarIcon className="w-4 h-4" />
          <span className={`${activeTab === "agenda" ? "block" : "hidden sm:block"}`}>Agenda</span>
        </button>
      </div>
    </div>
  );
}

