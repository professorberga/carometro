'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';

interface Turma {
  id: string;
  nome: string;
  serie: string;
  periodo: string;
  anoLetivo: number;
}

export default function TurmasPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    serie: '1º EM',
    periodo: 'Manhã',
    anoLetivo: new Date().getFullYear()
  });

  useEffect(() => {
    const q = query(collection(db, 'turmas'), orderBy('nome'));
    const unsubscribe = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Turma));
      setTurmas(data);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = editingTurma ? `turmas/${editingTurma.id}` : 'turmas';
    try {
      if (editingTurma) {
        await updateDoc(doc(db, 'turmas', editingTurma.id), {
          ...formData,
          atualizadoEm: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'turmas'), {
          ...formData,
          criadoEm: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingTurma(null);
      setFormData({ nome: '', serie: '1º EM', periodo: 'Manhã', anoLetivo: new Date().getFullYear() });
    } catch (error) {
      handleFirestoreError(error, editingTurma ? 'update' : 'create', path);
    }
  };

  const handleEdit = (turma: Turma) => {
    setEditingTurma(turma);
    setFormData({
      nome: turma.nome,
      serie: turma.serie,
      periodo: turma.periodo,
      anoLetivo: turma.anoLetivo
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const path = `turmas/${id}`;
    if (confirm('Tem certeza que deseja excluir esta turma?')) {
      try {
        await deleteDoc(doc(db, 'turmas', id));
      } catch (error) {
        handleFirestoreError(error, 'delete', path);
      }
    }
  };

  return (
    <ProtectedRoute requiredRole="gestor">
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Minhas Turmas</h1>
              <p className="text-gray-500 font-medium">Gestão e organização das classes</p>
            </div>
            <button
              onClick={() => {
                setEditingTurma(null);
                setFormData({ nome: '', serie: '1º EM', periodo: 'Manhã', anoLetivo: new Date().getFullYear() });
                setIsModalOpen(true);
              }}
              className="flex items-center px-6 py-3 bg-purple-600 text-white rounded-2xl hover:bg-purple-700 transition-all font-black uppercase text-xs tracking-widest shadow-xl shadow-purple-100"
            >
              <Plus className="w-5 h-5 mr-3" />
              Cadastrar Turma
            </button>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {turmas.map((turma) => (
              <motion.div
                key={turma.id}
                layoutId={turma.id}
                className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl font-black text-sm w-10 h-10 flex items-center justify-center">
                    {turma.periodo.charAt(0)}
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(turma)} className="p-2 text-gray-400 hover:text-purple-600">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(turma.id)} className="p-2 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-1">{turma.nome}</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{turma.serie}</p>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter",
                    turma.periodo === 'Manhã' ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                  )}>
                    {turma.periodo}
                  </span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{turma.anoLetivo}</span>
                </div>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {isModalOpen && (
              <div className="fixed inset-0 flex items-end md:items-center justify-center p-0 md:p-6 z-[100]">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsModalOpen(false)}
                  className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                />
                <motion.div
                  initial={{ y: 500, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 500, opacity: 0 }}
                  className="relative bg-white w-full md:max-w-md rounded-t-[40px] md:rounded-[40px] p-8 md:p-10 shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">
                      {editingTurma ? 'Editar Registro' : 'Nova Turma'}
                    </h2>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-400">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome da Turma</label>
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        placeholder="Ex: 2º B"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all font-bold text-gray-900"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Série</label>
                        <select
                          value={formData.serie}
                          onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all font-bold text-gray-900"
                        >
                          {['1º EM', '2º EM', '3º EM', '6º EF', '7º EF', '8º EF', '9º EF'].map(s => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Período</label>
                        <select
                          value={formData.periodo}
                          onChange={(e) => setFormData({ ...formData, periodo: e.target.value })}
                          className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all font-bold text-gray-900"
                        >
                          <option>Manhã</option>
                          <option>Tarde</option>
                          <option>Integral</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Ano Letivo</label>
                      <input
                        type="number"
                        required
                        value={formData.anoLetivo}
                        onChange={(e) => setFormData({ ...formData, anoLetivo: parseInt(e.target.value) })}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all font-bold text-gray-900"
                      />
                    </div>

                    <div className="pt-4">
                      <button
                        type="submit"
                        className="w-full py-5 bg-purple-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 flex items-center justify-center"
                      >
                        <Check className="w-5 h-5 mr-3" />
                        {editingTurma ? 'Salvar Alterações' : 'Criar Turma'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}


function handleFirestoreError(error: unknown, operationType: string, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  alert(`Erro (${operationType}): ${errInfo.error}. Verifique suas permissões.`);
  throw new Error(JSON.stringify(errInfo));
}
