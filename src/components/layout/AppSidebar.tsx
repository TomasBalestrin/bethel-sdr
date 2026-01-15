import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Calendar, 
  BarChart3, 
  Settings,
  ChevronLeft
} from 'lucide-react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/logo.png';

import type { AppRole } from '@/types/database';

const menuItems: { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] }[] = [
  { 
    title: 'Dashboard', 
    url: '/', 
    icon: LayoutDashboard,
    roles: ['admin', 'lider']
  },
  { 
    title: 'Leads', 
    url: '/leads', 
    icon: Users,
    roles: ['admin', 'lider', 'sdr']
  },
  { 
    title: 'CRM', 
    url: '/crm', 
    icon: Kanban,
    roles: ['admin', 'lider', 'sdr']
  },
  { 
    title: 'Calendário', 
    url: '/calendario', 
    icon: Calendar,
    roles: ['admin', 'lider', 'sdr', 'closer']
  },
  { 
    title: 'Relatórios', 
    url: '/relatorios', 
    icon: BarChart3,
    roles: ['admin', 'lider']
  },
  { 
    title: 'Administração', 
    url: '/admin', 
    icon: Settings,
    roles: ['admin', 'lider']
  },
];

export function AppSidebar() {
  const { role } = useAuth();
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const filteredItems = menuItems.filter(
    (item) => role && item.roles.includes(role)
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-2">
          <img src={logoImg} alt="Bethel" className="h-8 w-8 object-contain" />
          {!collapsed && (
            <span className="text-lg font-semibold text-sidebar-foreground">Bethel SDR</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <RouterNavLink 
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3',
                          isActive && 'bg-primary/10 text-primary'
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <SidebarTrigger className="w-full justify-center">
          <ChevronLeft className={cn(
            'h-4 w-4 transition-transform',
            collapsed && 'rotate-180'
          )} />
          {!collapsed && <span className="ml-2">Recolher</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}
