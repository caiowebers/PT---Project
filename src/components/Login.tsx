import { useState } from "react";
import { Dumbbell, Lock } from "lucide-react";
import { motion } from "motion/react";

interface LoginProps {
  onLogin: (password: string) => boolean;
}

export default function Login({ onLogin }: LoginProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onLogin(password)) {
      setError(false);
    } else {
      setError(true);
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
      </motion.div>
    </div>
  );
}
