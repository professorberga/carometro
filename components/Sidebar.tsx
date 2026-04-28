'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Users, 
  LayoutDashboard, 
  BookOpen, 
  LogOut, 
  Settings, 
  Search,
  PlusCircle,
  FileUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  const isGestor = profile?.role === 'gestor';

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, href: '/dashboard', show: isGestor },
    { name: 'Carômetro', icon: Search, href: '/carometro', show: true },
    { name: 'Turmas', icon: BookOpen, href: '/turmas', show: isGestor },
    { name: 'Novo Aluno', icon: PlusCircle, href: '/alunos/novo', show: isGestor },
    { name: 'Importar Dados', icon: FileUp, href: '/importar', show: isGestor },
    { name: 'Configurações', icon: Settings, href: '/configuracao', show: isGestor },
  ];

  return (
    <div className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 z-40 overflow-hidden">
      <div className="p-6 h-20 flex items-center">
        <h1 className="text-2xl font-bold text-purple-600 tracking-tight whitespace-nowrap">
          Carômetro<span className="text-gray-900 font-normal">Escolar</span>
        </h1>
      </div>

      <div className="px-6 mb-6">
        {profile && (
          <div className="p-3 bg-purple-50 rounded-xl overflow-hidden">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-200 rounded-lg shrink-0 flex items-center justify-center text-purple-700 font-bold">
                {profile.nome?.charAt(0) || 'U'}
              </div>
              <div className="ml-3 whitespace-nowrap">
                <p className="text-sm font-bold text-purple-900 truncate w-32">{profile.nome || profile.email}</p>
                <p className="text-[10px] text-purple-600 uppercase font-black tracking-tighter">{profile.role}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.filter(item => item.show).map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
              pathname === item.href
                ? "bg-purple-100 text-purple-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <item.icon className="w-6 h-6 shrink-0" />
            <span className="ml-3 whitespace-nowrap">
              {item.name}
            </span>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center w-full px-4 py-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-all group/logout"
        >
          <LogOut className="w-6 h-6 shrink-0" />
          <span className="ml-3 whitespace-nowrap">
            Sair do Sistema
          </span>
        </button>
      </div>
    </div>
  );
}
