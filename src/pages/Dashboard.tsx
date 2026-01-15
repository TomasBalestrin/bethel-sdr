import { Users, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/shared/StatsCard';
import { useLeadsStats } from '@/hooks/useLeads';
import { useAppointmentStats } from '@/hooks/useAppointments';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: leadsStats, isLoading: leadsLoading } = useLeadsStats();
  const { data: appointmentsStats, isLoading: appointmentsLoading } = useAppointmentStats();

  const isLoading = leadsLoading || appointmentsLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="Total de Leads"
              value={leadsStats?.total || 0}
              icon={Users}
              description={`${leadsStats?.byStatus.novo || 0} novos`}
            />
            <StatsCard
              title="Em Atendimento"
              value={leadsStats?.byStatus.em_atendimento || 0}
              icon={TrendingUp}
            />
            <StatsCard
              title="Agendamentos"
              value={appointmentsStats?.total || 0}
              icon={Calendar}
              description={`${appointmentsStats?.agendados || 0} pendentes`}
            />
            <StatsCard
              title="Valor Convertido"
              value={`R$ ${(appointmentsStats?.valorTotal || 0).toLocaleString('pt-BR')}`}
              icon={DollarSign}
              description={`${appointmentsStats?.taxaConversao?.toFixed(1) || 0}% conversão`}
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
