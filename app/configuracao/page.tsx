'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc, writeBatch, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Settings, User, Bell, Shield, LogOut, Save, Check, Loader2, UserPlus, Upload, Trash2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import * as XLSX from 'xlsx';

export default function ConfiguracaoPage() {
  const { user, profile, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cargo: ''
  });

  // User Management State
  const [newUser, setNewUser] = useState({ nome: '', email: '', role: 'professor' as 'professor' | 'gestor' });
  const [userList, setUserList] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importStatus, setImportStatus] = useState({ total: 0, current: 0, active: false });

  const [prevProfile, setPrevProfile] = useState(profile);

  useEffect(() => {
    let active = true;
    if (profile?.role !== 'gestor') return;

    const loadUsers = async () => {
      setUserLoading(true);
      try {
        const snap = await getDocs(collection(db, 'usuarios'));
        if (!active) return;
        const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        users.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
        setUserList(users);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setUserLoading(false);
      }
    };

    loadUsers();
    return () => { active = false; };
  }, [profile]);

  // Keep a separate handle for manual refreshing if needed, but the effect handles initial load
  const fetchUsers = async () => {
    setUserLoading(true);
    try {
      const snap = await getDocs(collection(db, 'usuarios'));
      const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      users.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
      setUserList(users);
    } catch (err) {
      console.error(err);
    } finally {
      setUserLoading(false);
    }
  };

  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setFormData({
      nome: profile?.nome || '',
      email: profile?.email || '',
      cargo: profile?.cargo || ''
    });
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setSuccess(false);
    try {
      await updateDoc(doc(db, 'usuarios', user.uid), {
        nome: formData.nome,
        cargo: formData.cargo,
        atualizadoEm: new Date()
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error);
      alert("Erro ao salvar alterações.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.nome) return;
    
    setLoading(true);
    try {
      const q = query(collection(db, 'usuarios'), where('email', '==', newUser.email.trim().toLowerCase()));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        alert("Este e-mail já está cadastrado.");
        return;
      }

      await addDoc(collection(db, 'usuarios'), {
        nome: newUser.nome.trim(),
        email: newUser.email.trim().toLowerCase(),
        role: newUser.role,
        criadoEm: serverTimestamp(),
        importado: true
      });
      
      setNewUser({ nome: '', email: '', role: 'professor' });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar usuário.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportLoading(true);
    setImportStatus({ total: 0, current: 0, active: true });

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      console.log('Dados extraídos da planilha:', jsonData);

      if (jsonData.length === 0) {
        alert("A planilha parece estar vazia.");
        setImportLoading(false);
        setImportStatus(prev => ({ ...prev, active: false }));
        return;
      }

      setImportStatus(prev => ({ ...prev, total: jsonData.length }));

      const existingEmails = new Set(userList.map(u => (String(u.email || "")).toLowerCase()));
      let totalAdded = 0;
      let totalSkipped = 0;
      let totalInvalid = 0;

      const batchSize = 25;
      for (let i = 0; i < jsonData.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = jsonData.slice(i, i + batchSize);
        let addedInBatch = 0;

        for (const row of chunk) {
          // Robust header mapping
          const nomeRaw = row.nome || row.Nome || row.NOME || row['Nome Completo'] || row['NOME COMPLETO'] || row['Usuario'] || row['Usuário'] || row['USUARIO'];
          const emailRaw = row.email || row.Email || row.EMAIL || row['E-mail'] || row['E-MAIL'] || row['login'] || row['Login'] || row['LOGIN'];
          
          const nome = String(nomeRaw || "").trim();
          const email = String(emailRaw || "").trim().toLowerCase();
          
          const perfilRaw = row.perfil || row.Perfil || row.PERFIL || row.Role || row.role || row.Cargo || row.cargo || row.Função || row.função;
          const perfilStr = String(perfilRaw || 'professor').toLowerCase();
          const role = (perfilStr.includes('gestor') || perfilStr.includes('admin') || perfilStr.includes('coord') || perfilStr.includes('diret')) ? 'gestor' : 'professor';

          if (!nome || !email || !email.includes('@')) {
            totalInvalid++;
            continue;
          }

          if (!existingEmails.has(email)) {
            const docRef = doc(collection(db, 'usuarios'));
            batch.set(docRef, {
              nome,
              email,
              role,
              criadoEm: serverTimestamp(),
              importado: true,
              importadoEm: serverTimestamp()
            });
            existingEmails.add(email);
            addedInBatch++;
            totalAdded++;
          } else {
            console.log('Email já existente:', email);
            totalSkipped++;
          }
        }

        if (addedInBatch > 0) {
          await batch.commit();
        }
        setImportStatus(prev => ({ ...prev, current: Math.min(i + chunk.length, jsonData.length) }));
      }

      alert(`Processamento concluído!\n\n✅ Novos usuários: ${totalAdded}\n⚠️ Ignorados (já existem): ${totalSkipped}\n❌ Inválidos (sem nome/email): ${totalInvalid}`);
      fetchUsers();
    } catch (err) {
      console.error('Erro na importação:', err);
      alert("Erro ao importar planilha. Verifique se o arquivo está no formato correto (.xlsx ou .csv).");
    } finally {
      setImportLoading(false);
      setImportStatus(prev => ({ ...prev, active: false }));
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === user?.email) {
      alert("Você não pode excluir sua própria conta.");
      return;
    }

    if (confirm(`Deseja realmente remover o acesso de ${userEmail}?`)) {
      try {
        await deleteDoc(doc(db, 'usuarios', userId));
        fetchUsers();
      } catch (err) {
        console.error(err);
        alert("Erro ao remover usuário.");
      }
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <header className="mb-10">
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Configurações</h1>
            <p className="text-gray-500 font-medium">Personalize sua experiência no Carômetro</p>
          </header>

          <div className="max-w-4xl space-y-8">
            {/* Perfil Section */}
            <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-8 md:p-10 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <User className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Meu Perfil</h2>
                </div>
              </div>

              <div className="p-8 md:p-10 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-purple-50 mb-4 bg-gray-50 flex items-center justify-center">
                    {user?.photoURL ? (
                      <Image src={user.photoURL} alt="Avatar" fill className="object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-16 h-16 text-gray-200" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{profile?.nome}</p>
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest leading-none mt-1">{profile?.role}</p>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="md:col-span-2 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nome Completo</label>
                      <input
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all font-bold text-gray-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Cargo / Função</label>
                      <input
                        type="text"
                        value={formData.cargo}
                        onChange={(e) => setFormData({...formData, cargo: e.target.value})}
                        placeholder="Ex: Professor de Matemática"
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl focus:ring-4 focus:ring-purple-100 focus:border-purple-600 transition-all font-bold text-gray-900"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">E-mail (Não editável)</label>
                    <input
                      disabled
                      type="email"
                      value={formData.email}
                      className="w-full p-4 bg-gray-100 border border-transparent rounded-3xl font-bold text-gray-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="pt-4 flex items-center gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 sm:flex-none px-8 py-4 bg-purple-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : success ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                      {success ? 'Salvo!' : 'Salvar Alterações'}
                    </button>
                    {success && (
                      <motion.span 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-green-600 font-bold text-xs"
                      >
                        Perfil atualizado com sucesso.
                      </motion.span>
                    )}
                  </div>
                </form>
              </div>
            </section>

            {/* Gestão de Usuários (Apenas Gestor) */}
            {profile?.role === 'gestor' && (
              <section className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 md:p-10 border-b border-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Gestão de Usuários</h2>
                  </div>
                </div>

                <div className="p-8 md:p-10 space-y-10">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Manual Add */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>
                        Cadastro Individual
                      </h3>
                      <form onSubmit={handleAddUser} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <input
                            type="text"
                            placeholder="Nome Completo"
                            value={newUser.nome}
                            onChange={e => setNewUser({...newUser, nome: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl font-bold text-sm"
                            required
                          />
                          <input
                            type="email"
                            placeholder="E-mail de Login"
                            value={newUser.email}
                            onChange={e => setNewUser({...newUser, email: e.target.value})}
                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-3xl font-bold text-sm"
                            required
                          />
                        </div>
                        <div className="flex gap-4">
                          <select
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                            className="flex-1 p-4 bg-gray-50 border border-gray-100 rounded-3xl font-bold text-sm appearance-none"
                          >
                            <option value="professor">Professor</option>
                            <option value="gestor">Gestor</option>
                          </select>
                          <button
                            type="submit"
                            disabled={loading}
                            className="px-8 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                            Cadastrar
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Batch Import */}
                    <div className="space-y-6">
                      <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                        Importar de Planilha
                      </h3>
                      <div className="p-8 border-2 border-dashed border-gray-100 rounded-[32px] flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-all relative">
                        <input
                          type="file"
                          accept=".xlsx, .xls, .csv"
                          onChange={handleFileUpload}
                          disabled={importLoading}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <Upload className="w-10 h-10 text-gray-300 mb-4" />
                        <p className="text-xs font-black text-gray-900 uppercase tracking-widest text-center">Arraste ou clique para importar</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-2">Colunas: Nome, Email, Perfil</p>
                        
                        {importLoading && (
                          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-[32px] flex flex-col items-center justify-center p-6 text-center z-10">
                            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">Processando...</p>
                            <div className="w-full max-w-[200px] h-1.5 bg-gray-100 rounded-full mt-4 overflow-hidden">
                              <div 
                                className="h-full bg-indigo-600 transition-all duration-300" 
                                style={{ width: `${(importStatus.current / importStatus.total) * 100}%` }}
                              ></div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-black mt-2">{importStatus.current}/{importStatus.total}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* List */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Acessos Ativos ({userList.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userList.map(u => (
                        <div key={u.id} className="p-4 bg-gray-50 border border-gray-100 rounded-[28px] flex items-center justify-between group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] uppercase ${u.role === 'gestor' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
                              {u.nome?.charAt(0)}
                            </div>
                            <div className="overflow-hidden">
                              <p className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{u.nome}</p>
                              <p className="text-[9px] text-gray-500 truncate lowercase font-bold tracking-tight">{u.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="p-2 text-gray-200 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {userLoading && <div className="col-span-full py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" /></div>}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm opacity-50">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Notificações</h2>
                </div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest italic">Em breve: Alertas de novos cadastros e atualizações de turma.</p>
              </section>

              <section className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Conta</h2>
                </div>
                <p className="text-gray-500 text-sm font-medium mb-6">Gerencie sua sessão e acessos ao sistema.</p>
                <button 
                  onClick={logout}
                  className="w-full py-4 bg-red-50 text-red-600 rounded-[22px] font-black uppercase text-[10px] tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Encerrar Sessão
                </button>
              </section>
            </div>
          </div>
        </main>
        <MobileNav />
      </div>
    </ProtectedRoute>
  );
}
