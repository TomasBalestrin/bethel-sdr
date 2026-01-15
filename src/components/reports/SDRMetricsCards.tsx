import { Users, Clock, CalendarCheck, TrendingUp, Trophy, DollarSign } from 'lucide-react';
import { StatsCard } from '@/components/shared/StatsCard';
import type { SDRMetrics } from '@/hooks/useReportsStats';

interface SDRMetricsCardsProps {
  metrics?: SDRMetrics;
  isLoading?: boolean;
}

export function SDRMetricsCards({ metrics, isLoading }: SDRMetricsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatsCard
        title="Leads Atribuídos"
        value={isLoading ? '...' : metrics?.leadsAtribuidos || 0}
        icon={Users}
        description="Total no período"
      />
      <StatsCard
        title="Em Atendimento"
        value={isLoading ? '...' : metrics?.leadsEmAtendimento || 0}
        icon={Clock}
        description="Leads ativos"
      />
      <StatsCard
        title="Agendados"
        value={isLoading ? '...' : metrics?.leadsAgendados || 0}
        icon={CalendarCheck}
        description="Calls marcadas"
      />
      <StatsCard
        title="Taxa de Agendamento"
        value={isLoading ? '...' : `${(metrics?.taxaAgendamento || 0).toFixed(1)}%`}
        icon={TrendingUp}
        description="Agendados / Atribuídos"
      />
      <StatsCard
        title="Conversões"
        value={isLoading ? '...' : metrics?.conversoes || 0}
        icon={Trophy}
        description="Vendas fechadas"
      />
      <StatsCard
        title="Valor Gerado"
        value={isLoading ? '...' : formatCurrency(metrics?.valorGerado || 0)}
        icon={DollarSign}
        description="Total em vendas"
      />
    </div>
  );
}
