import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Phone, 
  Mail, 
  Calendar,
  Briefcase, 
  GripVertical,
  DollarSign,
  Gem,
  Crown,
  Medal,
  Award,
  MessageCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  funnel?: { name: string } | null;
  assigned_sdr?: { name: string } | null;
};

type Appointment = Database['public']['Tables']['appointments']['Row'] & {
  closer?: { name: string } | null;
};

interface KanbanScheduledCardProps {
  lead: Lead;
  appointment?: Appointment | null;
  onClick: () => void;
}

const classificationConfig: Record<string, { label: string; icon: typeof Gem; className: string }> = {
  diamante: {
    label: 'Diamante',
    icon: Gem,
    className: 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30',
  },
  ouro: {
    label: 'Ouro',
    icon: Crown,
    className: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
  prata: {
    label: 'Prata',
    icon: Medal,
    className: 'bg-slate-400/20 text-slate-600 dark:text-slate-400 border-slate-400/30',
  },
  bronze: {
    label: 'Bronze',
    icon: Award,
    className: 'bg-orange-600/20 text-orange-600 dark:text-orange-400 border-orange-600/30',
  },
};

export function KanbanScheduledCard({ lead, appointment, onClick }: KanbanScheduledCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: 'lead',
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get initials for avatar
  const initials = lead.full_name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const classification = lead.classification || 'prata';
  const config = classificationConfig[classification] || classificationConfig.prata;
  const ClassificationIcon = config.icon;

  const formatCurrency = (value: number | null) => {
    if (!value) return null;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.email) {
      window.open(`mailto:${lead.email}`, '_blank');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_blank');
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'group bg-gradient-to-br from-card to-card/80 border-2 rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:shadow-xl hover:-translate-y-1',
        config.className.replace('bg-', 'border-'),
        isDragging && 'opacity-50 shadow-xl rotate-2 scale-105'
      )}
    >
      <div className="space-y-3">
        {/* Header with classification badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Avatar with classification color */}
            <div className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border',
              config.className
            )}>
              <span className="text-sm font-bold">{initials}</span>
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm text-foreground line-clamp-1">{lead.full_name}</h4>
              <div className={cn('flex items-center gap-1 text-xs', config.className.split(' ')[1])}>
                <ClassificationIcon className="h-3 w-3" />
                <span className="font-medium">{config.label}</span>
              </div>
            </div>
          </div>
          <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        </div>

        {/* Business info */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {lead.niche && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Briefcase className="h-3 w-3" />
              <span className="truncate">{lead.niche}</span>
            </div>
          )}
          {lead.revenue && (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <DollarSign className="h-3 w-3" />
              <span>{formatCurrency(lead.revenue)}</span>
            </div>
          )}
        </div>

        {/* Appointment info */}
        {appointment && (
          <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-md px-2 py-1.5">
            <Calendar className="h-3 w-3" />
            <span className="font-medium">
              {format(new Date(appointment.scheduled_date), "dd/MM 'às' HH:mm", { locale: ptBR })}
            </span>
            {appointment.closer && (
              <span className="text-muted-foreground ml-1">• {appointment.closer.name}</span>
            )}
          </div>
        )}

        {/* Quick actions */}
        <div className="flex items-center gap-1 pt-2 border-t border-border/50">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleWhatsApp}
            disabled={!lead.phone}
          >
            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleCall}
            disabled={!lead.phone}
          >
            <Phone className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleEmail}
            disabled={!lead.email}
          >
            <Mail className="h-3.5 w-3.5" />
          </Button>
          {lead.state && (
            <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {lead.state}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
