import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate, useLocation } from "react-router-dom";
import { Users, Plus, LogOut, Search, Share2, Edit2, Trash2, ChevronRight, Activity, TrendingUp, Calendar, AlertTriangle, Beaker, Fingerprint, Star, MessageSquare, X, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import StudentForm from "./StudentForm";
import { Student, Workout } from "../types";
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
  const [activeTab, setActiveTab] = useState<"students" | "workouts" | "agenda">("students");
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useEffect(() => {
    if (location.state?.openCalendarForStudent) {
      setActiveTab("agenda");
      // Clear the state so it doesn't re-trigger on subsequent renders
      window.history.replaceState({}, document.title)
    }
  }, [location.state]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
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
  const isVerifiedAdmin = currentUser && currentUser.email === "caioweber1@gmail.com";

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
    { label: "Total Alunos", value: students.length, icon: Users, color: "text-neon-green" },
    { label: "Treinos Ativos", value: students.reduce((acc, s) => acc + s.workouts.length, 0), icon: Activity, color: "text-neon-orange" },
    { label: "Novos (Mês)", value: students.filter(s => {
      const start = new Date(s.startDate);
      const now = new Date();
      return start.getMonth() === now.getMonth() && start.getFullYear() === now.getFullYear();
    }).length, icon: TrendingUp, color: "text-blue-400" }
  ];

  return (
    <div className="flex flex-col min-h-screen md:flex-row">
      {/* Sidebar */}
      <aside className="w-full p-6 border-r md:w-64 border-gym-border bg-gym-card">
        <div className="flex items-center gap-2 mb-10">
          <div className="p-2 rounded-lg bg-neon-green/10">
            <Users className="w-6 h-6 text-neon-green" />
          </div>
          <span className="text-xl font-bold tracking-tighter">GymFlow Admin</span>
        </div>

        <nav className="space-y-2">
          <button 
            onClick={() => setActiveTab("students")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-lg ${activeTab === 'students' ? 'bg-neon-green/10 text-neon-green' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
          >
            <Users className="w-5 h-5" />
            <span className="font-bold">Alunos</span>
          </button>
          <button 
            onClick={() => setActiveTab("workouts")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-lg ${activeTab === 'workouts' ? 'bg-neon-green/10 text-neon-green' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="font-bold">Treinos</span>
          </button>
          <button 
            onClick={() => setActiveTab("agenda")}
            className={`w-full flex items-center gap-3 p-3 transition-all rounded-lg ${activeTab === 'agenda' ? 'bg-neon-green/10 text-neon-green' : 'hover:bg-white/5 text-gray-300 hover:text-white'}`}
          >
            <CalendarDays className="w-5 h-5" />
            <span className="font-bold">Agenda</span>
          </button>
          <button 
            onClick={onLogout}
            className="flex items-center w-full gap-3 p-3 transition-all rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8">
        {!isFirebaseAuthed && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-500">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-bold">Atenção: Sessão Firebase não iniciada.</p>
              <p>Não conseguirá guardar ou editar alunos. Por favor, faça login com a Password ou Google na página de entrada.</p>
            </div>
          </div>
        )}
        {isFirebaseAuthed && !isVerifiedAdmin && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/50 rounded-xl flex items-center gap-3 text-blue-400">
            <div className="text-sm">
              <p className="font-bold">Sessão Local Ativa</p>
              <p>Está a usar uma sessão anónima. Os dados serão guardados, mas para segurança total e gestão multi-dispositivo, recomenda-se o login com Google Admin.</p>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={
            activeTab === 'students' ? (
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Gestão de Alunos</h2>
                    <p className="text-gray-400">Adicione e gira os planos de treino dos seus alunos.</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button 
                      onClick={handleGenerateTest}
                      disabled={isGenerating}
                      className="flex items-center justify-center gap-2 px-4 py-3 font-bold transition-all rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10 disabled:opacity-50"
                    >
                      <Beaker className="w-5 h-5" />
                      {isGenerating ? "A gerar..." : "Gerar Teste"}
                    </button>
                    <button 
                      onClick={() => navigate("/admin/new")}
                      className="flex items-center justify-center gap-2 px-6 py-3 font-bold transition-all rounded-lg bg-neon-green text-gym-dark hover:bg-neon-green/90 neon-shadow-green"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Aluno
                    </button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.map((stat, idx) => (
                    <div key={idx} className="glass-card p-6 flex items-center gap-4">
                      <div className={`p-3 rounded-xl bg-white/5 ${stat.color}`}>
                        <stat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                        <p className="text-2xl font-black">{stat.value}</p>
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
                    className="w-full py-4 pl-12 pr-4 text-white transition-all bg-gym-card border rounded-xl border-gym-border focus:border-neon-green outline-hidden"
                  />
                </div>

                <div className="grid gap-4">
                  {filteredStudents.length === 0 ? (
                    <div className="p-12 text-center glass-card">
                      <p className="text-gray-500">Nenhum aluno encontrado.</p>
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <motion.div 
                        key={student.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between p-4 transition-all glass-card hover:border-neon-green/50 group cursor-pointer"
                        onClick={() => navigate(`/admin/edit/${student.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-12 h-12 font-bold rounded-full bg-neon-green/10 text-neon-green">
                            {student.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold">{student.name}</h3>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(student.id);
                                  toast.success("UUID copiado para a área de transferência!");
                                }}
                                className="p-1 rounded-md hover:bg-white/10 text-gray-600 hover:text-neon-green transition-all"
                                title={`Copiar UUID: ${student.id}`}
                              >
                                <Fingerprint className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <p className="text-sm text-gray-400">{student.goal}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStudentForProgress(student); }}
                            className="p-2 transition-all rounded-lg hover:bg-blue-500/10 text-gray-400 hover:text-blue-400"
                            title="Ver Progresso"
                          >
                            <Activity className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleShare(student.shareSlug); }}
                            className="p-2 transition-all rounded-lg hover:bg-neon-green/10 text-gray-400 hover:text-neon-green"
                            title="Partilhar Link"
                          >
                            <Share2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); navigate(`/admin/edit/${student.id}`); }}
                            className="p-2 transition-all rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                            title="Editar"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(student.id); }}
                            className="p-2 transition-all rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-500"
                            title="Remover"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                          <ChevronRight className="w-5 h-5 ml-2 text-gray-600" />
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
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-all"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                    Voltar para Lista de Treinos
                  </button>
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
              ) : (
                <div className="max-w-5xl mx-auto space-y-8">
                  <div>
                    <h2 className="text-3xl font-bold italic tracking-tighter uppercase">Todos os Treinos</h2>
                    <p className="text-gray-400">Gira os treinos de todos os alunos.</p>
                  </div>
                  <div className="grid gap-4">
                    {students.flatMap(s => s.workouts.map(w => ({ ...w, studentName: s.name, studentId: s.id }))).length === 0 ? (
                      <div className="p-12 text-center glass-card">
                        <p className="text-gray-500">Nenhum treino encontrado.</p>
                      </div>
                    ) : (
                      students.flatMap(s => s.workouts.map(w => ({ ...w, studentName: s.name, studentId: s.id }))).map((workout) => (
                        <motion.div 
                          key={workout.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 transition-all glass-card hover:border-neon-green/50 group cursor-pointer"
                          onClick={() => setSelectedWorkout(workout)}
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-12 h-12 font-bold rounded-full bg-neon-green/10 text-neon-green">
                              {workout.name.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-bold">{workout.name}</h3>
                              <p className="text-sm text-gray-400">Aluno: {workout.studentName}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-neon-green" />
                        </motion.div>
                      ))
                    )}
                  </div>
                </div>
              )
            ) : (
              <CalendarView isAdmin={true} openForStudentId={location.state?.openCalendarForStudent} />
            )
          } />
          <Route path="/new" element={<StudentForm />} />
          <Route path="/edit/:id" element={<StudentForm />} />
        </Routes>
      </main>

      {/* Progress Widget Modal */}
      <AnimatePresence>
        {selectedStudentForProgress && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-gym-card border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-neon-green/10 flex items-center justify-center text-neon-green font-bold text-xl">
                    {selectedStudentForProgress.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedStudentForProgress.name}</h3>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">Painel de Progresso</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedStudentForProgress(null)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {/* Metrics Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Peso Inicial</p>
                    <p className="text-lg font-bold">{selectedStudentForProgress.evaluations[0]?.weight}kg</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Peso Atual</p>
                    <p className="text-lg font-bold text-neon-green">
                      {selectedStudentForProgress.evaluations[selectedStudentForProgress.evaluations.length - 1]?.weight}kg
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Gordura Corporal</p>
                    <p className="text-lg font-bold text-neon-orange">
                      {selectedStudentForProgress.evaluations[selectedStudentForProgress.evaluations.length - 1]?.bodyFat || '--'}%
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-1">Massa Muscular</p>
                    <p className="text-lg font-bold text-blue-400">
                      {selectedStudentForProgress.evaluations[selectedStudentForProgress.evaluations.length - 1]?.muscleMass || '--'}kg
                    </p>
                  </div>
                </div>

                {/* Workout Feedback */}
                <div className="space-y-4">
                  <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <Star className="w-4 h-4 text-neon-green" />
                    Feedback dos Treinos
                  </h4>
                  <div className="grid gap-3">
                    {selectedStudentForProgress.workouts.map((workout) => (
                      <div key={workout.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <p className="font-bold text-white">{workout.name}</p>
                          <p className="text-[10px] text-gray-500 uppercase">Última Atualização: {workout.lastUpdated || 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-4 h-4 ${star <= (workout.rating || 0) ? "fill-neon-green text-neon-green" : "text-gray-800"}`} 
                              />
                            ))}
                          </div>
                          {workout.feedback && (
                            <div className="flex items-center gap-2 text-gray-400 max-w-[200px]">
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
                <div className="p-6 rounded-3xl bg-neon-green/5 border border-neon-green/10">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-neon-green">Tendência de Peso</h4>
                    <TrendingUp className="w-4 h-4 text-neon-green" />
                  </div>
                  <div className="h-24 flex items-end gap-2">
                    {selectedStudentForProgress.evaluations.map((ev, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-neon-green/20 rounded-t-lg transition-all hover:bg-neon-green/40"
                        style={{ height: `${(ev.weight / 150) * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
                <button 
                  onClick={() => setSelectedStudentForProgress(null)}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-bold text-xs transition-all"
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
