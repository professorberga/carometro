"use client";

import { Sidebar } from "@/components/Sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";
import { Users, GraduationCap, FileUp, Settings } from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Total Alunos", value: "0", icon: Users, color: "bg-blue-100 text-blue-600" },
  { label: "Total Turmas", value: "0", icon: GraduationCap, color: "bg-purple-100 text-purple-600" },
];

const quickActions = [
  { label: "Ver Carômetro", href: "/carometro", icon: Users, desc: "Visualizar estudantes" },
  { label: "Gerenciar Turmas", href: "/turmas", icon: GraduationCap, desc: "Organizar classes" },
  { label: "Importar Planilha", href: "/importar", icon: FileUp, desc: "Carga em lote" },
  { label: "Configurações", href: "/configuracao", icon: Settings, desc: "Ajustes do sistema" },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <header className="mb-12">
            <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Painel de Controle</h1>
            <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] mt-1">Bem-vindo de volta, {user?.displayName}</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px] mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 leading-none">{stat.value}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-6">Acesso Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickActions.map((action, i) => (
              <Link 
                key={i} 
                href={action.href}
                className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-100 group-hover:text-purple-600 transition-all">
                  <action.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter leading-none mb-2">{action.label}</h3>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">{action.desc}</p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

// Inline helper since I don't want to import it everywhere in this reconstruction turn
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}
