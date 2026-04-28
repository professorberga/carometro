'use client';

import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { User, Camera, Upload, CheckCircle2, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function NovoAlunoPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<{id: string, nome: string}[]>([]);
  const [tutores, setTutores] = useState<{id: string, nome: string}[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    nomeCompleto: '',
    ra: '',
    numeroChamada: '',
    turmaId: '',
    tutorId: '',
    dataNascimento: '',
    dataMatricula: new Date().toISOString().split('T')[0],
    clubeJuvenil: '',
    clubeJuvenil2: '',
    eletiva: '',
    eletiva2: '',
    observacoes: ''
  });

  useEffect(() => {
    async function fetchData() {
      const turmasSnap = await getDocs(query(collection(db, 'turmas'), orderBy('nome')));
      const turmasData = turmasSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
      setTurmas(turmasData);
      if (turmasData.length > 0) setFormData(prev => ({ ...prev, turmaId: turmasData[0].id }));

      const usersSnap = await getDocs(query(collection(db, 'usuarios'), orderBy('nome')));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
      setTutores(usersData);
    }
    fetchData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let fotoUrl = '';
      let fotoPath = '';

      if (file) {
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

      await addDoc(collection(db, 'alunos'), {
        ...formData,
        numeroChamada: formData.numeroChamada ? Number(formData.numeroChamada) : null,
        fotoUrl,
        fotoPath,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp()
      });

      router.push('/carometro');
    } catch (error) {
      handleFirestoreError(error, 'create', 'alunos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="gestor">
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <Link href="/carometro" className="flex items-center text-gray-500 hover:text-purple-600 mb-6 transition-colors">
            <ChevronLeft className="w-5 h-5 mr-1" />
            Voltar ao Carômetro
          </Link>

          <header className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Novo Aluno</h1>
            <p className="text-gray-500">Cadastre um novo aluno no sistema</p>
          </header>

          <form onSubmit={handleSubmit} className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8">
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
                      <span className="text-xs font-medium">Clique para selecionar</span>
                    </div>
                  )}
                  {previewUrl && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="text-white w-8 h-8" />
                    </div>
                  )}
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
                    placeholder="João da Silva"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">RA</label>
                    <input
                      type="text"
                      required
                      value={formData.ra}
                      onChange={(e) => setFormData({ ...formData, ra: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="000.123.456-SP"
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
                </div>

                <div className="grid grid-cols-1 gap-4">
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
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data de Nascimento</label>
                    <input
                      type="date"
                      required
                      value={formData.dataNascimento}
                      onChange={(e) => setFormData({ ...formData, dataNascimento: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Data de Matrícula</label>
                    <input
                      type="date"
                      value={formData.dataMatricula}
                      onChange={(e) => setFormData({ ...formData, dataMatricula: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Clube Juvenil 1º sem. (Opcional)</label>
                    <input
                      type="text"
                      value={formData.clubeJuvenil}
                      onChange={(e) => setFormData({ ...formData, clubeJuvenil: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ex: Robótica"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Clube Juvenil 2º sem. (Opcional)</label>
                    <input
                      type="text"
                      value={formData.clubeJuvenil2}
                      onChange={(e) => setFormData({ ...formData, clubeJuvenil2: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ex: Teatro"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Eletiva 1º sem. (Opcional)</label>
                    <input
                      type="text"
                      value={formData.eletiva}
                      onChange={(e) => setFormData({ ...formData, eletiva: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ex: Empreendedorismo"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Eletiva 2º sem. (Opcional)</label>
                    <input
                      type="text"
                      value={formData.eletiva2}
                      onChange={(e) => setFormData({ ...formData, eletiva2: e.target.value })}
                      className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Ex: Cinema"
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
                    placeholder="Informações relevantes sobre o aluno..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className={cn(
                      "w-full py-4 bg-purple-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-purple-200 flex items-center justify-center",
                      loading ? "opacity-70 cursor-not-allowed" : "hover:bg-purple-700"
                    )}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 mr-2" />
                        Finalizar Cadastro
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </main>
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
