import { useState } from 'react';
import { Users, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatsCard } from '@/components/shared/StatsCard';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { useLeadsStats } from '@/hooks/useLeads';
import { useAppointmentStats } from '@/hooks/useAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadsEvolutionChart } from '@/components/dashboard/LeadsEvolutionChart';
import { ConversionFunnelChart } from '@/components/dashboard/ConversionFunnelChart';
import { PerformanceByFunnelChart } from '@/components/dashboard/PerformanceByFunnelChart';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const [period, setPeriod] = useState<string>('30');
  const { data: leadsStats, isLoading: leadsLoading, isError: leadsError, refetch: refetchLeads } = useLeadsStats();
  const { data: appointmentsStats, isLoading: appointmentsLoading, isError: appointmentsError, refetch: refetchAppointments } = useAppointmentStats();

  const isLoading = leadsLoading || appointmentsLoading;
  const isError = leadsError || appointmentsError;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do sistema</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <QueryErrorState onRetry={() => { refetchLeads(); refetchAppointments(); }} />
        ) : isLoading ? (
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

        <div className="grid gap-6 md:grid-cols-2">
          <LeadsEvolutionChart days={parseInt(period)} />
          <ConversionFunnelChart />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <PerformanceByFunnelChart />
        </div>
      </div>
    </AppLayout>
  );
}
