"use client";

import React, { useState, useRef, useEffect, use } from "react";
import { Camera, Upload, X, Check, RotateCcw, UserPlus, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, collection, getDocs, query, orderBy } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface CameraCaptureProps {
  onCapture: (base64: string) => void;
  onClose: () => void;
}

function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: "user" } 
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Erro ao acessar câmera:", err);
        setError("Não foi possível acessar a câmera.");
      }
    }
    startCamera();
    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, []);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL("image/jpeg"));
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-[40px] shadow-2xl overflow-hidden w-full max-w-md relative">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Capturar Foto</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"><X className="w-5 h-5" /></button>
        </div>
        <div className="aspect-[3/4] bg-gray-900 relative flex items-center justify-center">
          {!capturedImage ? (
            <>
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
              <button onClick={takePhoto} className="absolute bottom-8 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-white/30 p-1 group transition-all hover:scale-110 active:scale-95">
                <div className="w-full h-full bg-purple-600 rounded-full flex items-center justify-center text-white"><Camera className="w-8 h-8" /></div>
              </button>
            </>
          ) : (
            <>
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4 px-6">
                <button onClick={() => setCapturedImage(null)} className="flex-1 flex items-center justify-center gap-2 bg-white/20 backdrop-blur-md text-white border border-white/30 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-white/30 transition-all"><RotateCcw className="w-4 h-4" />Repetir</button>
                <button onClick={() => { onCapture(capturedImage); onClose(); }} className="flex-1 flex items-center justify-center gap-2 bg-white text-gray-900 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-100 transition-all shadow-xl"><Check className="w-4 h-4 text-purple-600" />Confirmar</button>
              </div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </motion.div>
    </motion.div>
  );
}

export default function EditarAlunoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [photo, setPhoto] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [turmas, setTurmas] = useState<{id: string, nome: string}[]>([]);
  const router = useRouter();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    nomeCompleto: "",
    ra: "",
    numeroChamada: "",
    turmaId: "",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const studentSnap = await getDoc(doc(db, "alunos", id));
        if (studentSnap.exists()) {
          const data = studentSnap.data();
          setFormData({
            nomeCompleto: data.nomeCompleto || "",
            ra: data.ra || "",
            numeroChamada: data.numeroChamada?.toString() || "",
            turmaId: data.turmaId || "",
          });
          setPhoto(data.fotoUrl || null);
        }

        const turmasSnap = await getDocs(query(collection(db, "turmas"), orderBy("nome")));
        setTurmas(turmasSnap.docs.map(doc => ({ id: doc.id, nome: doc.data().nome })));
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, "alunos", id), {
        ...formData,
        numeroChamada: formData.numeroChamada ? parseInt(formData.numeroChamada) : null,
        fotoUrl: photo,
        updatedAt: new Date().toISOString(),
      });
      router.push(`/carometro?turmaId=${formData.turmaId}`);
    } catch (err) {
      console.error("Erro ao atualizar aluno:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div></div>;

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <header className="mb-12 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Editar Aluno</h1>
                <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Atualize as informações do estudante</p>
              </div>
              <div className="px-4 py-2 bg-purple-50 text-purple-600 rounded-xl text-[10px] font-black uppercase tracking-widest mb-1">ID: {id}</div>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-12">
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm sticky top-8">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Foto do Aluno</h3>
                  <div className={cn("aspect-[3/4] rounded-[32px] overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 relative group transition-all", photo ? "border-solid border-purple-100" : "hover:border-purple-200")}>
                    {photo ? (
                      <>
                        <img src={photo} alt="Preview" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhoto(null)} className="absolute top-4 right-4 p-2 bg-white/90 backdrop-blur-md rounded-full text-red-500 shadow-lg hover:bg-red-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                        <Camera className="w-10 h-10 text-gray-200 mb-4" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-tight">Adicione uma foto do estudante</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-8 space-y-3">
                    <button type="button" onClick={() => setShowCamera(true)} className="w-full flex items-center justify-center gap-3 bg-purple-50 text-purple-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-100 transition-all shadow-sm"><Camera className="w-4 h-4" />Tirar Foto</button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-3 bg-gray-50 text-gray-500 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"><Upload className="w-4 h-4" />Subir Arquivo</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-8">
                <div className="bg-white p-10 rounded-[40px] border border-gray-100 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nome Completo</label>
                      <input type="text" required value={formData.nomeCompleto} onChange={(e) => setFormData({...formData, nomeCompleto: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all placeholder:text-gray-300" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">RA (Registro do Aluno)</label>
                      <input type="text" required value={formData.ra} onChange={(e) => setFormData({...formData, ra: e.target.value})} className="w-full px-6 py-4 bg-gray-100 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Nº Chamada</label>
                      <input type="number" value={formData.numeroChamada} onChange={(e) => setFormData({...formData, numeroChamada: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all" />
                    </div>
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Turma</label>
                      <select required value={formData.turmaId} onChange={(e) => setFormData({...formData, turmaId: e.target.value})} className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-600 outline-none transition-all">
                        <option value="">Selecione a Turma</option>
                        {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => router.back()} className="px-10 py-5 bg-white border border-gray-100 rounded-3xl font-black uppercase text-[10px] tracking-widest text-gray-400 hover:text-gray-900 transition-all">Cancelar</button>
                  <button type="submit" disabled={saving} className="flex-1 px-10 py-5 bg-purple-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest hover:bg-purple-700 transition-all shadow-xl shadow-purple-100 disabled:opacity-50 flex items-center justify-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </main>
        <AnimatePresence>{showCamera && <CameraCapture onCapture={(base64) => setPhoto(base64)} onClose={() => setShowCamera(false)} />}</AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}
