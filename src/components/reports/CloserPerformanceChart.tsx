import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface CloserPerformanceData {
  name: string;
  agendadas: number;
  realizadas: number;
  conversoes: number;
  valor: number;
}

interface CloserPerformanceChartProps {
  data?: CloserPerformanceData[];
  isLoading?: boolean;
}

const chartConfig = {
  agendadas: {
    label: 'Agendadas',
    color: 'hsl(var(--primary))',
  },
  realizadas: {
    label: 'Realizadas',
    color: 'hsl(var(--warning))',
  },
  conversoes: {
    label: 'Conversões',
    color: 'hsl(var(--success))',
  },
  valor: {
    label: 'Valor (R$)',
    color: 'hsl(var(--diamante))',
  },
};

export function CloserPerformanceChart({ data, isLoading }: CloserPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por Closer</CardTitle>
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
          <CardTitle>Performance por Closer</CardTitle>
          <CardDescription>Calls e conversões por closer</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
          Nenhum dado disponível para o período selecionado
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por Closer</CardTitle>
        <CardDescription>Calls agendadas vs realizadas vs conversões</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ left: 20, right: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis yAxisId="left" />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                yAxisId="left"
                dataKey="agendadas" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                name="Agendadas"
              />
              <Bar 
                yAxisId="left"
                dataKey="realizadas" 
                fill="hsl(var(--warning))" 
                radius={[4, 4, 0, 0]}
                name="Realizadas"
              />
              <Bar 
                yAxisId="left"
                dataKey="conversoes" 
                fill="hsl(var(--success))" 
                radius={[4, 4, 0, 0]}
                name="Conversões"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="valor"
                stroke="hsl(var(--diamante))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--diamante))', strokeWidth: 2 }}
                name="Valor Gerado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
