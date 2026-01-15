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

interface SDRPerformanceData {
  name: string;
  atribuidos: number;
  agendados: number;
  convertidos: number;
}

interface SDRPerformanceChartProps {
  data?: SDRPerformanceData[];
  isLoading?: boolean;
}

const chartConfig = {
  atribuidos: {
    label: 'Atribuídos',
    color: 'hsl(var(--primary))',
  },
  agendados: {
    label: 'Agendados',
    color: 'hsl(var(--warning))',
  },
  convertidos: {
    label: 'Convertidos',
    color: 'hsl(var(--success))',
  },
};

export function SDRPerformanceChart({ data, isLoading }: SDRPerformanceChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance por SDR</CardTitle>
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
          <CardTitle>Performance por SDR</CardTitle>
          <CardDescription>Leads atribuídos vs agendados vs convertidos</CardDescription>
        </CardHeader>
        <CardContent className="h-[350px] flex items-center justify-center text-muted-foreground">
          Nenhum dado disponível para o período selecionado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance por SDR</CardTitle>
        <CardDescription>Leads atribuídos vs agendados vs convertidos</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={100}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
              <Bar 
                dataKey="atribuidos" 
                fill="hsl(var(--primary))" 
                radius={[0, 4, 4, 0]}
                name="Atribuídos"
              />
              <Bar 
                dataKey="agendados" 
                fill="hsl(var(--warning))" 
                radius={[0, 4, 4, 0]}
                name="Agendados"
              />
              <Bar 
                dataKey="convertidos" 
                fill="hsl(var(--success))" 
                radius={[0, 4, 4, 0]}
                name="Convertidos"
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
