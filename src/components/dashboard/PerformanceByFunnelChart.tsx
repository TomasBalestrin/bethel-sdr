import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePerformanceByFunnel } from '@/hooks/useDashboardStats';
import { Skeleton } from '@/components/ui/skeleton';

export function PerformanceByFunnelChart() {
  const { data, isLoading } = usePerformanceByFunnel();

  if (isLoading) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Performance por Funil</CardTitle>
          <CardDescription>Comparativo entre funis ativos</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle>Performance por Funil</CardTitle>
          <CardDescription>Comparativo entre funis ativos</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          Nenhum funil ativo cadastrado
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Performance por Funil</CardTitle>
        <CardDescription>Comparativo entre funis ativos</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis 
              dataKey="name" 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-xs fill-muted-foreground"
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend />
            <Bar 
              dataKey="leads" 
              name="Leads" 
              fill="hsl(var(--primary))" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="agendamentos" 
              name="Agendamentos" 
              fill="hsl(var(--warning))" 
              radius={[4, 4, 0, 0]} 
            />
            <Bar 
              dataKey="conversoes" 
              name="Conversões" 
              fill="hsl(var(--success))" 
              radius={[4, 4, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
