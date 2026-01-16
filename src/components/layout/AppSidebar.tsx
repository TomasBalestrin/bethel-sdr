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
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-b from-sidebar-accent/20 to-transparent">
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary/10 ring-1 ring-sidebar-primary/20">
            <img src={logoImg} alt="Bethel" className="h-6 w-6 object-contain" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
                Bethel
              </span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">
                SDR System
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="scrollbar-thin">
        <SidebarGroup className="py-4">
          <SidebarGroupLabel className="px-4 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent className="mt-2">
            <SidebarMenu className="gap-1 px-2">
              {filteredItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={cn(
                        'relative h-11 rounded-lg transition-all duration-200',
                        isActive 
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/25' 
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                      )}
                    >
                      <RouterNavLink 
                        to={item.url}
                        className="flex items-center gap-3"
                      >
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary-foreground rounded-r-full" />
                        )}
                        <item.icon className={cn(
                          "h-5 w-5 shrink-0 transition-transform duration-200",
                          isActive && "scale-110"
                        )} />
                        <span className="font-medium">{item.title}</span>
                      </RouterNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 p-2">
        <SidebarTrigger 
          className={cn(
            "w-full h-10 justify-center rounded-lg transition-all duration-200",
            "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          )}
        >
          <ChevronLeft className={cn(
            'h-4 w-4 transition-transform duration-300',
            collapsed && 'rotate-180'
          )} />
          {!collapsed && <span className="ml-2 text-sm font-medium">Recolher</span>}
        </SidebarTrigger>
      </SidebarFooter>
    </Sidebar>
  );
}