'use client';

import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { collection, doc, getDoc, getDocs, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { User, Camera, Upload, CheckCircle2, ChevronLeft, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function EditarAlunoPage() {
  const router = useRouter();
  const { id } = useParams();
  const [turmas, setTurmas] = useState<{id: string, nome: string}[]>([]);
  const [tutores, setTutores] = useState<{id: string, nome: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    ra: '',
    numeroChamada: '',
    turmaId: '',
    tutorId: '',
    dataNascimento: '',
    dataMatricula: '',
    clubeJuvenil: '',
    clubeJuvenil2: '',
    eletiva: '',
    eletiva2: '',
    observacoes: '',
    fotoUrl: '',
    fotoPath: ''
  });

  useEffect(() => {
    async function fetchData() {
      if (!id) return;
      try {
        // Fetch Turmas
        const tSnap = await getDocs(query(collection(db, 'turmas'), orderBy('nome')));
        setTurmas(tSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));

        // Fetch Tutores (Usuarios)
        const uSnap = await getDocs(query(collection(db, 'usuarios'), orderBy('nome')));
        setTutores(uSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));

        // Fetch Aluno
        const snap = await getDoc(doc(db, 'alunos', id as string));
        if (snap.exists()) {
          const data = snap.data();
          setFormData({
            ...formData,
            ...data,
            tutorId: data.tutorId || ''
          } as any);
          if (data.fotoUrl) setPreviewUrl(data.fotoUrl);
        } else {
          router.push('/carometro');
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("A imagem é muito grande. O limite é de 10MB.");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      let fotoUrl = formData.fotoUrl;
      let fotoPath = formData.fotoPath;

      if (file) {
        // Delete old photo if exists
        if (formData.fotoPath) {
          try {
            await deleteObject(ref(storage, formData.fotoPath));
          } catch (err) {
            console.warn("Could not delete old photo:", err);
          }
        }

        const path = `fotos/alunos/${Date.now()}_${file.name}`;
        const storageRef = ref(storage, path);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              fotoUrl = await getDownloadURL(uploadTask.snapshot.ref);
              fotoPath = path;
              resolve(true);
            }
          );
        });
      }

      await updateDoc(doc(db, 'alunos', id as string), {
        ...formData,
        numeroChamada: formData.numeroChamada ? Number(formData.numeroChamada) : null,
        fotoUrl,
        fotoPath,
        atualizadoEm: serverTimestamp()
      });

      router.push('/carometro');
    } catch (error) {
      handleFirestoreError(error, 'update', `alunos/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      if (formData.fotoPath) {
        try {
          await deleteObject(ref(storage, formData.fotoPath));
        } catch (err) {
          console.warn("Could not delete photo on student deletion:", err);
        }
      }
      await deleteDoc(doc(db, 'alunos', id as string));
      router.push('/carometro');
    } catch (error) {
      handleFirestoreError(error, 'delete', `alunos/${id}`);
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredRole="gestor">
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl flex justify-between items-center mb-8">
            <div>
              <Link href="/carometro" className="flex items-center text-gray-500 hover:text-purple-600 mb-2 transition-colors">
                <ChevronLeft className="w-5 h-5 mr-1" />
                Voltar
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">Editar Aluno</h1>
            </div>
            <button 
              onClick={() => setIsDeleteModalOpen(true)}
              className="flex items-center px-4 py-2 text-red-600 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-all font-medium"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              Excluir Aluno
            </button>
          </div>

          <form onSubmit={handleSave} className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Foto Upload */}
            <div className="md:col-span-1">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
                <label className="block text-sm font-bold text-gray-700 mb-4 w-full">Foto do Aluno</label>
                <div className="relative group cursor-pointer w-full aspect-[3/4] bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-purple-500 transition-all">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera className="w-12 h-12 mb-2" />
                      <span className="text-xs font-medium">Trocar foto</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="text-white w-8 h-8" />
                  </div>
                </div>
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full mt-4 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
                <p className="mt-4 text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
                  Formatos aceitos: JPG, PNG. Máx 10MB.
                </p>
              </div>
            </div>

            {/* Dados Formulário */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={formData.nomeCompleto}
                    onChange={(e) => setFormData({ ...formData, nomeCompleto: e.target.value })}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">RA (Registro do Aluno) - <span className="text-gray-400">Não editável</span></label>
                    <input
                      type="text"
                      disabled
                      value={formData.ra}
                      className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Nº Chamada (Opcional)</label>
                    <input
                      type="number"
                      value={formData.numeroChamada}
                      onChange={(e) => setFormData({ ...formData, numeroChamada: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ex: 1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Turma</label>
                    <select
                      required
                      value={formData.turmaId}
                      onChange={(e) => setFormData({ ...formData, turmaId: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Selecione...</option>
                      {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Tutor (Opcional)</label>
                    <select
                      value={formData.tutorId}
                      onChange={(e) => setFormData({ ...formData, tutorId: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Selecione um tutor...</option>
                      {tutores.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Clube Juvenil 1º sem.</label>
                    <input
                      type="text"
                      value={formData.clubeJuvenil}
                      onChange={(e) => setFormData({ ...formData, clubeJuvenil: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Clube Juvenil 2º sem.</label>
                    <input
                      type="text"
                      value={formData.clubeJuvenil2}
                      onChange={(e) => setFormData({ ...formData, clubeJuvenil2: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Eletiva 1º sem.</label>
                    <input
                      type="text"
                      value={formData.eletiva}
                      onChange={(e) => setFormData({ ...formData, eletiva: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Eletiva 2º sem.</label>
                    <input
                      type="text"
                      value={formData.eletiva2}
                      onChange={(e) => setFormData({ ...formData, eletiva2: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                    rows={4}
                    className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div className="pt-4 flex gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/carometro')}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className={cn(
                      "flex-1 py-3 bg-purple-600 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center",
                      saving ? "opacity-70" : "hover:bg-purple-700 hover:shadow-purple-200"
                    )}
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CheckCircle2 className="w-5 h-5 mr-2" /> Salvar Alterações</>}
                  </button>
                </div>
              </div>
            </div>
          </form>

          {/* Delete Confirm Modal */}
          <AnimatePresence>
            {isDeleteModalOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl text-center"
                >
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Excluir Aluno?</h2>
                  <p className="text-gray-500 mb-8 text-sm">Esta ação é irreversível e apagará todos os dados, inclusive a foto.</p>
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setIsDeleteModalOpen(false)}
                      className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                    >
                      Não, manter
                    </button>
                    <button 
                      onClick={handleDelete}
                      disabled={saving}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                    >
                      Sim, excluir
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </ProtectedRoute>
  );
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      className={cn("animate-spin", className)} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
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
