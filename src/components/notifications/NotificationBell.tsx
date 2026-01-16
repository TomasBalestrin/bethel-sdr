import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications';
import { NotificationItem } from './NotificationItem';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { data: notifications, isLoading, unreadCount } = useNotifications();
  const markAsRead = useMarkNotificationRead();
  const markAllAsRead = useMarkAllNotificationsRead();

  const handleNotificationClick = (id: string) => {
    markAsRead.mutate(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "relative h-9 w-9 rounded-lg transition-all duration-200",
            "hover:bg-accent",
            unreadCount > 0 && "text-primary"
          )}
        >
          <Bell className={cn(
            "h-[18px] w-[18px] transition-transform duration-200",
            unreadCount > 0 && "animate-pulse-soft"
          )} />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-lg shadow-destructive/30">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive animate-ping opacity-50" />
            </>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 rounded-xl shadow-xl border-border/50" align="end" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <h4 className="font-semibold text-sm">Notificações</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs font-medium hover:bg-primary/10 hover:text-primary"
              onClick={() => markAllAsRead.mutate()}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Carregando...</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border/50">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  id={notification.id}
                  title={notification.title}
                  message={notification.message}
                  type={notification.type}
                  read={notification.read}
                  createdAt={notification.created_at}
                  onClick={() => handleNotificationClick(notification.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <Bell className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma notificação
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Você será notificado sobre eventos importantes
              </p>
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}