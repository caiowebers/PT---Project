import { useState, useEffect } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { Users, Plus, LogOut, Search, Share2, Edit2, Trash2, ChevronRight, Activity, TrendingUp, Calendar, AlertTriangle, Beaker } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import StudentForm from "./StudentForm";
import { Student } from "../types";
import { storageService } from "../services/storageService";
import { auth, onAuthStateChanged } from "../firebase";

interface AdminDashboardProps {
  onLogout: () => void;
}

export default function AdminDashboard({ onLogout }: AdminDashboardProps) {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFirebaseAuthed, setIsFirebaseAuthed] = useState(!!auth.currentUser);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsFirebaseAuthed(!!user);
    });

    const unsubscribeStudents = storageService.subscribeToStudents((data) => {
      setStudents(data);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeStudents();
    };
  }, []);

  const handleGenerateTest = async () => {
    if (!isFirebaseAuthed) {
      toast.error("Precisa de estar autenticado para criar alunos.");
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
          <Link 
            to="/admin" 
            className="flex items-center gap-3 p-3 transition-all rounded-lg hover:bg-white/5 text-gray-300 hover:text-white"
          >
            <Users className="w-5 h-5" />
            <span>Alunos</span>
          </Link>
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
              <p className="font-bold">Atenção: Não está autenticado no Firebase.</p>
              <p>Não conseguirá guardar ou editar alunos. Por favor, faça login com Google na página de entrada.</p>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/" element={
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      className="flex items-center justify-between p-4 transition-all glass-card hover:border-neon-green/50 group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-12 h-12 font-bold rounded-full bg-neon-green/10 text-neon-green">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-bold">{student.name}</h3>
                          <p className="text-sm text-gray-400">{student.goal}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleShare(student.shareSlug)}
                          className="p-2 transition-all rounded-lg hover:bg-neon-green/10 text-gray-400 hover:text-neon-green"
                          title="Partilhar Link"
                        >
                          <Share2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => navigate(`/admin/edit/${student.id}`)}
                          className="p-2 transition-all rounded-lg hover:bg-white/5 text-gray-400 hover:text-white"
                          title="Editar"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(student.id)}
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
          } />
          <Route path="/new" element={<StudentForm />} />
          <Route path="/edit/:id" element={<StudentForm />} />
        </Routes>
      </main>
    </div>
  );
}
