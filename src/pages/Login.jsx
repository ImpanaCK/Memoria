import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { Camera, Sparkles } from 'lucide-react';

export default function Login() {
  const { user, signInWithGoogle } = useAuth();

  // If user is already logged in, redirect to dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden text-slate-200">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-96 h-96 bg-primary-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 w-full max-w-md p-8 rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 shadow-2xl relative"
      >
        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 20 }}
            className="w-24 h-24 bg-gradient-to-br from-primary-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/30"
          >
            <Camera className="w-10 h-10 text-white" />
          </motion.div>
        </div>

        <div className="mt-12 text-center">
          <motion.h1 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-4xl font-bold tracking-tight text-white mb-3"
          >
            Memoria
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-slate-400 mb-8 flex items-center justify-center gap-2"
          >
            Your life's moments, beautifully organized
            <Sparkles className="w-4 h-4 text-primary-400" />
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <button
              onClick={signInWithGoogle}
              className="w-full relative group flex items-center justify-center gap-3 bg-white text-slate-900 px-6 py-4 rounded-xl font-medium text-lg transition-all hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-slate-900 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <FcGoogle className="w-6 h-6 z-10" />
              <span className="z-10">Continue with Google</span>
            </button>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-8 text-center text-sm text-slate-500"
        >
          <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
