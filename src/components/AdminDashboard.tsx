import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Users, Plus, LogOut, Search, Share2, Edit2, Trash2, ChevronRight, Activity, TrendingUp, Calendar, AlertTriangle, Beaker, Fingerprint, Star, MessageSquare, X, CalendarDays, Settings, Image as ImageIcon, History as HistoryIcon, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import StudentForm from "./StudentForm";
import { Student, Workout, AdminSettings } from "../types";
import { storageService } from "../services/storageService";
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
  const [progressTab, setProgressTab] = useState<"metrics" | "history">("metrics");
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
    { label: "Total Alunos", value: students.length, icon: Users, color: "text-gym-red", bg: "bg-red-50" },
    { label: "Treinos Ativos", value: students.reduce((acc, s) => acc + s.workouts.length, 0), icon: Activity, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Novos (Mês)", value: students.filter(s => {
      const start = new Date(s.startDate);
      const now = new Date();
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    }).length, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" }
  ];

  return (
    <div className="flex flex-col min-h-screen md:flex-row bg-gym-bg text-gym-text">
      {/* Sidebar */}
      <aside className="w-full p-6 border-r md:w-64 border-gray-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] z-10">
        <div className="flex items-center gap-2 mb-10">
          <div className="p-2 rounded-lg bg-red-50">
            <Users className="w-6 h-6 text-gym-red" />
          </div>
          <span className="text-xl font-bold tracking-tighter text-gray-900">GymFlow Admin</span>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'students' ? 'bg-red-50 text-gym-red' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <Users className="w-5 h-5" />
            <span>Alunos</span>
          </button>
          <button 
            onClick={() => setActiveTab("workouts")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'workouts' ? 'bg-red-50 text-gym-red' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span>Treinos</span>
          </button>
          <button 
            onClick={() => setActiveTab("agenda")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'agenda' ? 'bg-red-50 text-gym-red' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <CalendarDays className="w-5 h-5" />
            <span>Agenda</span>
          </button>
          <button 
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-xl font-medium ${activeTab === 'settings' ? 'bg-red-50 text-gym-red' : 'hover:bg-gray-50 text-gray-600 hover:text-gray-900'}`}
          >
            <Settings className="w-5 h-5" />
            <span>Definições</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center w-full gap-3 p-3 transition-all rounded-xl hover:bg-red-50 text-gray-600 hover:text-red-500 font-medium mt-8"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
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
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3 text-green-700 shadow-sm">
            <div className="text-sm">
              <p className="font-bold">Sessão Admin Ativa</p>
              <p>Bem-vindo, {currentUser?.displayName || "Administrador"}. Todos os dados estão sincronizados com a nuvem.</p>
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
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Gestão de Alunos</h2>
                    <p className="text-gray-600 mt-1">Adicione e gira os planos de treino dos seus alunos.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button 
                      onClick={handleGenerateTest}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 px-4 py-3 font-bold transition-all rounded-xl bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm disabled:opacity-50"
                    >
                      <Beaker className="w-5 h-5" />
                      {isGenerating ? "A gerar..." : "Gerar Teste"}
                    </button>
                    <button 
                      onClick={() => navigate("/admin/new")}
                      className="flex items-center justify-center gap-2 px-6 py-3 font-bold transition-all rounded-xl bg-gym-red text-white hover:bg-red-800 shadow-md shadow-red-500/20"
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

                <div className="relative">
                  <Search className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-4 top-1/2" />
                  <input
                    type="text"
                    placeholder="Procurar aluno..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
                    className="w-full py-4 pl-12 pr-4 text-gray-900 transition-all bg-white border rounded-2xl border-gray-200 focus:border-gym-red focus:ring-2 focus:ring-red-500/20 outline-none shadow-sm"
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
                        className="flex items-center justify-between p-5 transition-all bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-red-200 hover:shadow-md group cursor-pointer"
                        onClick={() => navigate(`/admin/edit/${student.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 font-bold rounded-xl bg-red-50 text-gym-red text-lg">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-gray-900">{student.name}</h3>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(student.id);
                                  toast.success("UUID copiado para a área de transferência!");
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gym-red transition-all"
                                title={`Copiar UUID: ${student.id}`}
                              >
                                <Fingerprint className="w-4 h-4" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{student.goal}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStudentForProgress(student); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-blue-50 text-gray-500 hover:text-blue-500"
                            title="Ver Progresso"
                          >
                            <Activity className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleShare(student.shareSlug); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-red-50 text-gray-500 hover:text-gym-red"
                            title="Partilhar Link"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit/${student.id}`); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }}
                            className="p-2.5 transition-all rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-500"
                            title="Remover"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <ChevronRight className="w-5 h-5 ml-2 text-gray-300 group-hover:text-gym-red transition-colors" />
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
                      className="w-full py-4 pl-12 pr-4 text-gray-900 transition-all bg-white border rounded-2xl border-gray-200 focus:border-gym-red focus:ring-2 focus:ring-red-500/20 outline-none shadow-sm"
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
                          className="flex items-center justify-between p-5 transition-all bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 hover:border-red-200 hover:shadow-md group cursor-pointer"
                          onClick={() => setSelectedWorkout(workout)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 font-bold rounded-xl bg-red-50 text-gym-red text-lg">
                              {workout.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{workout.name}</h3>
                              <p className="text-sm text-gray-600 mt-0.5">Aluno: <span className="font-medium">{workout.studentName}</span></p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gym-red transition-colors" />
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
                      <ImageIcon className="w-5 h-5 text-gym-red" />
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
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-gym-red hover:file:bg-red-100 transition-all"
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
                      className="w-full p-3 bg-white border rounded-xl border-gray-200 focus:border-gym-red focus:ring-2 focus:ring-red-500/20 outline-none text-gray-900 shadow-sm"
                    />
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
                    className="w-full py-4 bg-gym-red text-white font-bold rounded-2xl hover:bg-red-800 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
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
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-gym-red font-bold text-xl">
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
              </div>

              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {progressTab === "metrics" ? (
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
                    <Star className="w-4 h-4 text-gym-red" />
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

                {/* Evolution Chart Placeholder (Visual only) */}
                <div className="p-6 rounded-3xl bg-red-50 border border-red-100">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-gym-red">Tendência de Peso</h4>
                    <TrendingUp className="w-4 h-4 text-gym-red" />
                  </div>
                  <div className="h-24 flex items-end gap-2">
                    {selectedStudentForProgress.evaluations.map((ev, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-red-200 rounded-t-lg transition-all hover:bg-red-300"
                        style={{ height: `${(ev.weight / 150) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </>
              ) : (
                <div className="space-y-4">
                  {selectedStudentForProgress.workoutHistory && selectedStudentForProgress.workoutHistory.length > 0 ? (
                    selectedStudentForProgress.workoutHistory.map((session) => (
                      <div key={session.id} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-gray-900">{session.workoutName}</h4>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                              {session.date}
                            </p>
                          </div>
                          <div className="bg-green-50 text-green-600 p-2 rounded-full">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        
                        {session.feedback && (
                          <div className="bg-gray-50 rounded-xl p-3 mb-3">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Feedback do Aluno</p>
                            <p className="text-xs text-gray-600 italic">"{session.feedback}"</p>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {session.exercisesCompleted.length} exercícios concluídos
                          </span>
                          {session.rating && (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star} 
                                  className={`w-3 h-3 ${star <= session.rating! ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} 
                                />
                                ))}
                              </div>
                            )}
                          </div>
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
    </div>
  );
}
