'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, BookOpen, CameraOff, AlertCircle, Plus, FileUp, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalTurmas: 0,
    totalAlunos: 0,
    semFoto: 0,
    semEletiva: 0,
    periodos: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const turmasSnap = await getDocs(collection(db, 'turmas'));
        const alunosSnap = await getDocs(collection(db, 'alunos'));
        
        const alunos = alunosSnap.docs.map(doc => doc.data());
        
        const periodoCounts: Record<string, number> = {};
        turmasSnap.docs.forEach(doc => {
          const p = doc.data().periodo;
          periodoCounts[p] = (periodoCounts[p] || 0) + 1;
        });

        const periodosData = Object.entries(periodoCounts).map(([name, value]) => ({ name, value }));

        setStats({
          totalTurmas: turmasSnap.size,
          totalAlunos: alunosSnap.size,
          semFoto: alunos.filter(a => !a.fotoUrl).length,
          semEletiva: alunos.filter(a => !a.eletiva).length,
          periodos: periodosData
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];

  const cards = [
    { name: 'Turmas Ativas', value: stats.totalTurmas, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Total de Alunos', value: stats.totalAlunos, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { name: 'Sem Foto', value: stats.semFoto, icon: CameraOff, color: 'text-red-600', bg: 'bg-red-50' },
    { name: 'Sem Eletiva', value: stats.semEletiva, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <ProtectedRoute requiredRole="gestor">
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">Painel de Controle</h1>
            <p className="text-gray-500 font-medium tracking-tight">Gestão centralizada do Carômetro Escolar</p>
          </header>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-[32px]"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-12">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((card, idx) => (
                  <motion.div
                    key={card.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between"
                  >
                    <div className={`${card.bg} ${card.color} p-3 rounded-2xl w-fit mb-4`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.name}</p>
                      <p className="text-3xl font-black text-gray-900 tracking-tighter">{card.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                  <header className="flex justify-between items-center mb-8">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Turmas por Período</h3>
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                  </header>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.periodos}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {stats.periodos.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap justify-center gap-6 mt-6">
                    {stats.periodos.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-2">Ações Rápidas</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link href="/alunos/novo" className="flex flex-col p-6 bg-white rounded-[32px] border-2 border-dashed border-gray-200 hover:border-purple-600 hover:bg-purple-50 transition-all group overflow-hidden relative">
                      <Plus className="w-12 h-12 text-gray-100 absolute -right-2 -top-2 rotate-12 group-hover:text-purple-100 transition-colors" />
                      <div className="p-3 bg-purple-100 rounded-2xl w-fit mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Plus className="w-5 h-5" />
                      </div>
                      <p className="font-black text-gray-900 tracking-tight">Novo Aluno</p>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Cadastro Direto</p>
                    </Link>

                    <Link href="/importar" className="flex flex-col p-6 bg-white rounded-[32px] border-2 border-dashed border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all group overflow-hidden relative">
                      <FileUp className="w-12 h-12 text-gray-100 absolute -right-2 -top-2 rotate-12 group-hover:text-blue-100 transition-colors" />
                      <div className="p-3 bg-blue-100 rounded-2xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <FileUp className="w-5 h-5" />
                      </div>
                      <p className="font-black text-gray-900 tracking-tight">Importação</p>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Excel ou CSV</p>
                    </Link>
                    
                    <Link href="/turmas" className="flex flex-col p-6 bg-white rounded-[32px] border-2 border-dashed border-gray-200 hover:border-green-600 hover:bg-green-50 transition-all group overflow-hidden relative sm:col-span-2">
                      <BookOpen className="w-12 h-12 text-gray-100 absolute -right-2 -top-2 rotate-12 group-hover:text-green-100 transition-colors" />
                      <div className="p-3 bg-green-100 rounded-2xl w-fit mb-4 group-hover:bg-green-600 group-hover:text-white transition-colors">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <p className="font-black text-gray-900 tracking-tight">Gerenciar Turmas</p>
                      <p className="text-xs text-gray-500 uppercase font-bold tracking-tighter">Organize suas classes</p>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}

