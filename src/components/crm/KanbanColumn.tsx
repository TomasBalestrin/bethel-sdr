import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanCard } from './KanbanCard';
import { Database } from '@/integrations/supabase/types';

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
    <div
      className="flex-shrink-0 w-72 flex flex-col"
    >
      <div className="flex items-center gap-2 mb-4 px-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: column.color }}
        />
        <h3 className="font-semibold text-foreground">{column.name}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
          {leads.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-lg p-2 transition-colors min-h-[400px] ${
          isOver ? 'bg-primary/10 ring-2 ring-primary/20' : 'bg-muted/30'
        }`}
      >
        <SortableContext
          items={leads.map(l => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {leads.length > 0 ? (
              leads.map((lead) => (
                <KanbanCard
                  key={lead.id}
                  lead={lead}
                  onClick={() => onLeadClick(lead)}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Arraste leads aqui
              </p>
            )}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}
