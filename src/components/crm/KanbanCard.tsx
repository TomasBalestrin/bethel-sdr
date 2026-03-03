import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Phone, Clock, Briefcase, GripVertical, MessageCircle } from 'lucide-react';
import { ClassificationBadge } from '@/components/shared/StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  funnel?: { name: string } | null;
  assigned_sdr?: { name: string } | null;
};

interface KanbanCardProps {
  lead: Lead;
  onClick: () => void;
}

export function KanbanCard({ lead, onClick }: KanbanCardProps) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Lead ${lead.full_name}${lead.classification ? `, classificação ${lead.classification}` : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      className={cn(
        'group bg-card border border-border/50 rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200',
        'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isDragging && 'opacity-50 shadow-xl rotate-2 scale-105'
      )}
    >
      <div className="space-y-3">
        {/* Header with name and classification */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-bold text-primary">{initials}</span>
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-sm text-foreground line-clamp-1">{lead.full_name}</h4>
              <GripVertical className="h-4 w-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </div>
            {lead.niche && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {lead.niche}
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex items-center gap-3">
          {lead.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const cleanPhone = lead.phone!.replace(/\D/g, '');
                window.open(`https://wa.me/55${cleanPhone}`, '_blank');
              }}
              className="flex items-center gap-1.5 text-xs text-green-600 hover:underline cursor-pointer"
            >
              <MessageCircle className="h-3 w-3" />
              <span className="font-medium">{lead.phone}</span>
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          {lead.classification && (
            <ClassificationBadge classification={lead.classification} />
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground ml-auto">
            <Clock className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(lead.updated_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}