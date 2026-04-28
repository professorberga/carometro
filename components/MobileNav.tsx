'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Search, 
  BookOpen, 
  PlusCircle,
  Settings,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileNav() {
  const pathname = usePathname();
  const { profile } = useAuth();

  const isGestor = profile?.role === 'gestor';

  const menuItems = [
    { name: 'Home', icon: LayoutDashboard, href: '/dashboard', show: isGestor },
    { name: 'Carômetro', icon: Search, href: '/carometro', show: true },
    { name: 'Novo Aluno', icon: PlusCircle, href: '/alunos/novo', show: isGestor },
    { name: 'Config', icon: Settings, href: '/configuracao', show: isGestor },
  ];

  // If not gestor, only show Carometro and maybe a simplified menu
  const finalItems = menuItems.filter(item => item.show);

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 px-6 py-3 pb-8">
      <nav className="flex justify-between items-center max-w-md mx-auto">
        {finalItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-xl transition-colors",
              pathname === item.href
                ? "text-purple-600"
                : "text-gray-400"
            )}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">{item.name}</span>
          </Link>
        ))}
        <Link
          href="/turmas"
          className={cn(
            "flex flex-col items-center justify-center p-2 rounded-xl transition-colors",
            pathname === '/turmas' ? "text-purple-600" : "text-gray-400",
            !isGestor && "hidden"
          )}
        >
          <BookOpen className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">Turmas</span>
        </Link>
      </nav>
    </div>
  );
}
