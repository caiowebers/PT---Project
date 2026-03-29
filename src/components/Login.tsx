import React, { useState } from "react";
import { Dumbbell, Lock, LogIn, Mail } from "lucide-react";
import { motion } from "motion/react";
import { auth, googleProvider, signInWithPopup, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "../firebase";
import { storageService } from "../services/storageService";
import { toast } from "sonner";

interface LoginProps {
  onLogin: (password: string) => boolean;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<"admin" | "email">("admin");
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (onLogin(adminPassword)) {
        // Sign in anonymously to allow Firestore writes without Google login
        await signInAnonymously(auth);
        setError(false);
        toast.success("Sessão iniciada!");
      } else {
        setError(true);
        toast.error("Password incorreta!");
      }
    } catch (err) {
      console.error("Erro ao entrar anonimamente:", err);
      toast.error("Erro ao iniciar sessão no Firebase.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Email e password são obrigatórios!");
      return;
    }

    if (password.length < 6) {
      toast.error("Password deve ter pelo menos 6 caracteres!");
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user profile in Firestore
      try {
        await storageService.createUserProfile(result.user.uid, result.user.email || email);
      } catch (profileError) {
        console.error("Aviso ao criar perfil:", profileError);
        // Allow registration to proceed even if profile creation fails
      }
      
      onLogin(process.env.ADMIN_PASSWORD || "admin123");
      toast.success(`Conta criada com sucesso! Bem-vindo, ${result.user.email}`);
      setEmail("");
      setPassword("");
      setIsRegistering(false);
      setError(false);
    } catch (error: any) {
      const errorCode = error.code || "unknown";
      console.error("Erro ao registar - Código:", errorCode, "Mensagem:", error.message);
      
      if (errorCode === "auth/email-already-in-use") {
        toast.error("Este email já está registado. Tente entrar no seu conta.");
      } else if (errorCode === "auth/invalid-email") {
        toast.error("Email inválido!");
      } else if (errorCode === "auth/weak-password") {
        toast.error("Password muito fraca. Use pelo menos 6 caracteres.");
      } else if (errorCode === "auth/too-many-requests") {
        toast.error("Muitas tentativas. Tente novamente mais tarde.");
      } else if (errorCode === "auth/operation-not-allowed") {
        toast.error("Este método de autenticação não está ativado. Contacte o suporte.");
      } else {
        toast.error(`Erro ao registar: ${error.message || errorCode}`);
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error("Email e password são obrigatórios!");
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user profile exists, if not create it
      try {
        const existingProfile = await storageService.getUserProfile(result.user.uid);
        if (!existingProfile) {
          await storageService.createUserProfile(result.user.uid, result.user.email || email);
        }
      } catch (profileError) {
        // If profile fetch/create fails, try to create it
        console.warn("Aviso ao carregar perfil:", profileError);
        try {
          await storageService.createUserProfile(result.user.uid, result.user.email || email);
        } catch (createError) {
          console.error("Erro ao criar perfil:", createError);
          // Allow login to proceed even if profile creation fails
        }
      }
      
      onLogin(process.env.ADMIN_PASSWORD || "admin123");
      toast.success(`Bem-vindo de volta, ${result.user.email}!`);
      setEmail("");
      setPassword("");
      setError(false);
    } catch (error: any) {
      const errorCode = error.code || "unknown";
      console.error("Erro ao entrar - Código:", errorCode, "Mensagem:", error.message);
      
      if (errorCode === "auth/user-not-found") {
        toast.error("Conta não encontrada. Registre-se primeiro!");
      } else if (errorCode === "auth/wrong-password") {
        toast.error("Email ou password incorretos!");
      } else if (errorCode === "auth/invalid-email") {
        toast.error("Email inválido!");
      } else if (errorCode === "auth/invalid-credential") {
        toast.error("Credenciais inválidas!");
      } else if (errorCode === "auth/too-many-requests") {
        toast.error("Muitas tentativas falhadas. Tente novamente mais tarde.");
      } else if (errorCode === "auth/operation-not-allowed") {
        toast.error("Este método de autenticação não está ativado. Contacte o suporte.");
      } else {
        toast.error(`Erro ao entrar: ${error.message || errorCode}`);
      }
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Check if user profile exists, if not create it
      try {
        const existingProfile = await storageService.getUserProfile(result.user.uid);
        if (!existingProfile) {
          await storageService.createUserProfile(
            result.user.uid,
            result.user.email || "",
            result.user.displayName
          );
        }
      } catch (profileError) {
        console.warn("Aviso ao carregar perfil Google:", profileError);
        try {
          await storageService.createUserProfile(
            result.user.uid,
            result.user.email || "",
            result.user.displayName
          );
        } catch (createError) {
          console.error("Erro ao criar perfil Google:", createError);
          // Allow login to proceed even if profile creation fails
        }
      }

      // Qualquer conta Google pode acessar
      onLogin(process.env.ADMIN_PASSWORD || "admin123");
      toast.success(`Autenticado com sucesso como ${result.user.email}`);

    } catch (error: any) {
      console.error("Erro ao entrar com Google - Código:", error.code, "Mensagem:", error.message);

      const errorCode = error.code || "unknown";
      const errorMessage = error.message || "Erro desconhecido";

      if (errorCode === "auth/unauthorized-domain") {
        toast.error(
          `Domínio não autorizado (${window.location.hostname}). Adicione este domínio no console do Firebase.`
        );
      } else if (errorCode === "auth/popup-blocked") {
        toast.error(
          "O popup foi bloqueado pelo navegador. Permita popups para este site."
        );
      } else if (errorCode === "auth/cancelled-popup-request") {
        toast.error("Login cancelado pelo utilizador.");
      } else if (errorCode === "auth/operation-not-allowed") {
        toast.error("Autenticação Google não está ativada. Contacte o suporte.");
      } else {
        toast.error(`Falha na autenticação: ${errorMessage}`);
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
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gym-dark relative overflow-y-auto">
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

          {/* Auth Mode Tabs */}
          <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setAuthMode("admin")}
              className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all uppercase tracking-wider ${
                authMode === "admin"
                  ? "bg-neon-green text-black shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => setAuthMode("email")}
              className={`flex-1 py-3 px-4 rounded-lg font-black text-sm transition-all uppercase tracking-wider ${
                authMode === "email"
                  ? "bg-neon-green text-black shadow-lg"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Email
            </button>
          </div>

          <div className="space-y-8">
            {/* Admin Mode */}
            {authMode === "admin" && (
              <>
                <div className="space-y-4">
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="w-full py-4 flex items-center justify-center gap-3 font-bold transition-all rounded-xl bg-white text-gym-dark hover:bg-gray-100 disabled:opacity-50 shadow-xl group"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    {loading ? "A autenticar..." : "Entrar com Google"}
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
                    <span className="px-4 bg-gym-dark text-gray-700">Ou use password</span>
                  </div>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Password de Acesso</label>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute w-5 h-5 text-gray-700 group-focus-within:text-neon-green transition-colors -translate-y-1/2 left-4 top-1/2" />
                      <input
                        type="password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
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
                        Password incorreta
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
              </>
            )}

            {/* Email Mode */}
            {authMode === "email" && (
              <>
                <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-lg border border-white/10">
                  <button
                    onClick={() => setIsRegistering(false)}
                    className={`flex-1 py-2 px-3 rounded-md font-black text-xs transition-all ${
                      !isRegistering
                        ? "bg-neon-green/20 text-neon-green"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    onClick={() => setIsRegistering(true)}
                    className={`flex-1 py-2 px-3 rounded-md font-black text-xs transition-all ${
                      isRegistering
                        ? "bg-neon-green/20 text-neon-green"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Registar
                  </button>
                </div>

                <form onSubmit={isRegistering ? handleEmailRegister : handleEmailSignIn} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Email</label>
                    <div className="relative group">
                      <Mail className="absolute w-5 h-5 text-gray-700 group-focus-within:text-neon-green transition-colors -translate-y-1/2 left-4 top-1/2" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full py-4 pl-12 pr-4 text-white transition-all bg-white/5 border border-white/10 rounded-xl focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-hidden font-bold"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Password</label>
                    <div className="relative group">
                      <Lock className="absolute w-5 h-5 text-gray-700 group-focus-within:text-neon-green transition-colors -translate-y-1/2 left-4 top-1/2" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full py-4 pl-12 pr-4 text-white transition-all bg-white/5 border border-white/10 rounded-xl focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-hidden font-bold"
                        placeholder="••••••••"
                        required
                      />
                    </div>
                    {isRegistering && (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        Mínimo 6 caracteres
                      </p>
                    )}
                  </div>

                  {error && (
                    <motion.p 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-[10px] font-bold text-red-500 uppercase tracking-wider"
                    >
                      {isRegistering ? "Erro ao registar" : "Credenciais inválidas"}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 font-black uppercase tracking-widest text-sm transition-all rounded-xl bg-neon-green text-black hover:bg-neon-green/90 shadow-[0_0_20px_rgba(0,255,0,0.2)] hover:shadow-[0_0_30px_rgba(0,255,0,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <LogIn className="w-4 h-4" />
                    {loading ? "Processando..." : (isRegistering ? "Criar Conta" : "Entrar")}
                  </button>
                </form>
              </>
            )}
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
