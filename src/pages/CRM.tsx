import { Kanban } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCRMColumns } from '@/hooks/useCRMColumns';
import { useLeads } from '@/hooks/useLeads';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';

export default function CRM() {
  const { data: columns, isLoading: columnsLoading } = useCRMColumns();
  const { data: leads, isLoading: leadsLoading } = useLeads({ status: ['em_atendimento', 'agendado'] });

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
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex-shrink-0 w-72 bg-muted/30 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-semibold text-foreground">{column.name}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">0</span>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Arraste leads aqui
                  </p>
                </div>
              </div>
            ))}
          </div>
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
