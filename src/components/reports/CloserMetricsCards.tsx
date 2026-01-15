import { Phone, CheckCircle, XCircle, TrendingUp, Trophy, DollarSign } from 'lucide-react';
import { StatsCard } from '@/components/shared/StatsCard';
import type { CloserMetrics } from '@/hooks/useReportsStats';

interface CloserMetricsCardsProps {
  metrics?: CloserMetrics;
  isLoading?: boolean;
}

export function CloserMetricsCards({ metrics, isLoading }: CloserMetricsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatsCard
        title="Calls Agendadas"
        value={isLoading ? '...' : metrics?.callsAgendadas || 0}
        icon={Phone}
        description="Total no período"
      />
      <StatsCard
        title="Calls Realizadas"
        value={isLoading ? '...' : metrics?.callsRealizadas || 0}
        icon={CheckCircle}
        description="Comparecimentos"
      />
      <StatsCard
        title="Não Compareceu"
        value={isLoading ? '...' : metrics?.callsNaoCompareceu || 0}
        icon={XCircle}
        description="No-shows"
      />
      <StatsCard
        title="Taxa de Comparecimento"
        value={isLoading ? '...' : `${(metrics?.taxaComparecimento || 0).toFixed(1)}%`}
        icon={TrendingUp}
        description="Realizadas / Agendadas"
      />
      <StatsCard
        title="Taxa de Conversão"
        value={isLoading ? '...' : `${(metrics?.taxaConversao || 0).toFixed(1)}%`}
        icon={Trophy}
        description="Conversões / Realizadas"
      />
      <StatsCard
        title="Ticket Médio"
        value={isLoading ? '...' : formatCurrency(metrics?.ticketMedio || 0)}
        icon={DollarSign}
        description="Valor médio por venda"
      />
    </div>
  );
}
