import React, { useState } from "react";
import { Dumbbell, Lock } from "lucide-react";
import { motion } from "motion/react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { toast } from "sonner";

interface LoginProps {
  onLogin: () => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      // Login com Google
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user) {
        toast.error("Erro: usuário não retornado pelo Google");
        return;
      }

      // Store Google OAuth access token for Calendar API
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        localStorage.setItem('google_calendar_access_token', credential.accessToken);
      }

      // Cria ou atualiza o perfil do usuário no Firestore
      await setDoc(
        doc(db, "users", user.uid, "profile", "info"),
        {
          name: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          uid: user.uid,
          lastLogin: new Date().toISOString(),
        },
        { merge: true }
      );

      toast.success(`Bem-vindo, ${user.displayName}!`);
      onLogin(); // sucesso → executa callback do pai

    } catch (error: any) {
      console.error("Erro ao entrar com Google:", error);
      toast.error(`Falha na autenticação (${error.code || "desconhecido"})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gym-bg overflow-hidden">
      {/* Left side (imagem / branding) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          alt="Personal Trainer"
          src="https://images.unsplash.com/photo-1594381898411-846e7d193883?q=80&w=1974&auto=format&fit=crop"
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-gym-red text-white shadow-lg shadow-red-500/30">
                <Dumbbell className="w-8 h-8" />
              </div>
              <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">
                GymFlow
              </h1>
            </div>
            <h2 className="text-5xl font-black text-white leading-tight mb-4 tracking-tight">
              GESTÃO DE TREINOS EM{" "}
              <span className="text-gym-red">ALTA PERFORMANCE</span>
            </h2>
            <p className="text-gray-200 text-lg max-w-md font-medium">
              A ferramenta definitiva para Personal Trainers que buscam
              excelência e resultados reais para seus alunos.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side (form de login) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-500/5 blur-[120px] rounded-full pointer-events-none"></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="flex flex-col items-center mb-12">
            <div className="p-4 mb-4 rounded-2xl bg-red-50">
              <Dumbbell className="w-12 h-12 text-gym-red" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-gray-900 uppercase italic">
              GymFlow
            </h1>
          </div>

          <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
            BEM-VINDO DE VOLTA
          </h3>
          <p className="text-gray-600 font-medium mb-8">
            Aceda ao seu painel de controlo administrativo.
          </p>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-4 flex items-center justify-center gap-3 font-bold transition-all rounded-xl bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 shadow-sm group"
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google"
              className="w-5 h-5 group-hover:scale-110 transition-transform"
            />
            {loading ? "A autenticar..." : "Entrar com Google"}
          </button>

          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">
              GymFlow &copy; 2026 • Todos os direitos reservados
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

