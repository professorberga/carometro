"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Plus, GraduationCap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Turma {
  id: string;
  nome: string;
  segmento: string;
  periodo: string;
  ano: string;
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchTurmas() {
      try {
        const q = query(collection(db, "turmas"), orderBy("nome", "asc"));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turma));
        setTurmas(data);
      } catch (error) {
        console.error("Erro ao buscar turmas:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTurmas();
  }, []);

  const handleTurmaClick = (turmaId: string) => {
    router.push(`/carometro?turmaId=${turmaId}`);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Minhas Turmas</h1>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Gestão e organização das classes</p>
            </div>
            
            <button className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all">
              <Plus className="w-4 h-4" />
              Cadastrar Turma
            </button>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 4, 1].map(i => (
                <div key={i} className="h-48 bg-white rounded-[32px] border border-gray-100"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {turmas.map((turma) => (
                <div 
                  key={turma.id}
                  onClick={() => handleTurmaClick(turma.id)}
                  className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                >
                   {/* Background element for hover effect */}
                  <div className="absolute top-0 right-0 p-4 bg-purple-50 rounded-bl-3xl transform translate-x-12 -translate-y-12 group-hover:translate-x-0 group-hover:translate-y-0 transition-transform">
                    <GraduationCap className="w-5 h-5 text-purple-600" />
                  </div>

                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 font-black mb-6">
                    {turma.nome[0]}
                  </div>

                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{turma.nome}</h3>
                  <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-6">{turma.segmento}</p>

                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-gray-50 text-gray-400 rounded-xl text-[8px] font-black uppercase tracking-widest">{turma.periodo}</span>
                    <span className="px-3 py-1.5 bg-gray-50 text-gray-400 rounded-xl text-[8px] font-black uppercase tracking-widest">{turma.ano}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
