import { Kanban } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCRMColumns } from '@/hooks/useCRMColumns';
import { useLeads } from '@/hooks/useLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { KanbanBoard } from '@/components/crm/KanbanBoard';

export default function CRM() {
  const { data: columns, isLoading: columnsLoading } = useCRMColumns();
  const { data: leads, isLoading: leadsLoading } = useLeads({ 
    status: ['em_atendimento', 'agendado'] 
  });

  const isLoading = columnsLoading || leadsLoading;

  return (
    <AppLayout>
      <div className="space-y-6 h-full">
        <div>
          <h1 className="text-2xl font-bold text-foreground">CRM Kanban</h1>
          <p className="text-muted-foreground">Gerencie seus leads no pipeline</p>
        </div>

        {isLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-96 w-72 flex-shrink-0" />
            ))}
          </div>
        ) : columns && columns.length > 0 ? (
          <KanbanBoard 
            columns={columns} 
            leads={(leads || []) as any} 
          />
        ) : (
          <EmptyState
            icon={Kanban}
            title="CRM não configurado"
            description="Configure as colunas do CRM no painel de administração."
          />
        )}
      </div>
    </AppLayout>
  );
}
