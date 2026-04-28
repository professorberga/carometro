'use client';

import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { FileUp, Download, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { cn } from '@/lib/utils';

interface Turma {
  id: string;
  nome: string;
}

export default function ImportarPage() {
  const router = useRouter();
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [selectedTurma, setSelectedTurma] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'importing' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchTurmas() {
      const snap = await getDocs(query(collection(db, 'turmas'), orderBy('nome')));
      const data = snap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome }));
      setTurmas(data);
      if (data.length > 0) setSelectedTurma(data[0].id);
    }
    fetchTurmas();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonData = XLSX.utils.sheet_to_json(ws);

        // Basic validation of columns
        if (jsonData.length > 0) {
          const first = jsonData[0] as any;
          // We check for our new friendly headers
          const required = ['nome', 'RA'];
          const missing = required.filter(key => !(key in first));
          
          if (missing.length > 0) {
            setStatus('error');
            setErrorMsg(`Planilha inválida. Colunas obrigatórias faltando: ${missing.join(', ')}. Use o modelo disponibilizado.`);
            return;
          }
        }

        setData(jsonData);
        setStatus('ready');
      } catch (err) {
        setStatus('error');
        setErrorMsg('Erro ao ler a planilha. Certifique-se de que é um arquivo .xlsx ou .csv válido.');
      }
    };

    reader.readAsBinaryString(file);
  };

  const parseDate = (dateStr: any): string => {
    if (!dateStr) return '';
    // If it's already a number (Excel date), XLSX usually handles it, but let's be safe
    if (typeof dateStr === 'number') {
      const date = new Date((dateStr - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    
    const s = String(dateStr).trim();
    // Check for DD/MM/AAAA
    const ddmmyyyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const match = s.match(ddmmyyyy);
    if (match) {
      const [_ , d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return s; // Fallback to raw string
  };

  const handleImport = async () => {
    if (!selectedTurma || data.length === 0) return;

    setStatus('importing');
    setLoading(true);

    try {
      // Mapping from Spreadsheet headers to Firestore fields
      // nº, nome, RA, aniversário, clube, clube 2, eletiva, eletiva 2, observações
      const batchSize = 500;
      for (let i = 0; i < data.length; i += batchSize) {
        const chunk = data.slice(i, i + batchSize);
        const batch = writeBatch(db);

        chunk.forEach((item) => {
          const docRef = doc(collection(db, 'alunos'));
          batch.set(docRef, {
            nomeCompleto: item['nome'] || '',
            ra: String(item['RA'] || ''),
            numeroChamada: item['nº'] ? Number(item['nº']) : null,
            turmaId: selectedTurma,
            dataNascimento: parseDate(item['aniversário (DD/MM/AAAA)']),
            clubeJuvenil: item['clube'] || '',
            clubeJuvenil2: item['clube 2'] || '',
            eletiva: item['eletiva'] || '',
            eletiva2: item['eletiva 2'] || '',
            observacoes: item['observações'] || '',
            criadoEm: serverTimestamp(),
            atualizadoEm: serverTimestamp()
          });
        });

        await batch.commit();
      }

      setStatus('success');
      setTimeout(() => router.push('/carometro'), 2000);
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      // If it's a common permission error, use the helper, else generic message
      if (err.message?.includes('permissions')) {
        handleFirestoreError(err, 'write', 'alunos (batch)');
      } else {
        setErrorMsg('Erro ao importar dados para o Firestore. Verifique conexão e permissões.');
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadModelo = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        'nº': 1,
        'nome': 'João da Silva', 
        'RA': '123456', 
        'aniversário (DD/MM/AAAA)': '20/05/2010', 
        'clube': 'Debates', 
        'clube 2': 'Teatro',
        'eletiva': 'Robótica', 
        'eletiva 2': 'Cinema',
        'observações': 'Aluno destaque' 
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_importacao_alunos.xlsx");
  };

  return (
    <ProtectedRoute requiredRole="gestor">
      <div className="flex h-screen bg-gray-50 flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8">
          <header className="mb-10 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Importação em Lote</h1>
              <p className="text-gray-500">Adicione múltiplos alunos de uma vez via planilha</p>
            </div>
            <button 
              onClick={downloadModelo}
              className="flex items-center px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-600 font-medium transition-all"
            >
              <Download className="w-5 h-5 mr-2" />
              Baixar Modelo
            </button>
          </header>

          <div className="max-w-4xl space-y-8">
            {/* Step 1: Seleção de Turma */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                Selecione a Turma de Destino
              </h2>
              <select
                value={selectedTurma}
                onChange={(e) => setSelectedTurma(e.target.value)}
                className="w-full sm:w-64 p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Selecione...</option>
                {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>

            {/* Step 2: Upload */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Faça o Upload da Planilha
              </h2>
              
              <div className={cn(
                "relative border-2 border-dashed rounded-2xl p-12 text-center transition-all",
                status === 'ready' ? "border-green-300 bg-green-50" : "border-gray-200 hover:border-purple-300 bg-gray-50"
              )}>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <FileUp className={cn("w-12 h-12 mx-auto mb-4", status === 'ready' ? "text-green-500" : "text-gray-400")} />
                {status === 'ready' ? (
                  <div>
                    <p className="font-bold text-green-700">{data.length} alunos identificados</p>
                    <p className="text-sm text-green-600">Arquivo pronto para importação</p>
                  </div>
                ) : status === 'parsing' ? (
                  <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                    <p className="text-sm text-gray-500">Processando arquivo...</p>
                  </div>
                ) : (
                  <div>
                    <p className="font-bold text-gray-700">Arraste ou clique para selecionar</p>
                    <p className="text-sm text-gray-400">Arquivos suportados: .xlsx, .csv</p>
                  </div>
                )}
              </div>

              {status === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center text-red-700">
                  <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
                  <p className="text-sm">{errorMsg}</p>
                  <button onClick={() => setStatus('idle')} className="ml-auto">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Step 3: Finalizar */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={status !== 'ready' || loading}
                className={cn(
                  "px-8 py-3 bg-purple-600 text-white rounded-xl font-bold transition-all shadow-lg flex items-center",
                  (status !== 'ready' || loading) ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-700 hover:shadow-purple-200"
                )}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : status === 'success' ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Sucesso!
                  </>
                ) : (
                  'Iniciar Importação'
                )}
              </button>
            </div>
          </div>
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
