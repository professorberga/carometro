"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  UserPlus, 
  FileUp, 
  Settings, 
  LogOut 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Users, label: "Carômetro", href: "/carometro" },
  { icon: GraduationCap, label: "Turmas", href: "/turmas" },
  { icon: UserPlus, label: "Novo Aluno", href: "/alunos/novo" },
  { icon: FileUp, label: "Importar Dados", href: "/importar" },
  { icon: Settings, label: "Configurações", href: "/configuracao" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <div className="w-64 bg-white border-r border-gray-100 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <span className="text-purple-600">Carômetro</span>Escolar
        </h1>
      </div>

      <div className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
              pathname === item.href
                ? "bg-purple-50 text-purple-600"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </div>

      <div className="p-4 border-t border-gray-50">
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 mb-2 bg-gray-50 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black">
              {user.email?.[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-gray-900 truncate">{user.displayName || "Usuário"}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Logado</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
}
