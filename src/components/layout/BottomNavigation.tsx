import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Calendar,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { AppRole } from '@/types/database';

const navItems: { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] }[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard, roles: ['admin', 'lider'] },
  { title: 'Leads', url: '/leads', icon: Users, roles: ['admin', 'lider', 'sdr'] },
  { title: 'CRM', url: '/crm', icon: Kanban, roles: ['admin', 'lider', 'sdr'] },
  { title: 'Calendário', url: '/calendario', icon: Calendar, roles: ['admin', 'lider', 'sdr', 'closer'] },
  { title: 'Relatórios', url: '/relatorios', icon: BarChart3, roles: ['admin', 'lider'] },
];

export function BottomNavigation() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const filteredItems = navItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {filteredItems.map((item) => {
          const isActive = location.pathname === item.url;
          return (
            <button
              key={item.url}
              onClick={() => navigate(item.url)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 transition-transform',
                isActive && 'scale-110'
              )} />
              <span className={cn(
                'text-[10px] font-medium leading-none',
                isActive && 'font-semibold'
              )}>
                {item.title}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
