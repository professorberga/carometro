"use client";

import { useAuth } from "@/contexts/AuthContext";
import { GraduationCap, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LoginPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="flex-1 p-12 flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-gray-900">
            <span className="text-purple-600">Carômetro</span>Escolar
          </h1>
        </div>

        <div className="max-w-md">
          <h2 className="text-6xl font-black text-gray-900 uppercase tracking-tighter leading-[0.9] mb-8">
            Gestão Escolar <br />
            <span className="text-purple-600">Visual e Moderna.</span>
          </h2>
          <p className="text-gray-500 font-bold text-lg mb-12 leading-relaxed">
            Acompanhe seus alunos de forma rápida, intuitiva e segura com o Carômetro Escolar.
          </p>

          <button 
            onClick={signInWithGoogle}
            className="flex items-center gap-4 bg-gray-900 text-white px-10 py-6 rounded-[32px] font-black uppercase text-xs tracking-widest shadow-2xl hover:bg-purple-600 transition-all group"
          >
            Acessar com Google
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          &copy; 2024 Carômetro Escolar • Sistema de Gestão 
        </div>
      </div>

      <div className="flex-1 bg-purple-600 relative overflow-hidden hidden md:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,transparent_50%)]"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="grid grid-cols-3 gap-8 opacity-20 transform -rotate-12 scale-150">
            {[1,2,3,4,5,6,7,8,9].map(i => (
              <div key={i} className="w-32 h-40 bg-white rounded-3xl"></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
