'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, where, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Search, Filter, User, X, Edit2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

interface Turma {
  id: string;
  nome: string;
}

interface Aluno {
  id: string;
  nomeCompleto: string;
  ra: string;
  numeroChamada?: number;
  turmaId: string;
  fotoUrl?: string;
  clubeJuvenil?: string;
  clubeJuvenil2?: string;
  eletiva?: string;
  eletiva2?: string;
  tutorId?: string;
  observacoes?: string;
  dataNascimento?: string;
  dataMatricula?: string;
}

export default function CarometroPage() {
  const { profile } = useAuth();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [usuarios, setUsuarios] = useState<Record<string, string>>({});
  const [selectedTurma, setSelectedTurma] = useState<string>('');
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [search, setSearch] = useState('');
  const [selectedAluno, setSelectedAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);

  // Clear search on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && search) {
        setSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [search]);

  // Fetch turmas and usuarios
  useEffect(() => {
    async function fetchData() {
      // Fetch users
      const usersSnap = await getDocs(collection(db, 'usuarios'));
      const usersMap: Record<string, string> = {};
      usersSnap.docs.forEach(doc => {
        usersMap[doc.id] = doc.data().nome;
      });
      setUsuarios(usersMap);

      const snap = await getDocs(query(collection(db, 'turmas'), orderBy('nome')));
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turma));
      setTurmas(data);
      if (data.length > 0) setSelectedTurma(data[0].id);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Fetch alunos based on selected turma OR search
  useEffect(() => {
    let active = true;
    
    async function load() {
      const isSearchActive = search.trim().length > 0;
      
      // If we don't have a search term and no turma is selected, we have nothing to show yet
      // unless we want to default to "All Turmas". Let's default to "All Turmas" if selectedTurma is empty.
      
      setLoading(true);
      try {
        let q;
        if (isSearchActive || !selectedTurma) {
          // If searching or "All Turmas" selected, fetch all students
          q = query(collection(db, 'alunos'));
        } else {
          // Fetch only the selected turma
          q = query(collection(db, 'alunos'), where('turmaId', '==', selectedTurma));
        }

        const snap = await getDocs(q);
        if (!active) return;
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Aluno));
        
        // Sort
        if (isSearchActive || !selectedTurma) {
          // Sort by name for global lists
          data.sort((a, b) => a.nomeCompleto.localeCompare(b.nomeCompleto));
        } else {
          // Sort by number of call for class lists
          data.sort((a, b) => {
            const numA = a.numeroChamada ?? 999;
            const numB = b.numeroChamada ?? 999;
            return numA - numB;
          });
        }

        setAlunos(data);
      } catch (error) {
        console.error("Error fetching alunos:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    
    // Debounce search but not turma selection
    const delay = search.length > 0 ? 500 : 0;
    const timer = setTimeout(() => {
      load();
    }, delay);
    
    return () => { 
      active = false;
      clearTimeout(timer);
    };
  }, [selectedTurma, search]);

  const getTurmaNome = (id: string) => {
    return turmas.find(t => t.id === id)?.nome || 'Turma...';
  };

  const handleDelete = async (aluno: Aluno) => {
    if (confirm(`Tem certeza que deseja excluir o aluno ${aluno.nomeCompleto}?`)) {
      try {
        await deleteDoc(doc(db, 'alunos', aluno.id));
        setSelectedAluno(null);
        // Deselecting and letting the effect re-run if needed, 
        // but it won't re-run unless selectedTurma changes.
        // So we manually refetch or remove from local state.
        setAlunos(prev => prev.filter(a => a.id !== aluno.id));
      } catch (error) {
        console.error("Erro ao deletar aluno:", error);
        alert("Erro ao deletar aluno. Verifique suas permissões.");
      }
    }
  };

  // Handle search and filtering
  const filteredAlunos = search.length > 0 
    ? alunos.filter(a => 
        a.nomeCompleto.toLowerCase().includes(search.toLowerCase()) || a.ra.includes(search)
      )
    : alunos;

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">
          <header className="bg-white border-b border-gray-200 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 shadow-sm md:shadow-none">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-xl md:text-2xl font-black text-gray-900 leading-tight tracking-tighter uppercase">Carômetro</h1>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Acesso às fichas dos alunos</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 md:gap-3 items-center">
              <select
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                className="w-full sm:w-40 md:w-48 p-2.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs focus:ring-4 focus:ring-purple-100 focus:border-purple-600 font-black text-gray-700 transition-all uppercase"
              >
                <option value="">TODAS AS TURMAS</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>

              <div className="relative w-full sm:w-64 group">
                <Search className={cn(
                  "absolute left-4 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 transition-colors duration-300",
                  search ? "text-purple-600" : "text-gray-400"
                )} />
                <input
                  type="text"
                  placeholder="BUSCAR NOME OU RA..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[10px] focus:ring-4 focus:ring-purple-100 focus:border-purple-600 focus:bg-white outline-none transition-all font-black uppercase tracking-widest placeholder:text-gray-300 shadow-sm"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 bg-gray-200 text-gray-500 rounded-full hover:bg-purple-100 hover:text-purple-600 transition-all shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8 animate-pulse">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                  <div key={i} className="aspect-[4/5] bg-gray-100 rounded-[32px]"></div>
                ))}
              </div>
            ) : filteredAlunos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-8">
                {filteredAlunos.map((aluno) => (
                  <motion.div
                    layoutId={`aluno-${aluno.id}`}
                    key={aluno.id}
                    onClick={() => setSelectedAluno(aluno)}
                    className={cn(
                      "group relative bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 transition-all cursor-pointer hover:shadow-2xl hover:-translate-y-1",
                      selectedAluno?.id === aluno.id ? "ring-4 ring-purple-100 border-purple-500" : ""
                    )}
                  >
                    <div className="aspect-[4/5] relative bg-gray-100 overflow-hidden">
                      {aluno.numeroChamada && (
                        <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-sm text-purple-600 w-7 h-7 rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg">
                          {aluno.numeroChamada}
                        </div>
                      )}
                      {aluno.fotoUrl ? (
                         <div className="relative w-full h-full">
                          <Image 
                            src={aluno.fotoUrl} 
                            alt={aluno.nomeCompleto} 
                            fill
                            className="object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500 scale-105 group-hover:scale-110"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-50">
                          <User className="w-16 h-16 text-purple-200" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent flex flex-col justify-end p-4">
                        <p className="text-white text-[10px] font-black uppercase tracking-tight truncate leading-none mb-1">{aluno.nomeCompleto}</p>
                        {(search.length > 0 || !selectedTurma) && (
                          <p className="text-purple-400 text-[8px] font-black tracking-widest truncate opacity-90 uppercase mb-1">
                            {getTurmaNome(aluno.turmaId)}
                          </p>
                        )}
                        <p className="text-purple-300 text-[8px] font-black tracking-widest truncate opacity-80 uppercase">RA: {aluno.ra}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center min-h-[400px] text-gray-400"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-[32px] flex items-center justify-center mb-6 shadow-inner">
                  <Search className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-gray-900 font-black uppercase tracking-tighter text-xl mb-2">Ops! Nada encontrado</h3>
                <p className="font-bold text-gray-400 uppercase tracking-widest text-[9px] max-w-[200px] text-center leading-relaxed">
                  Não encontramos nenhum aluno {search ? `chamado "${search}"` : 'na turma selecionada'}. 
                  Tente outro termo ou turma.
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100"
                  >
                    Limpar Busca
                  </button>
                )}
              </motion.div>
            )}
          </div>
        </main>

        <AnimatePresence>
          {selectedAluno && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 pointer-events-none">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedAluno(null)}
                className="absolute inset-0 bg-gray-900/80 backdrop-blur-md pointer-events-auto"
              />
                <motion.div
                  layoutId={`aluno-${selectedAluno.id}`}
                  initial={{ scale: 0.9, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.9, opacity: 0, y: 50 }}
                  className="relative bg-white w-full h-full md:h-[min(700px,90vh)] md:max-w-5xl md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row pointer-events-auto"
                >
                  <button 
                    onClick={() => setSelectedAluno(null)}
                    className="absolute top-6 right-6 z-[110] bg-white text-gray-900 md:bg-gray-100 md:text-gray-500 p-2 rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                  >
                    <X className="w-6 h-6" />
                  </button>

                  {/* Left Side: Photo (Small on mobile, large on desktop) */}
                  <div className="w-full md:w-5/12 aspect-video md:aspect-auto bg-gray-900 relative">
                    {selectedAluno.fotoUrl ? (
                      <Image 
                        src={selectedAluno.fotoUrl} 
                        alt={selectedAluno.nomeCompleto} 
                        fill 
                        className="object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-700">
                        <User className="w-24 h-24 md:w-32 md:h-32" />
                      </div>
                    )}
                  </div>

                  {/* Right Side: Data */}
                  <div className="flex-1 flex flex-col bg-white overflow-hidden">
                    <div className="flex-1 p-6 md:p-10 overflow-y-auto scrollbar-hide">
                      <header className="mb-8">
                        <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tighter leading-tight mb-4">{selectedAluno.nomeCompleto}</h2>
                        <div className="flex gap-2 md:gap-4 items-center flex-wrap">
                          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">{getTurmaNome(selectedAluno.turmaId)}</span>
                          <span className="px-4 py-2 bg-purple-100 text-purple-700 rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest">Nº {selectedAluno.numeroChamada || '-'}</span>
                          <span className="text-gray-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em]">RA {selectedAluno.ra}</span>
                        </div>
                      </header>

                      <div className="grid grid-cols-2 gap-8 mb-8">
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Aniversário</h4>
                          <p className="text-gray-900 font-black tracking-tight">{selectedAluno.dataNascimento || 'Não informado'}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Matrícula</h4>
                          <p className="text-gray-900 font-black tracking-tight">{selectedAluno.dataMatricula || 'Não informado'}</p>
                        </div>
                      </div>

                      {selectedAluno.tutorId && (
                        <div className="mb-8 p-4 bg-gray-50 rounded-[24px] border border-gray-100">
                          <h4 className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Tutor</h4>
                          <p className="text-gray-900 font-black text-sm uppercase tracking-tight">
                            {usuarios[selectedAluno.tutorId] || 'Não encontrado'}
                          </p>
                        </div>
                      )}

                      <div className="space-y-4 pt-6 border-t border-gray-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-purple-50 rounded-[20px]">
                            <h4 className="text-[8px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2">Clube 01</h4>
                            <p className="text-purple-900 font-black text-xs uppercase truncate tracking-tight">{selectedAluno.clubeJuvenil || '-'}</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-[20px]">
                            <h4 className="text-[8px] font-black text-purple-400 uppercase tracking-[0.2em] mb-2">Clube 02</h4>
                            <p className="text-purple-900 font-black text-xs uppercase truncate tracking-tight">{selectedAluno.clubeJuvenil2 || '-'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-indigo-50 rounded-[20px]">
                            <h4 className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Eletiva 01</h4>
                            <p className="text-indigo-900 font-black text-xs uppercase truncate tracking-tight">{selectedAluno.eletiva || '-'}</p>
                          </div>
                          <div className="p-4 bg-indigo-50 rounded-[20px]">
                            <h4 className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Eletiva 02</h4>
                            <p className="text-indigo-900 font-black text-xs uppercase truncate tracking-tight">{selectedAluno.eletiva2 || '-'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 px-1">Observações</h4>
                        <div className="p-5 bg-gray-50 rounded-[24px] border border-gray-100">
                          <p className="text-gray-700 text-xs font-bold leading-relaxed italic">
                            {selectedAluno.observacoes || 'Nenhuma observação registrada.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {profile?.role === 'gestor' && (
                      <div className="p-8 md:p-10 border-t border-gray-100 flex flex-col sm:flex-row gap-4 bg-gray-50/50">
                        <Link 
                          href={`/alunos/${selectedAluno.id}/editar`}
                          className="flex-1 flex items-center justify-center py-5 bg-purple-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl shadow-purple-100"
                        >
                          <Edit2 className="w-4 h-4 mr-3" />
                          Editar Ficha
                        </Link>
                        <button 
                          onClick={() => handleDelete(selectedAluno)}
                          className="flex items-center justify-center px-10 py-5 bg-red-50 text-red-600 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] hover:bg-red-600 hover:text-white transition-all"
                        >
                          <Trash2 className="w-4 h-4 md:mr-0" />
                          <span className="md:hidden ml-3">Excluir Aluno</span>
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
            </div>
          )}
        </AnimatePresence>

        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}


