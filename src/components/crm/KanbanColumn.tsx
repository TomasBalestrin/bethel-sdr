import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Database } from '@/integrations/supabase/types';
import { cn } from '@/lib/utils';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  funnel?: { name: string } | null;
  assigned_sdr?: { name: string } | null;
};

type CRMColumn = Database['public']['Tables']['crm_columns']['Row'];

interface KanbanColumnProps {
  column: CRMColumn;
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
}

export function KanbanColumn({ column, leads, onLeadClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  });

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className="flex items-center gap-3 mb-4 px-2">
        <div 
          className="relative"
        >
          <div
            className="w-3 h-3 rounded-full ring-4"
            style={{ 
              backgroundColor: column.color,
              boxShadow: `0 0 0 4px ${column.color}20`
            }}
          />
        </div>
        <h3 className="font-semibold text-foreground tracking-tight">{column.name}</h3>
        <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full ml-auto">
          {leads.length}
        </span>
      </div>

      {/* Drop Zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 transition-all duration-200 min-h-[450px] scrollbar-thin overflow-y-auto',
          isOver 
            ? 'bg-primary/10 ring-2 ring-primary/30 ring-offset-2 ring-offset-background' 
            : 'bg-muted/30 hover:bg-muted/40'
        )}
      >
        <SortableContext
          items={leads.map(l => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2.5">
            {leads.length > 0 ? (
              leads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <span 
                    className="w-4 h-4 rounded-full opacity-40"
                    style={{ backgroundColor: column.color }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Arraste leads aqui
                </p>
              </div>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}