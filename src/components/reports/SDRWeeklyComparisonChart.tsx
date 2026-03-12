import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

interface WeeklyData {
  name: string;
  atribuidos: number;
  agendados: number;
  convertidos: number;
}

interface SDRWeeklyComparisonChartProps {
  currentWeek: WeeklyData[] | undefined;
  previousWeek: WeeklyData[] | undefined;
  isLoading: boolean;
}

export function SDRWeeklyComparisonChart({
  currentWeek,
  previousWeek,
  isLoading,
}: SDRWeeklyComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!currentWeek || !previousWeek) return [];

    return currentWeek.map((current) => {
      const previous = previousWeek.find((p) => p.name === current.name);
      return {
        name: current.name,
        'Agendados (atual)': current.agendados,
        'Agendados (anterior)': previous?.agendados || 0,
        'Convertidos (atual)': current.convertidos,
        'Convertidos (anterior)': previous?.convertidos || 0,
      };
    });
  }, [currentWeek, previousWeek]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px]" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparação Semanal SDR</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Dados insuficientes para comparação
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Comparação Semanal SDR</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="Agendados (atual)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Agendados (anterior)" fill="hsl(var(--primary)/0.3)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Convertidos (atual)" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Convertidos (anterior)" fill="hsl(var(--success)/0.3)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
