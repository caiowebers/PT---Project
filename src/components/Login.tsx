import React, { useState } from "react";
import { Dumbbell, Lock, LogIn } from "lucide-react";
import { motion } from "motion/react";
import { auth, googleProvider, signInWithPopup, signInAnonymously } from "../firebase";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (password: string) => boolean;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (onLogin(password)) {
        // Sign in anonymously to allow Firestore writes without Google login
        await signInAnonymously(auth);
        setError(false);
        toast.success("Sessão iniciada!");
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Erro ao entrar anonimamente:", err);
      toast.error("Erro ao iniciar sessão no Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user.email === "caioweber1@gmail.com") {
        onLogin(process.env.ADMIN_PASSWORD || "admin123");
        toast.success("Autenticado como Admin com sucesso!");
      } else {
        toast.error("Acesso negado. Apenas o administrador pode entrar.");
        await auth.signOut();
      }
    } catch (error: any) {
      console.error("Erro ao entrar com Google:", error);
      const errorCode = error.code || "unknown";
      const errorMessage = error.message || "Erro desconhecido";
      
      if (errorCode === "auth/unauthorized-domain") {
        toast.error(`Domínio não autorizado (${window.location.hostname}). Por favor, adicione este domínio na consola Firebase.`);
      } else if (errorCode === "auth/popup-blocked") {
        toast.error("O popup foi bloqueado pelo seu navegador. Por favor, permita popups para este site.");
      } else {
        toast.error(`Falha na autenticação: ${errorCode}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-black overflow-hidden">
      {/* Left Side: Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img 
          src="https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1974&auto=format&fit=crop" 
          alt="Personal Trainer" 
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-neon-green text-black">
                <Dumbbell className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">GymFlow</h1>
            </div>
            <h2 className="text-5xl font-black text-white leading-tight mb-4 tracking-tight">
              GESTÃO DE TREINOS EM <span className="text-neon-green">ALTA PERFORMANCE</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-md font-medium">
              A ferramenta definitiva para Personal Trainers que buscam excelência e resultados reais para seus alunos.
            </p>
          </motion.div>
        </div>

        {/* Decorative element */}
        <div className="absolute top-12 left-12">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-neon-green/50">
            <span className="w-8 h-[1px] bg-neon-green/50"></span>
            Professional Edition
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gym-dark relative">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon-green/5 blur-[120px] rounded-full pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="lg:hidden flex flex-col items-center mb-12">
            <div className="p-4 mb-4 rounded-2xl bg-neon-green/10">
              <Dumbbell className="w-12 h-12 text-neon-green" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">GymFlow</h1>
          </div>

          <div className="mb-10">
            <h3 className="text-3xl font-black text-white mb-2 tracking-tight">BEM-VINDO DE VOLTA</h3>
            <p className="text-gray-500 font-medium">Aceda ao seu painel de controlo administrativo.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 flex items-center justify-center gap-3 font-bold transition-all rounded-xl bg-white text-gym-dark hover:bg-gray-100 disabled:opacity-50 shadow-xl group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {loading ? "A autenticar..." : "Entrar com Google (Admin)"}
              </button>
              
              <p className="text-[10px] text-center text-gray-600 uppercase font-black tracking-widest">
                Recomendado para sincronização de dados
              </p>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/5"></span>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
                <span className="px-4 bg-gym-dark text-gray-700">Ou use credenciais</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Password de Acesso</label>
                </div>
                <div className="relative group">
                  <Lock className="absolute w-5 h-5 text-gray-700 group-focus-within:text-neon-green transition-colors -translate-y-1/2 left-4 top-1/2" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full py-4 pl-12 pr-4 text-white transition-all bg-white/5 border border-white/10 rounded-xl focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-hidden font-bold"
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <motion.p 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-[10px] font-bold text-red-500 uppercase tracking-wider"
                  >
                    Password incorreta. Tente admin123
                  </motion.p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 font-black uppercase tracking-widest text-sm transition-all rounded-xl bg-neon-green text-black hover:bg-neon-green/90 shadow-[0_0_20px_rgba(0,255,0,0.2)] hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] disabled:opacity-50"
              >
                {loading ? "Processando..." : "Entrar no Sistema"}
              </button>
            </form>
          </div>

          <div className="mt-12 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] text-gray-700 font-black uppercase tracking-[0.2em]">
              GymFlow &copy; 2026 • Todos os direitos reservados
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
