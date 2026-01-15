import { useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { KanbanColumn } from './KanbanColumn';
import { KanbanCard } from './KanbanCard';
import { LeadDetailsSheet } from '@/components/leads/LeadDetailsSheet';
import { ScheduleAppointmentModal } from './ScheduleAppointmentModal';
import { useMoveLeadColumn } from '@/hooks/useMoveLeadColumn';
import { useAuth } from '@/hooks/useAuth';
import { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  funnel?: { name: string } | null;
  assigned_sdr?: { name: string } | null;
};

type CRMColumn = Database['public']['Tables']['crm_columns']['Row'];

interface KanbanBoardProps {
  columns: CRMColumn[];
  leads: Lead[];
}

export function KanbanBoard({ columns, leads }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const { user } = useAuth();
  const moveLeadColumn = useMoveLeadColumn();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const leadsByColumn = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    
    // Initialize with empty arrays for each column
    columns.forEach(col => {
      map[col.id] = [];
    });
    
    // Add unassigned column
    map['unassigned'] = [];
    
    // Distribute leads
    leads.forEach(lead => {
      if (lead.crm_column_id && map[lead.crm_column_id]) {
        map[lead.crm_column_id].push(lead);
      } else {
        map['unassigned'].push(lead);
      }
    });
    
    return map;
  }, [columns, leads]);

  const activeLead = useMemo(() => {
    if (!activeId) return null;
    return leads.find(l => l.id === activeId) || null;
  }, [activeId, leads]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);

    if (!over || !user) return;

    const leadId = active.id as string;
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) return;

    // Determine target column
    let targetColumnId: string | null = null;
    
    if (over.data.current?.type === 'column') {
      targetColumnId = over.id as string;
    } else if (over.data.current?.type === 'lead') {
      const overLead = leads.find(l => l.id === over.id);
      targetColumnId = overLead?.crm_column_id || null;
    }

    // Don't move if same column
    if (targetColumnId === lead.crm_column_id) return;
    if (!targetColumnId || targetColumnId === 'unassigned') return;

    await moveLeadColumn.mutateAsync({
      leadId,
      fromColumnId: lead.crm_column_id,
      toColumnId: targetColumnId,
      userId: user.id,
    });
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleSchedule = () => {
    setDetailsOpen(false);
    setScheduleOpen(true);
  };

  // Get first column for unassigned leads visualization
  const firstColumn = columns[0];

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 h-full">
          {/* Unassigned leads column */}
          {leadsByColumn['unassigned']?.length > 0 && (
            <div className="flex-shrink-0 w-72 flex flex-col">
              <div className="flex items-center gap-2 mb-4 px-1">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <h3 className="font-semibold text-foreground">Não Atribuídos</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full ml-auto">
                  {leadsByColumn['unassigned'].length}
                </span>
              </div>
              <div className="flex-1 rounded-lg p-2 bg-muted/30 min-h-[400px]">
                <div className="space-y-2">
                  {leadsByColumn['unassigned'].map((lead) => (
                    <KanbanCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => handleLeadClick(lead)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              leads={leadsByColumn[column.id] || []}
              onLeadClick={handleLeadClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-3">
              <KanbanCard lead={activeLead} onClick={() => {}} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <LeadDetailsSheet
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onSchedule={handleSchedule}
      />

      <ScheduleAppointmentModal
        lead={selectedLead}
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
    </>
  );
}
