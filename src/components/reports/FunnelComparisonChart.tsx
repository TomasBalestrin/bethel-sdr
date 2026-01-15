import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import type { FunnelMetrics } from '@/hooks/useReportsStats';

interface FunnelComparisonChartProps {
  data?: FunnelMetrics[];
  isLoading?: boolean;
}

const chartConfig = {
  leads: {
    label: 'Leads',
    color: 'hsl(var(--primary))',
  },
  agendamentos: {
    label: 'Agendamentos',
    color: 'hsl(var(--warning))',
  },
  conversoes: {
    label: 'Conversões',
    color: 'hsl(var(--success))',
  },
};

export function FunnelComparisonChart({ data, isLoading }: FunnelComparisonChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparativo por Funil</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded w-full h-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comparativo por Funil</CardTitle>
          <CardDescription>Performance entre funis ativos</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
          Nenhum funil ativo encontrado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparativo por Funil</CardTitle>
        <CardDescription>Leads, agendamentos e conversões por funil</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                dataKey="leads" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Leads"
              />
              <Bar 
                dataKey="agendamentos" 
                fill="hsl(var(--warning))" 
                radius={[4, 4, 0, 0]}
                name="Agendamentos"
              />
              <Bar 
                dataKey="conversoes" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                name="Conversões"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
