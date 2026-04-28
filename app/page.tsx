'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPage() {
  const { user, profile, login, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && profile) {
      if (profile.role === 'gestor') {
        router.push('/dashboard');
      } else {
        router.push('/carometro');
      }
    }
  }, [user, profile, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100"
      >
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-purple-600 tracking-tight mb-2">
            Carômetro<span className="text-gray-900 font-normal">Escolar</span>
          </h1>
          <p className="text-gray-500 text-lg">
            Sistema de identificação visual institucional
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <p className="text-center text-sm text-gray-600">
            Escolas PEI / SEDUC-SP
          </p>
          
          <button
            onClick={login}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all shadow-lg hover:shadow-purple-200"
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <LogIn className="h-5 w-5 text-purple-400 group-hover:text-purple-300" aria-hidden="true" />
            </span>
            Entrar com Google
          </button>

          <div className="text-center text-xs text-gray-400">
            Apenas e-mails institucionais ou autorizados.
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 mt-8 text-center">
          <p className="text-xs text-gray-400">
            v1.0 · 2025 · Gestão Integrada
          </p>
        </div>
      </motion.div>
    </div>
  );
}
