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
    <div className="flex items-center justify-center min-h-screen p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 glass-card"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="p-4 mb-4 rounded-full bg-neon-green/10">
            <Dumbbell className="w-12 h-12 text-neon-green" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-white">GymFlow</h1>
          <p className="text-gray-400">Admin Dashboard Access</p>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-neon-green/5 border border-neon-green/20">
            <p className="text-xs text-center text-gray-400 mb-4">
              A autenticação Google é necessária para guardar dados no Firebase.
            </p>
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-4 flex items-center justify-center gap-3 font-bold transition-all rounded-lg bg-white text-gym-dark hover:bg-gray-200 disabled:opacity-50 shadow-lg"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              {loading ? "A autenticar..." : "Entrar com Google (Admin)"}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gym-border"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-gym-dark text-gray-500">Ou use a password</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <Lock className="absolute w-5 h-5 text-gray-500 -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 pl-10 pr-4 text-white transition-all bg-black border rounded-lg border-gym-border focus:border-neon-green focus:ring-1 focus:ring-neon-green outline-hidden"
                  placeholder="Enter password"
                />
              </div>
              {error && <p className="text-xs text-red-500">Incorrect password. Try admin123</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 font-bold transition-all rounded-lg bg-neon-green text-gym-dark hover:bg-neon-green/90 neon-shadow-green"
            >
              Login
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
