"use client";

import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Settings, User, Bell, Shield, Palette } from "lucide-react";

const sections = [
  { icon: User, label: "Perfil do Usuário", desc: "Gerencie suas informações pessoais" },
  { icon: Shield, label: "Segurança", desc: "Senhas e permissões de acesso" },
  { icon: Bell, label: "Notificações", desc: "Alertas e lembretes do sistema" },
  { icon: Palette, label: "Aparência", desc: "Personalize visualmente sua sessão" },
];

export default function ConfiguracaoPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <header className="mb-12">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Configurações</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Ajustes e preferências do sistema</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sections.map((section, i) => (
              <div key={i} className="bg-white p-10 rounded-[48px] border border-gray-100 shadow-sm flex items-center gap-8 hover:shadow-xl transition-all cursor-pointer group">
                <div className="w-16 h-16 bg-gray-50 rounded-[24px] flex items-center justify-center text-gray-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-all">
                  <section.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">{section.label}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{section.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
