import React, { useState, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Clock, 
  User, 
  Dumbbell, 
  ExternalLink,
  Trash2
} from "lucide-react";
import { format, addHours, parseISO } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { ClassSession, Student } from "../types";
import { storageService } from "../services/storageService";
import { toast } from "sonner";

interface CalendarViewProps {
  isAdmin?: boolean;
  studentId?: string; // If provided, filter for this student
}

export default function CalendarView({ isAdmin = false, studentId }: CalendarViewProps) {
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ClassSession | null>(null);
  const [formData, setFormData] = useState({
    studentId: "",
    workoutTitle: "",
    start: "",
    end: "",
    status: "scheduled" as const,
    notes: ""
  });

  useEffect(() => {
    const unsubSessions = storageService.subscribeToSessions((data) => {
      if (studentId) {
        setSessions(data.filter(s => s.studentId === studentId));
      } else {
        setSessions(data);
      }
    });

    if (isAdmin) {
      const unsubStudents = storageService.subscribeToStudents((data) => {
        setStudents(data);
      });
      return () => {
        unsubSessions();
        unsubStudents();
      };
    }

    return () => unsubSessions();
  }, [studentId, isAdmin]);

  const handleDateClick = (arg: any) => {
    if (!isAdmin) return;
    
    const start = arg.dateStr.includes("T") ? arg.dateStr.substring(0, 16) : `${arg.dateStr}T09:00`;
    const end = format(addHours(parseISO(start), 1), "yyyy-MM-dd'T'HH:mm");
    
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
  };

  const handleEventClick = (arg: any) => {
    const session = sessions.find(s => s.id === arg.event.id);
    if (session) {
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
    }
  };

  const [isSaving, setIsSaving] = useState(false);

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
        instructorId: storageService.getCurrentUserId() || "admin",
        workoutTitle: formData.workoutTitle,
        start: formData.start,
        end: formData.end,
        status: formData.status,
        notes: formData.notes
      };

      await storageService.saveSession(newSession);
      toast.success(selectedEvent ? "Aula atualizada!" : "Aula agendada!");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao guardar aula:", error);
      toast.error("Erro ao guardar aula.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isAdmin || !selectedEvent) return;
    if (window.confirm("Tem certeza que deseja excluir esta aula?")) {
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

  const events = sessions.map(s => ({
    id: s.id,
    title: `${s.workoutTitle} (${s.studentName})`,
    start: s.start,
    end: s.end,
    backgroundColor: s.status === 'completed' ? '#10b981' : s.status === 'cancelled' ? '#ef4444' : (isAdmin ? "#00FF00" : "#FF5F1F"),
    borderColor: "transparent",
    textColor: "#000"
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-neon-green/10">
            <CalendarIcon className="w-6 h-6 text-neon-green" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Calendário de Aulas</h2>
            <p className="text-xs text-gray-500 uppercase tracking-widest">
              {isAdmin ? "Gestão de Horários" : "Minhas Aulas Agendadas"}
            </p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => {
              const start = format(new Date(), "yyyy-MM-dd'T'HH:00");
              const end = format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:00");
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
            className="flex items-center gap-2 px-4 py-2 bg-neon-green text-gym-dark rounded-xl font-black text-xs uppercase tracking-widest hover:neon-shadow-green transition-all"
          >
            <Plus className="w-4 h-4" />
            Agendar Aula
          </button>
        )}
      </div>

      <div className="glass-card p-4 overflow-hidden">
        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay"
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            height="auto"
            locale="pt-br"
            buttonText={{
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia"
            }}
            allDaySlot={false}
            slotMinTime="06:00:00"
            slotMaxTime="22:00:00"
            nowIndicator={true}
          />
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-gym-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <h3 className="text-xl font-bold">
                  {isAdmin ? (selectedEvent ? "Editar Aula" : "Agendar Aula") : "Detalhes da Aula"}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Aluno</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    {isAdmin ? (
                      <select
                        value={formData.studentId}
                        onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                        className="w-full bg-black/40 border border-gym-border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-neon-green appearance-none"
                        required
                      >
                        <option value="">Selecione um aluno</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="w-full bg-black/40 border border-gym-border rounded-xl py-3 pl-10 pr-4 text-sm text-white">
                        {selectedEvent?.studentName}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase">Título do Treino</label>
                  <div className="relative">
                    <Dumbbell className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type="text"
                      value={formData.workoutTitle}
                      onChange={(e) => setFormData({ ...formData, workoutTitle: e.target.value })}
                      placeholder="Ex: Musculação, HIIT, Funcional"
                      className="w-full bg-black/40 border border-gym-border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-neon-green"
                      required
                      readOnly={!isAdmin}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Início</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="datetime-local"
                        value={formData.start}
                        onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                        className="w-full bg-black/40 border border-gym-border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-neon-green"
                        required
                        readOnly={!isAdmin}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Fim</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="datetime-local"
                        value={formData.end}
                        onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                        className="w-full bg-black/40 border border-gym-border rounded-xl py-3 pl-10 pr-4 text-sm outline-none focus:border-neon-green"
                        required
                        readOnly={!isAdmin}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-black/40 border border-gym-border rounded-xl py-3 px-4 text-sm outline-none focus:border-neon-green appearance-none"
                      disabled={!isAdmin}
                    >
                      <option value="scheduled">Agendado</option>
                      <option value="completed">Concluído</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Notas</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Observações..."
                      className="w-full bg-black/40 border border-gym-border rounded-xl p-3 text-sm outline-none focus:border-neon-green h-11 resize-none"
                      readOnly={!isAdmin}
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  {isAdmin ? (
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-neon-green text-gym-dark rounded-xl font-black text-xs uppercase tracking-widest hover:neon-shadow-green transition-all disabled:opacity-50"
                      >
                        {isSaving ? (
                          <div className="w-4 h-4 border-2 border-gym-dark border-t-transparent rounded-full animate-spin" />
                        ) : null}
                        {isSaving ? "Salvando..." : (selectedEvent ? "Salvar Alterações" : "Agendar Aula")}
                      </button>
                      {selectedEvent && (
                        <button
                          type="button"
                          onClick={handleDelete}
                          className="p-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ) : (
                    selectedEvent && (
                      <a
                        href={getGoogleCalendarUrl(selectedEvent)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 bg-white/10 border border-white/10 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/20 transition-all"
                      >
                        <ExternalLink className="w-4 h-4" />
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

      <style>{`
        .calendar-container {
          --fc-border-color: rgba(255, 255, 255, 0.05);
          --fc-daygrid-event-dot-width: 8px;
          --fc-today-bg-color: rgba(0, 255, 0, 0.05);
          --fc-button-bg-color: rgba(255, 255, 255, 0.05);
          --fc-button-border-color: rgba(255, 255, 255, 0.1);
          --fc-button-hover-bg-color: rgba(255, 255, 255, 0.1);
          --fc-button-active-bg-color: #00FF00;
          --fc-button-active-border-color: #00FF00;
          --fc-event-bg-color: #00FF00;
          --fc-event-border-color: transparent;
          --fc-event-text-color: #000;
        }
        .fc {
          font-family: inherit;
        }
        .fc .fc-button-primary:not(:disabled).fc-button-active {
          color: #000;
        }
        .fc .fc-toolbar-title {
          font-size: 1.25rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .fc-theme-standard td, .fc-theme-standard th {
          border-color: var(--fc-border-color);
        }
        .fc-timegrid-slot {
          height: 3em !important;
        }
        .fc-v-event {
          border-radius: 8px;
          padding: 2px 4px;
        }
        .fc-event-title {
          font-weight: 700;
          font-size: 0.75rem;
        }
      `}</style>
    </div>
  );
}
