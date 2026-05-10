"use client";

import { useEffect, useState, Suspense } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useSearchParams } from "next/navigation";
import { Search, User, X, Edit2, Trash2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Aluno {
  id: string;
  nomeCompleto: string;
  ra: string;
  numeroChamada?: number;
  turmaId: string;
  fotoUrl?: string;
}

interface Turma {
  id: string;
  nome: string;
}

function CarometroContent() {
  const searchParams = useSearchParams();
  const initialTurma = searchParams.get("turmaId") || "";
  const router = useRouter();
  
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});
  const [selectedTurma, setSelectedTurma] = useState(initialTurma);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);

  // Sync selectedTurma with query param when it changes
  useEffect(() => {
    const tid = searchParams.get("turmaId");
    if (tid) setSelectedTurma(tid);
  }, [searchParams]);

  useEffect(() => {
    async function fetchData() {
      const turmasSnap = await getDocs(collection(db, "turmas"));
      setTurmas(turmasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turma)));
      
      const usersSnap = await getDocs(collection(db, "usuarios"));
      const usersData: Record<string, string> = {};
      usersSnap.docs.forEach(doc => {
        usersData[doc.id] = (doc.data() as any).nome;
      });
      setUsuarios(usersData);
    }
    fetchData();
  }, []);

  const deleteAluno = async (id: string) => {
    if (confirm("Deseja realmente excluir este aluno?")) {
      try {
        await deleteDoc(doc(db, "alunos", id));
        setAlunos(alunos.filter(a => a.id !== id));
        setSelectedAluno(null);
      } catch (error) {
        console.error("Erro ao excluir aluno:", error);
      }
    }
  };

  useEffect(() => {
    async function fetchAlunos() {
      setLoading(true);
      try {
        let q;
        if (selectedTurma) {
          q = query(collection(db, "alunos"), where("turmaId", "==", selectedTurma), orderBy("nomeCompleto", "asc"));
        } else {
          q = query(collection(db, "alunos"), orderBy("nomeCompleto", "asc"));
        }
        
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aluno));
        setAlunos(data);
      } catch (error) {
        console.error("Erro ao buscar alunos:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAlunos();
  }, [selectedTurma]);

  const filteredAlunos = alunos.filter(a => 
    a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || 
    a.ra.includes(search)
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 p-8 flex flex-col">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Carômetro</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Visualização rápida dos estudantes</p>
          </div>

          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select
              value={selectedTurma}
              onChange={(e) => setSelectedTurma(e.target.value)}
              className="bg-white border border-gray-100 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-700 focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
            >
              <option value="">Todas as Turmas</option>
              {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>

            <div className="relative flex-1 md:flex-none md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="BUSCAR NOME OU RA..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-100 pl-11 pr-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-purple-100 transition-all"
              />
            </div>
          </div>
        </header>

        <div className="flex-1">
          {loading ? (
             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
               {[1,2,3,4,5,6].map(i => (
                 <div key={i} className="aspect-[3/4] bg-white rounded-3xl animate-pulse"></div>
               ))}
             </div>
          ) : filteredAlunos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {filteredAlunos.map(aluno => (
                <div 
                  key={aluno.id}
                  onClick={() => setSelectedAluno(aluno)}
                  className="group cursor-pointer bg-white rounded-[32px] overflow-hidden border border-gray-100 hover:shadow-2xl hover:-translate-y-2 transition-all relative"
                >
                  <div className="aspect-[3/4] relative">
                    {aluno.fotoUrl ? (
                      <Image 
                        src={aluno.fotoUrl} 
                        alt={aluno.nomeCompleto} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-200">
                        <User className="w-12 h-12" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="absolute bottom-0 left-0 right-0 p-4 transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <div className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl">
                        <p className="text-[10px] font-black text-gray-900 uppercase truncate leading-none mb-1">{aluno.nomeCompleto}</p>
                        <p className="text-[8px] font-bold text-purple-600 uppercase tracking-widest truncate">RA {aluno.ra}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-[32px] flex items-center justify-center text-gray-300 mb-4">
                <Search className="w-8 h-8" />
              </div>
              <p className="text-gray-900 font-black uppercase text-xl tracking-tighter">Nenhum aluno encontrado</p>
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-2">Tente ajustar seu filtro de busca</p>
            </div>
          )}
        </div>
      </main>

      {/* Aluno Detail Modal */}
      <AnimatePresence>
        {selectedAluno && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-4xl rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col md:flex-row max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedAluno(null)}
                className="absolute top-6 right-6 p-3 bg-white/80 backdrop-blur-md rounded-2xl text-gray-900 hover:bg-purple-600 hover:text-white transition-all z-10 shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-full md:w-5/12 aspect-square md:aspect-auto relative bg-gray-50">
                {selectedAluno.fotoUrl ? (
                  <Image src={selectedAluno.fotoUrl} alt={selectedAluno.nomeCompleto} fill className="object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-100">
                    <User className="w-32 h-32" />
                  </div>
                )}
              </div>

              <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
                <header className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      RA {selectedAluno.ra}
                    </div>
                    <div className="px-4 py-2 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest">
                      #{selectedAluno.numeroChamada || '--'}
                    </div>
                  </div>
                  <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-3">{selectedAluno.nomeCompleto}</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estudante Ativo</p>
                  </div>
                </header>

                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Turma</h4>
                    <p className="text-gray-900 font-black tracking-tight uppercase">{turmas.find(t => t.id === selectedAluno.turmaId)?.nome || "..."}</p>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Segmento</h4>
                    <p className="text-gray-900 font-black tracking-tight uppercase">Ensino Médio</p>
                  </div>
                </div>

                <div className="mb-10 p-6 bg-amber-50/50 rounded-[32px] border border-amber-100/50">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-2">Tutor Responsável</h4>
                  <p className="text-gray-900 font-black text-lg uppercase tracking-tight">
                    {(selectedAluno as any).tutorId ? (usuarios[(selectedAluno as any).tutorId] || 'Carregando...') : 'Não informado'}
                  </p>
                </div>

                <div className="mt-auto flex gap-4 pt-10 border-t border-gray-100">
                  <button 
                    onClick={() => router.push(`/alunos/${selectedAluno.id}/editar`)}
                    className="flex-1 flex items-center justify-center gap-3 bg-purple-600 text-white h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100"
                  >
                    <Edit2 className="w-4 h-4" />
                    Editar Ficha
                  </button>
                  <button 
                    onClick={() => deleteAluno(selectedAluno.id)}
                    className="w-16 h-16 flex items-center justify-center bg-red-50 text-red-500 rounded-3xl hover:bg-red-500 hover:text-white transition-all group shadow-sm"
                  >
                    <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CarometroPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Carregando...</div>}>
        <CarometroContent />
      </Suspense>
    </ProtectedRoute>
  );
}
