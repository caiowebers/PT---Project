import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Users, Plus, LogOut, Search, Share2, Edit2, Trash2, ChevronRight, Activity, TrendingUp, Calendar, AlertTriangle, Beaker, Fingerprint, Star, MessageSquare, X, CalendarDays, Settings, Image as ImageIcon, History as HistoryIcon, CheckCircle2, Target } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from "sonner";
import StudentForm from "./StudentForm";
import { Student, Workout, AdminSettings, ExerciseLibraryItem, ActiveWorkoutProgress } from "../types";
import { storageService } from "../services/storageService";
import { progressService } from "../services/progressService";
import { auth, onAuthStateChanged } from "../firebase";
import WorkoutEditor from "./WorkoutEditor";
import CalendarView from "./CalendarView";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStudentForProgress, setSelectedStudentForProgress] = useState<Student | null>(null);
  const [activeProgress, setActiveProgress] = useState<ActiveWorkoutProgress[]>([]);
  const [globalActiveProgress, setGlobalActiveProgress] = useState<ActiveWorkoutProgress[]>([]);
  const [progressTab, setProgressTab] = useState<"metrics" | "history" | "evaluations" | "active">("metrics");
  const [activeTab, setActiveTab] = useState<"students" | "workouts" | "agenda" | "settings">("students");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (location.state?.openCalendarForStudent) {
      setActiveTab("agenda");
      // Clear the state so it doesn't re-trigger on subsequent renders
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const settings = await storageService.getAdminSettings(user.uid);
        if (settings) {
          setAdminSettings(settings);
        } else {
          setAdminSettings({ id: user.uid });
        }
      }
    });

    const unsubscribeStudents = storageService.subscribeToStudents((data) => {
      setStudents(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStudents();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = progressService.subscribeToGlobalActiveProgress(currentUser.uid, (data) => {
      setGlobalActiveProgress(data);
    });
    return () => unsubscribe();
  }, [currentUser?.uid]);

  useEffect(() => {
    if (selectedStudentForProgress) {
      const unsubscribe = progressService.subscribeToAllActiveProgress(selectedStudentForProgress.id, (data) => {
        setActiveProgress(data);
        if (data.length > 0 && progressTab !== "active") {
          // Optional: automatically switch to active tab if there is progress?
          // For now, just let the user know.
        }
      });
      return () => unsubscribe();
    } else {
      setActiveProgress([]);
    }
  }, [selectedStudentForProgress?.id]);

  const isFirebaseAuthed = !!currentUser;

  const handleGenerateTest = async () => {
    if (!isFirebaseAuthed) {
      toast.error("Precisa de estar autenticado (Password ou Google) para criar alunos.");
      return;
    }

    setIsGenerating(true);
    try {
      await storageService.generateTestStudent();
      toast.success("Aluno de teste criado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar aluno:", error);
      toast.error("Falha ao gerar aluno de teste.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem a certeza que deseja remover este aluno?")) {
      await storageService.deleteStudent(id);
      toast.success("Aluno removido com sucesso");
    }
  };

  const handleShare = (slug: string) => {
    const url = `${window.location.origin}/view/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total Alunos", value: students.length, icon: Users, color: "text-gray-900", bg: "bg-gray-100" },
    { label: "Treinos Ativos", value: students.reduce((acc, s) => acc + s.workouts.length, 0), icon: Activity, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Novos (Mês)", value: students.filter(s => {
      const start = new Date(s.startDate);
      const now = new Date();
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    }).length, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" }
  ];

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-gym-bg text-gym-text pb-24 md:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-64 p-6 border-r border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10 sticky top-0 h-screen">
        <div className="flex items-center gap-2 mb-10">
          <div className="p-2 rounded-lg bg-gray-100">
            <Users className="w-6 h-6 text-gray-900" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-gray-900">GymFlow Admin</span>
        </div>

        <nav className="space-y-2 flex-1">
          <button 
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'students' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <Users className="w-5 h-5" />
            <span>Alunos</span>
          </button>
          <button 
            onClick={() => setActiveTab("workouts")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'workouts' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Treinos</span>
          </button>
          <button 
            onClick={() => setActiveTab("agenda")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'agenda' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <CalendarDays className="w-5 h-5" />
            <span>Agenda</span>
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <Settings className="w-5 h-5" />
            <span>Definições</span>
          </button>
        </nav>

        <button 
          onClick={onLogout}
          className="flex items-center w-full gap-3 p-3 transition-all rounded-xl hover:bg-gray-100 text-gray-600 hover:text-gray-900 font-medium mt-auto"
        >
          <LogOut className="w-5 h-5" />
          <span>Sair</span>
        </button>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gray-100">
            <Users className="w-5 h-5 text-gray-900" />
          </div>
          <span className="text-lg font-bold tracking-tighter text-gray-900">GymFlow Admin</span>
        </div>
        <button 
          onClick={onLogout}
          className="p-2 text-gray-500 hover:text-gray-900"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {!isFirebaseAuthed && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Atenção: Sessão Firebase não iniciada.</p>
              <p>Não conseguirá guardar ou editar alunos. Por favor, faça login com a Password ou Google na página de entrada.</p>
            </div>
          </div>
        )}
        {isFirebaseAuthed && (
          <div className="mb-8 p-6 bg-[#E8F5E9] border border-[#C8E6C9] rounded-[24px] flex items-center gap-4 text-[#2E7D32] shadow-sm">
            <div className="w-2 h-2 rounded-full bg-[#4CAF50] animate-pulse" />
            <div className="text-sm">
              <p className="font-bold">Sessão Admin Ativa</p>
              <p className="opacity-90">Bem-vindo, {currentUser?.displayName || "Caio Weber"}. Todos os dados estão sincronizados com a nuvem.</p>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {activeTab === 'students' ? (
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between mb-8">
                  <div>
                    <h2 className="text-4xl font-black tracking-tight text-gray-900">Gestão de Alunos</h2>
                    <p className="text-gray-500 font-medium mt-2">Adicione e gira os planos de treino dos seus alunos.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleGenerateTest}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 px-6 py-3.5 font-bold transition-all rounded-2xl bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm disabled:opacity-50"
                    >
                      <Beaker className="w-5 h-5" />
                      {isGenerating ? "A gerar..." : "Gerar Teste"}
                    </button>
                    <button 
                      onClick={() => navigate("/admin/new")}
                      className="flex items-center justify-center gap-2 px-8 py-3.5 font-bold transition-all rounded-2xl bg-black text-white hover:bg-gray-900 shadow-xl shadow-black/20"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Aluno
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="bg-white rounded-[24px] p-6 flex items-center gap-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                      <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-black text-gray-900">{stat.value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative mb-8">
                  <Search className="absolute w-5 h-5 text-gray-400 -translate-y-1/2 left-5 top-1/2" />
                  <input
                    type="text"
                    placeholder="Procurar aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                    className="w-full py-5 pl-14 pr-6 text-gray-900 transition-all bg-white border rounded-[24px] border-gray-100 focus:border-gray-200 focus:ring-4 focus:ring-gray-500/5 outline-none shadow-sm font-medium"
                  />
                </div>

                <div className="grid gap-4">
                  {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-[24px] shadow-sm border border-gray-100">
                      <p className="text-gray-600">Nenhum aluno encontrado.</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-6 transition-all bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-gray-200 hover:shadow-md group cursor-pointer"
                        onClick={() => navigate(`/admin/edit/${student.id}`)}
                      >
                        <div className="flex items-center gap-5">
                          <div className="flex items-center justify-center w-14 h-14 font-black rounded-2xl bg-gray-50 text-gray-900 text-xl border border-gray-100">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-lg text-gray-900 tracking-tight">{student.name}</h3>
                              {globalActiveProgress.some(p => p.studentId === student.id) && (
                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                  <Activity className="w-3 h-3" />
                                  Treinando
                                </span>
                              )}
                              <Fingerprint className="w-4 h-4 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-500 mt-0.5">{student.goal}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStudentForProgress(student); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900"
                            title="Ver Progresso"
                          >
                            <Activity className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleShare(student.shareSlug); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900"
                            title="Partilhar"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit/${student.id}`); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-gray-50 text-gray-400 hover:text-gray-900"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500"
                            title="Eliminar"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <div className="ml-2 p-1 text-gray-300 group-hover:text-gray-900 transition-colors">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            ) : activeTab === 'workouts' ? (
              selectedWorkout ? (
                <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedWorkout(null)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-all font-medium"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                    Voltar para Lista de Treinos
                  </button>
                  <div className="bg-white rounded-[32px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
                    <WorkoutEditor 
                      workout={selectedWorkout} 
                      exerciseLibrary={adminSettings?.exerciseLibrary}
                      onUpdate={async (updated) => {
                        // Find the student this workout belongs to
                        const student = students.find(s => s.workouts.some(w => w.id === updated.id));
                        if (student) {
                          const updatedWorkouts = student.workouts.map(w => w.id === updated.id ? updated : w);
                          await storageService.saveStudent({ ...student, workouts: updatedWorkouts });
                          setSelectedWorkout(updated);
                          toast.success("Treino atualizado com sucesso!");
                        }
                      }} 
                    />
                  </div>
                </div>
              ) : (
                <div className="max-w-5xl mx-auto space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Todos os Treinos</h2>
                    <p className="text-gray-600 mt-1">Gira os treinos de todos os alunos.</p>
                  </div>

                  <div className="relative">
                    <Search className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-4 top-1/2" />
                    <input
                      type="text"
                      placeholder="Procurar treino ou exercício..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                      className="w-full py-4 pl-12 pr-4 text-gray-900 transition-all bg-white border rounded-2xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none shadow-sm"
                    />
                  </div>

                  <div className="grid gap-4">
                    {students.flatMap(s => s.workouts.map(w => ({ ...w, studentName: s.name, studentId: s.id })))
                      .filter(w => 
                        w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        w.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        w.exercises.some(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
                      ).length === 0 ? (
                      <div className="p-12 text-center bg-white rounded-[24px] shadow-sm border border-gray-100">
                        <p className="text-gray-600">Nenhum treino encontrado.</p>
                      </div>
                    ) : (
                      students.flatMap(s => s.workouts.map(w => ({ ...w, studentName: s.name, studentId: s.id })))
                        .filter(w => 
                          w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          w.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          w.exercises.some(ex => ex.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        ).map((workout) => (
                        <motion.div 
                          key={workout.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-5 transition-all bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-gray-200 hover:shadow-md group cursor-pointer"
                          onClick={() => setSelectedWorkout(workout)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 font-bold rounded-xl bg-gray-100 text-gray-900 text-lg">
                              {workout.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{workout.name}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">Aluno: <span className="font-medium">{workout.studentName}</span></p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-900 transition-colors" />
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )
            ) : activeTab === 'agenda' ? (
              <CalendarView isAdmin={true} openForStudentId={location.state?.openCalendarForStudent} />
            ) : (
              <div className="max-w-2xl mx-auto space-y-8">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-gray-900">Definições do Painel</h2>
                  <p className="text-gray-600 mt-1">Personalize a aparência do perfil dos seus alunos.</p>
                </div>

                <div className="bg-white rounded-[32px] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 space-y-8">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-gray-900" />
                      Logotipo Personalizado
                    </h3>
                    <p className="text-sm text-gray-500">Este logotipo aparecerá no topo da página individual de cada aluno.</p>
                    
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                        {adminSettings?.logoUrl ? (
                          <img src={adminSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 space-y-3">
                        <label className="block">
                          <span className="sr-only">Escolher logo</span>
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setAdminSettings(prev => prev ? ({ ...prev, logoUrl: reader.result as string }) : ({ id: currentUser?.uid, logoUrl: reader.result as string }));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-900 hover:file:bg-gray-200 transition-all"
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Recomendado: PNG transparente, máx 500kb</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-gray-900">Nome do Instrutor</h3>
                    <input 
                      type="text"
                      value={adminSettings?.instructorName || ""}
                      onChange={(e) => setAdminSettings(prev => prev ? ({ ...prev, instructorName: (e.target as HTMLInputElement).value }) : ({ id: currentUser?.uid, instructorName: (e.target as HTMLInputElement).value }))}
                      placeholder="Seu nome profissional"
                      className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
                    />
                  </div>

                  <div className="space-y-6 pt-8 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gray-900" />
                        Biblioteca de Exercícios
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Novo Exercício</label>
                        <input 
                          id="new-exercise-name"
                          type="text"
                          placeholder="Ex: Supino Reto"
                          className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Área do Corpo</label>
                        <div className="flex gap-2">
                          <input 
                            id="new-exercise-category"
                            type="text"
                            placeholder="Ex: Peito"
                            className="flex-1 p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
                          />
                          <input 
                            id="new-exercise-muscle"
                            type="text"
                            placeholder="Ex: Peitoral Maior"
                            className="flex-1 p-3 bg-white border rounded-xl border-gray-200 focus:border-black focus:ring-2 focus:ring-black/5 outline-none text-gray-900 shadow-sm"
                          />
                          <button 
                            onClick={() => {
                              const nameInput = document.getElementById('new-exercise-name') as HTMLInputElement;
                              const categoryInput = document.getElementById('new-exercise-category') as HTMLInputElement;
                              const muscleInput = document.getElementById('new-exercise-muscle') as HTMLInputElement;
                              if (nameInput.value && categoryInput.value) {
                                const newItem = {
                                  id: crypto.randomUUID(),
                                  name: nameInput.value,
                                  category: categoryInput.value,
                                  muscleGroup: muscleInput.value || categoryInput.value
                                };
                                setAdminSettings(prev => {
                                  const library = prev?.exerciseLibrary || [];
                                  return prev ? ({ ...prev, exerciseLibrary: [...library, newItem] }) : ({ id: currentUser?.uid, exerciseLibrary: [newItem] });
                                });
                                nameInput.value = '';
                                categoryInput.value = '';
                                muscleInput.value = '';
                                toast.success("Exercício adicionado à biblioteca!");
                              }
                            }}
                            className="px-4 bg-black text-white rounded-xl hover:bg-gray-900 transition-all font-bold"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-2xl divide-y divide-gray-50">
                      {adminSettings?.exerciseLibrary?.length ? (
                        adminSettings.exerciseLibrary.map((item) => (
                          <div key={item.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div>
                              <p className="text-sm font-bold text-gray-900">{item.name}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                                {item.category} {item.muscleGroup && item.muscleGroup !== item.category && `• ${item.muscleGroup}`}
                              </p>
                            </div>
                            <button 
                              onClick={() => {
                                setAdminSettings(prev => prev ? ({ ...prev, exerciseLibrary: prev.exerciseLibrary?.filter(i => i.id !== item.id) }) : prev);
                                toast.success("Exercício removido");
                              }}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center text-gray-400 italic text-sm">
                          Nenhum exercício na biblioteca.
                        </div>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={async () => {
                      if (adminSettings) {
                        setIsSavingSettings(true);
                        await storageService.saveAdminSettings(adminSettings);
                        setIsSavingSettings(false);
                        toast.success("Definições guardadas com sucesso!");
                      }
                    }}
                    disabled={isSavingSettings}
                    className="w-full py-4 bg-black text-white font-bold rounded-2xl hover:bg-gray-900 transition-all shadow-lg shadow-black/20 disabled:opacity-50"
                  >
                    {isSavingSettings ? "Guardando..." : "Guardar Alterações"}
                  </button>
                </div>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          } />
          <Route path="/new" element={<StudentForm />} />
          <Route path="/edit/:id" element={<StudentForm />} />
        </Routes>
      </main>

      {/* Progress Widget Modal */}
      <AnimatePresence>
        {selectedStudentForProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-900 font-bold text-xl">
                    {selectedStudentForProgress.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedStudentForProgress.name}</h3>
                    <p className="text-xs text-gray-600 uppercase tracking-widest font-medium mt-0.5">Painel de Progresso</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setSelectedStudentForProgress(null);
                    setProgressTab("metrics");
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-gray-500" />
                </button>
              </div>

              <div className="px-6 pt-4 border-b border-gray-100 flex gap-4">
                <button 
                  onClick={() => setProgressTab("metrics")}
                  className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${progressTab === 'metrics' ? 'border-gym-red text-gym-red' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Métricas & Feedback
                </button>
                <button 
                  onClick={() => setProgressTab("history")}
                  className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${progressTab === 'history' ? 'border-gym-red text-gym-red' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Histórico de Treinos
                </button>
                <button 
                  onClick={() => setProgressTab("evaluations")}
                  className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${progressTab === 'evaluations' ? 'border-gym-red text-gym-red' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                  Avaliações
                </button>
                <button 
                  onClick={() => setProgressTab("active")}
                  className={`pb-3 text-xs font-bold uppercase tracking-widest transition-all border-b-2 ${progressTab === 'active' ? 'border-gym-red text-gym-red' : 'border-transparent text-gray-400 hover:text-gray-600'} flex items-center gap-2`}
                >
                  Em Andamento
                  {activeProgress.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              </div>

              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {progressTab === "active" ? (
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-gym-red" />
                      Treinos em Tempo Real
                    </h3>
                    {activeProgress.length === 0 ? (
                      <div className="p-12 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 font-medium">Nenhum treino sendo realizado no momento.</p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {activeProgress.map((progress) => {
                          const workout = selectedStudentForProgress.workouts.find(w => w.id === progress.workoutId);
                          const totalExercises = workout?.exercises.length || 0;
                          const percentage = totalExercises > 0 ? Math.round((progress.completedExercises.length / totalExercises) * 100) : 0;

                          return (
                            <div key={progress.workoutId} className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-bold text-gray-900 text-lg">{progress.workoutName}</h4>
                                  <p className="text-xs text-gray-500">Iniciado em: {format(parseISO(progress.startedAt), "HH:mm 'de' dd/MM/yyyy")}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black uppercase tracking-widest animate-pulse">
                                    Em Andamento
                                  </span>
                                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-bold">Última atualização: {format(parseISO(progress.lastUpdated), "HH:mm:ss")}</p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-gray-400">
                                  <span>Exercícios Concluídos</span>
                                  <span>{progress.completedExercises.length} / {totalExercises} exercícios</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gym-red transition-all duration-500"
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>

                              {/* Notes */}
                              <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-gray-50 space-y-2">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dificuldades</p>
                                  <p className="text-sm text-gray-700 italic">{progress.difficulties || "Nenhuma observação..."}</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-gray-50 space-y-2">
                                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Observações Pessoais</p>
                                  <p className="text-sm text-gray-700 italic">{progress.personalObservations || "Nenhuma observação..."}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : progressTab === "metrics" ? (
                  <>
                    {/* Metrics Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Peso Inicial</p>
                    <p className="text-xl font-bold text-gray-900">{selectedStudentForProgress.evaluations[0]?.weight}kg</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-green-50 border border-green-100">
                    <p className="text-[10px] font-black text-green-600 uppercase mb-1">Peso Atual</p>
                    <p className="text-xl font-bold text-green-700">
                      {selectedStudentForProgress.evaluations[selectedStudentForProgress.evaluations.length - 1]?.weight}kg
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-orange-50 border border-orange-100">
                    <p className="text-[10px] font-black text-orange-600 uppercase mb-1">Gordura Corporal</p>
                    <p className="text-xl font-bold text-orange-700">
                      {selectedStudentForProgress.evaluations[selectedStudentForProgress.evaluations.length - 1]?.bodyFat || '--'}%
                    </p>
                  </div>
                  <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] font-black text-blue-600 uppercase mb-1">Massa Muscular</p>
                    <p className="text-xl font-bold text-blue-700">
                      {selectedStudentForProgress.evaluations[selectedStudentForProgress.evaluations.length - 1]?.muscleMass || '--'}kg
                    </p>
                  </div>
                </div>

                {/* Workout Feedback */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-gray-600 flex items-center gap-2">
                    <Star className="w-4 h-4 text-gray-900" />
                    Feedback dos Treinos
                  </h4>
                  <div className="grid gap-3">
                    {selectedStudentForProgress.workouts.map((workout) => (
                      <div key={workout.id} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-gray-900">{workout.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase mt-1">Última Atualização: {workout.lastUpdated || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= (workout.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} 
                              />
                            ))}
                          </div>
                          {workout.feedback && (
                            <div className="flex items-center gap-2 text-gray-600 max-w-[200px]">
                              <MessageSquare className="w-4 h-4 shrink-0" />
                              <p className="text-xs italic truncate">{workout.feedback}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Evolution Charts */}
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gym-red" />
                        Evolução de Peso
                      </h4>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={selectedStudentForProgress.evaluations}>
                          <defs>
                            <linearGradient id="colorWeightAdmin" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => val ? format(parseISO(val), 'dd/MM') : ''}
                          />
                          <YAxis 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            axisLine={false} 
                            tickLine={false}
                            domain={['dataMin - 5', 'dataMax + 5']}
                          />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                            labelFormatter={(val) => val ? format(parseISO(val), 'dd/MM/yyyy') : ''}
                          />
                          <Area type="monotone" dataKey="weight" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorWeightAdmin)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-gray-900 flex items-center gap-2">
                        <Target className="w-4 h-4 text-gym-red" />
                        Composição Corporal
                      </h4>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={selectedStudentForProgress.evaluations}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(val) => val ? format(parseISO(val), 'dd/MM') : ''}
                          />
                          <YAxis tick={{fontSize: 10, fill: '#9ca3af'}} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                            labelFormatter={(val) => val ? format(parseISO(val), 'dd/MM/yyyy') : ''}
                          />
                          <Line type="monotone" dataKey="bodyFat" name="Gordura (%)" stroke="#f97316" strokeWidth={3} dot={{r: 4, fill: '#f97316'}} />
                          <Line type="monotone" dataKey="muscleMass" name="Massa Muscular (kg)" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, fill: '#3b82f6'}} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
              ) : (
                <div className="space-y-4">
                  {selectedStudentForProgress.workoutHistory && selectedStudentForProgress.workoutHistory.length > 0 ? (
                    selectedStudentForProgress.workoutHistory.map((session) => (
                      <div key={session.id} className="p-6 rounded-[32px] bg-white border border-gray-100 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-gray-900 text-lg">{session.workoutName}</h4>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {format(parseISO(session.date), "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= (session.rating || 5) ? "fill-black text-black" : "text-gray-200"}`} 
                              />
                            ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 rounded-2xl p-3">
                            <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Exercícios</div>
                            <div className="text-sm font-bold text-gray-900">{session.exercisesCompleted.length} concluídos</div>
                          </div>
                          {session.skippedExercises && session.skippedExercises.length > 0 && (
                            <div className="bg-red-50 rounded-2xl p-3">
                              <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest mb-1">Pulados</div>
                              <div className="text-sm font-bold text-red-900">{session.skippedExercises.length} exercícios</div>
                            </div>
                          )}
                        </div>

                        {(session.difficulties || session.personalObservations || session.feedback) && (
                          <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                            {session.difficulties && (
                              <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Dificuldades / O que pulou</div>
                                <p className="text-xs text-gray-600 italic mt-1">"{session.difficulties}"</p>
                              </div>
                            )}
                            {session.personalObservations && (
                              <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Observações do Aluno</div>
                                <p className="text-xs text-gray-600 italic mt-1">"{session.personalObservations}"</p>
                              </div>
                            )}
                            {session.feedback && (
                              <div>
                                <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Feedback Geral</div>
                                <p className="text-xs text-gray-600 italic mt-1">"{session.feedback}"</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                      <div className="p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <HistoryIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhum treino concluído ainda.</p>
                      </div>
                    )}
                  </div>
                )}

                {progressTab === "evaluations" && (
                  <div className="space-y-4">
                    {selectedStudentForProgress.evaluations && selectedStudentForProgress.evaluations.length > 0 ? (
                      [...selectedStudentForProgress.evaluations].reverse().map((ev, i) => (
                        <div key={i} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gym-red" />
                              <p className="text-sm font-bold text-gray-900">
                                {format(parseISO(ev.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                              </p>
                            </div>
                            <div className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-500">
                              Avaliação #{selectedStudentForProgress.evaluations.length - i}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 p-3 rounded-xl">
                              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Peso</p>
                              <p className="text-sm font-bold text-gray-900">{ev.weight}kg</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl">
                              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">% Gordura</p>
                              <p className="text-sm font-bold text-gray-900">{ev.bodyFat || '--'}%</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl">
                              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Massa Muscular</p>
                              <p className="text-sm font-bold text-gray-900">{ev.muscleMass || '--'}kg</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl">
                              <p className="text-[9px] font-black text-gray-400 uppercase mb-1">IMC</p>
                              <p className="text-sm font-bold text-gray-900">{ev.bmi || '--'}</p>
                            </div>
                          </div>
                          
                          {(ev.bmr || ev.maxHr) && (
                            <div className="mt-4 pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                              {ev.bmr && (
                                <div className="flex items-center gap-2">
                                  <Activity className="w-3 h-3 text-gray-400" />
                                  <span className="text-[10px] text-gray-500 font-medium">TBM: <span className="text-gray-900 font-bold">{ev.bmr} kcal</span></span>
                                </div>
                              )}
                              {ev.maxHr && (
                                <div className="flex items-center gap-2">
                                  <Activity className="w-3 h-3 text-gray-400" />
                                  <span className="text-[10px] text-gray-500 font-medium">Fcmáx: <span className="text-gray-900 font-bold">{ev.maxHr} bpm</span></span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Nenhuma avaliação física registada.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button 
                  onClick={() => {
                    setSelectedStudentForProgress(null);
                    setProgressTab("metrics");
                  }}
                  className="px-6 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl font-bold text-sm text-gray-700 transition-all shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Pill - Mobile Only */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 backdrop-blur-md rounded-full shadow-[0_8px_32px_rgb(0,0,0,0.12)] px-2 py-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider z-50 border border-white/20">
        <button 
          onClick={() => setActiveTab("students")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-full transition-all ${activeTab === "students" ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Users className="w-4 h-4" />
          <span>Alunos</span>
        </button>
        <button 
          onClick={() => setActiveTab("workouts")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-full transition-all ${activeTab === "workouts" ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Treinos</span>
        </button>
        <button 
          onClick={() => setActiveTab("agenda")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-full transition-all ${activeTab === "agenda" ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>Agenda</span>
        </button>
        <button 
          onClick={() => setActiveTab("settings")}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-full transition-all ${activeTab === "settings" ? "bg-black text-white shadow-lg" : "text-gray-500 hover:bg-gray-50"}`}
        >
          <Settings className="w-4 h-4" />
          <span>Definições</span>
        </button>
      </div>
    </div>
  );
}
