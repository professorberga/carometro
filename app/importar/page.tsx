"use client";

import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { FileUp, Upload, HelpCircle } from "lucide-react";
import { useState } from "react";

export default function ImportarPage() {
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <header className="mb-12">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Importar Planilha</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Carga em lote de alunos e turmas</p>
          </header>

          <div className="max-w-3xl bg-white border border-gray-100 rounded-[48px] p-12 shadow-sm">
            <div className="border-4 border-dashed border-gray-50 rounded-[40px] p-12 flex flex-col items-center justify-center text-center group hover:border-purple-100 transition-all cursor-pointer relative">
              <input 
                type="file" 
                onChange={handleFileChange} 
                className="absolute inset-0 opacity-0 cursor-pointer"
                accept=".csv,.xlsx"
              />
              <div className="w-20 h-20 bg-gray-50 rounded-[32px] flex items-center justify-center mb-6 group-hover:bg-purple-100 group-hover:text-purple-600 transition-all">
                <FileUp className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">
                {file ? file.name : "Arraste sua planilha aqui"}
              </h3>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] max-w-xs mx-auto">
                {file ? "Clique em processar para continuar" : "Ou clique para selecionar um arquivo do seu computador"}
              </p>
            </div>

            <div className="mt-12 flex gap-4">
               <button className="flex-1 bg-purple-600 text-white h-16 rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-30" disabled={!file}>
                 Processar Arquivo
               </button>
               <button className="h-16 px-8 bg-gray-50 text-gray-400 rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
                 <HelpCircle className="w-4 h-4" />
                 Template
               </button>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
