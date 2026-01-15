import { Layers, CalendarCheck, Trophy, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FunnelMetrics } from '@/hooks/useReportsStats';

interface FunnelMetricsCardsProps {
  data?: FunnelMetrics[];
  isLoading?: boolean;
}

export function FunnelMetricsCards({ data, isLoading }: FunnelMetricsCardsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center h-[200px] text-muted-foreground">
          Nenhum funil ativo encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((funnel) => (
        <Card key={funnel.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Layers className="h-5 w-5 text-primary" />
              {funnel.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Leads</p>
                <p className="text-2xl font-bold">{funnel.leads}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
                <p className="text-2xl font-bold">{funnel.agendamentos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversões</p>
                <p className="text-2xl font-bold text-success">{funnel.conversoes}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Gerado</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(funnel.valorGerado)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Taxa Agend.
                </p>
                <p className="text-lg font-semibold">{funnel.taxaAgendamento.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3 w-3" /> Taxa Conv.
                </p>
                <p className="text-lg font-semibold">{funnel.taxaConversao.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
