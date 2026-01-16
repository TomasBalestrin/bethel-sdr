import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface NotificationItemProps {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
  onClick?: () => void;
}

const typeConfig = {
  info: { icon: Info, bg: 'bg-primary/10', text: 'text-primary' },
  success: { icon: CheckCircle, bg: 'bg-success/10', text: 'text-success' },
  warning: { icon: AlertTriangle, bg: 'bg-warning/10', text: 'text-warning' },
  error: { icon: AlertCircle, bg: 'bg-destructive/10', text: 'text-destructive' },
};

export function NotificationItem({
  title,
  message,
  type,
  read,
  createdAt,
  onClick,
}: NotificationItemProps) {
  const config = typeConfig[type] || typeConfig.info;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-start gap-3 p-4 hover:bg-muted/50 transition-all duration-200 text-left',
        !read && 'bg-primary/[0.03]'
      )}
    >
      <div className={cn('flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center', config.bg)}>
        <Icon className={cn('h-4 w-4', config.text)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm line-clamp-1', !read ? 'font-semibold text-foreground' : 'font-medium text-foreground/80')}>
            {title}
          </p>
          {!read && (
            <span className="flex-shrink-0 h-2 w-2 rounded-full bg-primary mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
          {message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1.5 uppercase tracking-wide">
          {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: ptBR })}
        </p>
      </div>
    </button>
  );
}