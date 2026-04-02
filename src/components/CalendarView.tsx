import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Clock, 
  User, 
  Dumbbell, 
  ExternalLink,
  Trash2,
  ChevronDown,
  CalendarDays,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Sun,
  Moon,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { format, addHours, parseISO, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { v4 as uuidv4 } from "uuid";
import { ClassSession, Student } from "../types";
import { storageService } from "../services/storageService";
import { googleCalendarService } from "../services/googleCalendarService";
import { toast } from "sonner";

interface CalendarViewProps {
  isAdmin?: boolean;
  studentId?: string; // If provided, filter for this student
  openForStudentId?: string; // If provided, open modal for this student
}

export default function CalendarView({ isAdmin = false, studentId, openForStudentId }: CalendarViewProps) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassSession | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const nextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const prevWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const goToToday = () => {
    const today = new Date();
    setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDate(today);
  };

  const filteredSessions = sessions.filter(session => {
    const sessionDate = parseISO(session.start);
    return isSameDay(sessionDate, selectedDate);
  }).sort((a, b) => a.start.localeCompare(b.start));

  const [formData, setFormData] = useState({
    studentId: "",
    workoutTitle: "",
    start: "",
    end: "",
    status: "scheduled" as any,
    notes: ""
  });

  useEffect(() => {
    if (openForStudentId && isAdmin) {
      const start = format(new Date(), "yyyy-MM-dd'T'HH:00");
      const end = format(addHours(parseISO(start), 1), "yyyy-MM-dd'T'HH:00");
      
      setFormData({
        studentId: openForStudentId,
        workoutTitle: "",
        start,
        end,
        status: "scheduled",
        notes: ""
      });
      setSelectedEvent(null);
      setIsModalOpen(true);
    }
  }, [openForStudentId, isAdmin]);

  useEffect(() => {
    let unsubSessions: (() => void) | null = null;

    if (isAdmin) {
      unsubSessions = storageService.subscribeToSessions((data) => {
        if (studentId) {
          setSessions(data.filter(s => s.studentId === studentId));
        } else {
          setSessions(data);
        }
      });

      const unsubStudents = storageService.subscribeToStudents((data) => {
        setStudents(data);
      });
      
      return () => {
        if (unsubSessions) unsubSessions();
        unsubStudents();
      };
    } else if (studentId) {
      // For students viewing their own page (not authenticated as admin)
      unsubSessions = storageService.subscribeToStudentSessions(studentId, (data) => {
        setSessions(data);
      });
      return () => {
        if (unsubSessions) unsubSessions();
      };
    }

    return () => {
      if (unsubSessions) unsubSessions();
    };
  }, [studentId, isAdmin]);

  const handleSessionClick = (session: ClassSession) => {
    setSelectedEvent(session);
    setFormData({
      studentId: session.studentId,
      workoutTitle: session.workoutTitle,
      start: session.start.substring(0, 16),
      end: session.end.substring(0, 16),
      status: session.status || "scheduled",
      notes: session.notes || ""
    });
    setIsModalOpen(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleDateChange = (date: string) => {
    const startTime = formData.start.split('T')[1] || "09:00";
    const endTime = formData.end.split('T')[1] || "10:00";
    setFormData({
      ...formData,
      start: `${date}T${startTime}`,
      end: `${date}T${endTime}`
    });
  };

  const handleTimeChange = (field: 'start' | 'end', time: string) => {
    const date = formData.start.split('T')[0];
    setFormData({
      ...formData,
      [field]: `${date}T${time}`
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    const student = students.find(s => s.id === formData.studentId);
    if (!student) {
      toast.error("Selecione um aluno");
      return;
    }

    setIsSaving(true);
    try {
      const newSession: ClassSession = {
        id: selectedEvent?.id || uuidv4(),
        studentId: formData.studentId,
        studentName: student.name,
        instructorId: selectedEvent?.instructorId || storageService.getCurrentUserId() || "",
        workoutTitle: formData.workoutTitle,
        start: formData.start,
        end: formData.end,
        status: formData.status,
        notes: formData.notes,
        googleEventId: selectedEvent?.googleEventId
      };

      if (googleCalendarService.getAccessToken()) {
        if (selectedEvent?.googleEventId) {
          await googleCalendarService.updateEvent(selectedEvent.googleEventId, newSession, student.name);
        } else {
          const eventId = await googleCalendarService.createEvent(newSession, student.name, student.email);
          if (eventId) {
            newSession.googleEventId = eventId;
          }
        }
      }

      if (selectedEvent) {
        await storageService.saveSession(newSession);
      } else {
        await storageService.salvarAula(
          formData.studentId, 
          formData.start, 
          formData.end, 
          student.name, 
          formData.workoutTitle, 
          formData.notes,
          newSession.googleEventId
        );
      }

      // Automatically update student workout history based on status
      const currentHistory = student.workoutHistory || [];
      const historyIndex = currentHistory.findIndex(h => h.sessionId === newSession.id);

      if (formData.status === 'completed') {
        if (historyIndex === -1) {
          const workout = student.workouts.find(w => w.name === formData.workoutTitle) || student.workouts[0];
          const completedWorkout: any = {
            id: uuidv4(),
            workoutId: workout?.id || "manual",
            workoutName: formData.workoutTitle,
            date: formData.start,
            feedback: formData.notes || "Aula concluída via agenda",
            rating: 5,
            exercisesCompleted: workout?.exercises.map(e => e.id) || [],
            status: 'completed',
            sessionId: newSession.id
          };
          
          await storageService.updateStudentWorkoutHistory(student.id, [...currentHistory, completedWorkout]);
        } else {
          // Update existing history entry if session details changed
          const updatedHistory = [...currentHistory];
          updatedHistory[historyIndex] = {
            ...updatedHistory[historyIndex],
            workoutName: formData.workoutTitle,
            date: formData.start,
            feedback: formData.notes || updatedHistory[historyIndex].feedback
          };
          await storageService.updateStudentWorkoutHistory(student.id, updatedHistory);
        }
      } else if (historyIndex !== -1) {
        // If status changed from completed to something else, remove from history
        const updatedHistory = currentHistory.filter(h => h.sessionId !== newSession.id);
        await storageService.updateStudentWorkoutHistory(student.id, updatedHistory);
      }

      toast.success(selectedEvent ? "Aula atualizada!" : "Aula agendada!");
      setIsModalOpen(false);
    } catch (error: any) {
      console.error("Erro ao guardar aula:", error);
      if (error.message?.includes("insufficient permissions")) {
        toast.error("Erro de permissão. Apenas o proprietário pode agendar aulas.");
      } else {
        toast.error("Erro ao guardar aula.");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !selectedEvent) return;
    if (window.confirm("Tem certeza que deseja excluir esta aula?")) {
      if (selectedEvent.googleEventId && googleCalendarService.getAccessToken()) {
        await googleCalendarService.deleteEvent(selectedEvent.googleEventId);
      }
      
      // If it was completed, remove from history
      if (selectedEvent.status === 'completed') {
        const student = students.find(s => s.id === selectedEvent.studentId);
        if (student && student.workoutHistory) {
          const updatedHistory = student.workoutHistory.filter(h => h.sessionId !== selectedEvent.id);
          await storageService.updateStudentWorkoutHistory(student.id, updatedHistory);
        }
      }

      await storageService.deleteSession(selectedEvent.id);
      toast.success("Aula excluída");
      setIsModalOpen(false);
    }
  };

  const getGoogleCalendarUrl = (session: ClassSession) => {
    const baseUrl = "https://www.google.com/calendar/render?action=TEMPLATE";
    const title = encodeURIComponent(`Aula: ${session.workoutTitle} - ${session.studentName}`);
    const details = encodeURIComponent(session.notes || "Aula de Personal Trainer");
    
    const formatGCalDate = (dateStr: string) => {
      return dateStr.replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const start = formatGCalDate(new Date(session.start).toISOString());
    const end = formatGCalDate(new Date(session.end).toISOString());

    return `${baseUrl}&text=${title}&details=${details}&dates=${start}/${end}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="w-8 h-8 rounded-full border-2 border-gym-bg bg-gray-200 overflow-hidden">
                <img 
                  src={`https://picsum.photos/seed/${i + 20}/100/100`} 
                  alt="User" 
                  className="w-full h-full object-cover grayscale"
                  referrerPolicy="no-referrer"
                />
              </div>
            ))}
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-gray-900">Agenda</h2>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => {
              const start = format(selectedDate, "yyyy-MM-dd'T'HH:00");
              const end = format(addHours(parseISO(start), 1), "yyyy-MM-dd'T'HH:00");
              setFormData({
                studentId: studentId || "",
                workoutTitle: "",
                start,
                end,
                status: "scheduled",
                notes: ""
              });
              setSelectedEvent(null);
              setIsModalOpen(true);
            }}
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm border border-gray-100 hover:bg-gray-50 transition-all"
          >
            <Plus className="w-5 h-5 text-gray-900" />
          </button>
        )}
      </div>

      {/* Weekly Bar */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <button 
              onClick={prevWeek}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 group"
              title="Semana Anterior"
            >
              <ChevronLeft className="w-4 h-4 text-gray-400 group-hover:text-gym-red transition-colors" />
              <span className="hidden md:inline">Semana Anterior</span>
            </button>
            
            <button 
              onClick={goToToday}
              className="px-5 py-2.5 text-sm font-bold bg-gray-100 text-gray-600 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
            >
              Hoje
            </button>

            <button 
              onClick={nextWeek}
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95 group"
              title="Próxima Semana"
            >
              <span className="hidden md:inline">Próxima Semana</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gym-red transition-colors" />
            </button>
          </div>
          
          <div className="text-right">
            <span className="text-sm font-black text-gray-900 uppercase tracking-widest block leading-none">
              {format(currentWeekStart, "MMMM", { locale: ptBR })}
            </span>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 block">
              {format(currentWeekStart, "yyyy")}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-2 rounded-[32px] border border-gray-100">
          {weekDays.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={`flex flex-col items-center justify-center w-12 h-16 rounded-2xl transition-all ${
                  isSelected 
                    ? "bg-black text-white shadow-lg scale-110" 
                    : "hover:bg-gray-100 text-gray-400"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest ${isSelected ? "text-gray-400" : "text-gray-400"}`}>
                  {format(date, "eee", { locale: ptBR })}
                </span>
                <span className="text-lg font-black mt-1">
                  {format(date, "d")}
                </span>
                {isToday && !isSelected && (
                  <div className="w-1 h-1 bg-black rounded-full mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions List - iOS World Time Style */}
      <div className="space-y-4">
        {filteredSessions.length > 0 ? (
          filteredSessions.map((session, index) => {
            const isNext = index === 0 && isSameDay(selectedDate, new Date());
            
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleSessionClick(session)}
                className={`group relative flex items-center justify-between p-8 rounded-[32px] cursor-pointer transition-all active:scale-[0.98] ${
                  isNext 
                    ? "bg-black text-white shadow-2xl shadow-black/20" 
                    : "bg-white border border-gray-100 hover:border-gray-200 shadow-sm"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase tracking-widest ${isNext ? "text-gray-400" : "text-gray-400"}`}>
                      {session.studentName}
                    </span>
                  </div>
                  <h4 className={`text-2xl font-bold tracking-tight ${isNext ? "text-white" : "text-gray-900"}`}>
                    {session.workoutTitle}
                  </h4>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className={`text-4xl font-medium tracking-tighter ${isNext ? "text-white" : "text-gray-900"}`}>
                      {format(parseISO(session.start), "HH:mm")}
                    </div>
                    <div className={`text-xs font-bold uppercase tracking-widest mt-1 ${isNext ? "text-gray-400" : "text-gray-400"}`}>
                      até {format(parseISO(session.end), "HH:mm")}
                    </div>
                  </div>
                  
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isNext ? "bg-white/10 text-yellow-400" : "bg-gray-50 text-gray-400"
                  }`}>
                    {parseInt(format(parseISO(session.start), "H")) >= 18 || parseInt(format(parseISO(session.start), "H")) < 6 
                      ? <Moon className="w-5 h-5" /> 
                      : <Sun className="w-5 h-5" />
                    }
                  </div>
                </div>

                {/* Status Indicator */}
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full ${
                  session.status === 'completed' ? 'bg-green-500' :
                  session.status === 'cancelled' ? 'bg-red-500' :
                  session.status === 'pending' ? 'bg-amber-500' :
                  'bg-blue-500'
                }`} />
              </motion.div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center bg-white/50 rounded-[40px] border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CalendarDays className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Nenhuma aula</h3>
            <p className="text-sm text-gray-400 mt-1">Não há agendamentos para este dia.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white rounded-[40px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-gray-100"
            >
              {/* Header */}
              <div className="px-8 pt-8 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                    {isAdmin ? (selectedEvent ? "Editar Aula" : "Agendar Aula") : "Detalhes da Aula"}
                  </h3>
                  <p className="text-sm text-gray-400 font-medium mt-1">
                    {selectedEvent ? "Ajuste os detalhes da sessão" : "Preencha os dados para o novo agendamento"}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2.5 hover:bg-gray-50 rounded-2xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-8 pt-4 space-y-8">
                {/* Student Card */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Aluno</label>
                  {isAdmin ? (
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <User className="w-5 h-5" />
                      </div>
                      <select
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-[24px] py-4 pl-16 pr-12 text-sm font-semibold text-gray-700 outline-none focus:border-blue-200 focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all appearance-none cursor-pointer"
                        required
                      >
                        <option value="">Selecione o aluno...</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none group-hover:text-gray-400 transition-colors" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-[24px] border border-gray-100">
                      <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                        <User className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{selectedEvent?.studentName}</p>
                        <p className="text-xs text-gray-400 font-medium">Aluno matriculado</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Workout Title */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Título do Treino</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-500">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <input
                      type="text"
                      list="workout-suggestions"
                      value={formData.workoutTitle}
                      onChange={(e) => setFormData({ ...formData, workoutTitle: e.target.value })}
                      placeholder="Musculação, HIIT, Funcional..."
                      className="w-full bg-gray-50/50 border border-gray-100 rounded-[24px] py-4 pl-16 pr-6 text-sm font-semibold text-gray-700 outline-none focus:border-purple-200 focus:bg-white focus:ring-4 focus:ring-purple-500/5 transition-all"
                      required
                      readOnly={!isAdmin}
                    />
                    <datalist id="workout-suggestions">
                      <option value="Musculação" />
                      <option value="HIIT" />
                      <option value="Funcional" />
                      <option value="Crossfit" />
                      <option value="Yoga" />
                      <option value="Pilates" />
                    </datalist>
                  </div>
                </div>

                {/* iOS Style Date & Time Selection */}
                <div className="space-y-6 bg-gray-50/50 p-6 rounded-[32px] border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                        <CalendarDays className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Data</span>
                    </div>
                    <input
                      type="date"
                      value={formData.start.split('T')[0]}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="bg-gray-200/50 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-900 outline-none transition-colors cursor-pointer"
                      required
                      readOnly={!isAdmin}
                    />
                  </div>

                  <div className="h-px bg-gray-200/50 w-full" />

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                        <Clock3 className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-gray-700">Horário</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={formData.start.split('T')[1]?.substring(0, 5)}
                        onChange={(e) => handleTimeChange('start', e.target.value)}
                        className="bg-gray-200/50 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-gray-900 outline-none transition-colors cursor-pointer"
                        required
                        readOnly={!isAdmin}
                      />
                      <span className="text-gray-400 font-bold">→</span>
                      <input
                        type="time"
                        value={formData.end.split('T')[1]?.substring(0, 5)}
                        onChange={(e) => handleTimeChange('end', e.target.value)}
                        className="bg-gray-200/50 hover:bg-gray-200 px-3 py-2 rounded-xl text-sm font-bold text-gray-900 outline-none transition-colors cursor-pointer"
                        required
                        readOnly={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                {/* Status & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Status da Aula</label>
                    <div className="relative group">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center ${
                        formData.status === 'completed' ? 'bg-green-50 text-green-500' :
                        formData.status === 'cancelled' ? 'bg-red-50 text-red-500' :
                        formData.status === 'scheduled' ? 'bg-blue-50 text-blue-500' :
                        'bg-amber-50 text-amber-500'
                      }`}>
                        {formData.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                         formData.status === 'cancelled' ? <AlertCircle className="w-5 h-5" /> :
                         formData.status === 'scheduled' ? <CalendarIcon className="w-5 h-5" /> :
                         <Clock className="w-5 h-5" />}
                      </div>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-[24px] py-4 pl-16 pr-12 text-sm font-semibold text-gray-700 outline-none focus:border-gray-200 focus:bg-white focus:ring-4 focus:ring-gray-500/5 transition-all appearance-none cursor-pointer"
                        disabled={!isAdmin}
                      >
                        <option value="pending">Pendente</option>
                        <option value="scheduled">Agendado</option>
                        <option value="completed">Concluído</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 pointer-events-none group-hover:text-gray-400 transition-colors" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Notas</label>
                    <div className="relative">
                      <div className="absolute left-4 top-4 w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                        <FileText className="w-5 h-5" />
                      </div>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Observações..."
                        className="w-full bg-gray-50/50 border border-gray-100 rounded-[24px] py-4 pl-16 pr-6 text-sm font-semibold text-gray-700 outline-none focus:border-gray-200 focus:bg-white focus:ring-4 focus:ring-gray-500/5 transition-all h-[58px] resize-none"
                        readOnly={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 flex items-center gap-4">
                  {isAdmin ? (
                    <>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 py-5 bg-gym-red text-white rounded-full font-bold text-base shadow-xl shadow-red-500/20 hover:bg-red-700 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3"
                      >
                        {isSaving ? (
                          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        ) : <CalendarIcon className="w-5 h-5" />}
                        {isSaving ? "Salvando..." : (selectedEvent ? "Salvar Alterações" : "Agendar Aula")}
                      </button>
                      {selectedEvent && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Excluir Aula"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      )}
                    </>
                  ) : (
                    selectedEvent && (
                      <a
                        href={getGoogleCalendarUrl(selectedEvent)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-5 bg-gray-900 text-white rounded-full font-bold text-base shadow-xl shadow-gray-900/20 hover:bg-black hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3"
                      >
                        <ExternalLink className="w-5 h-5" />
                        Adicionar ao Google Agenda
                      </a>
                    )
                  )}
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
