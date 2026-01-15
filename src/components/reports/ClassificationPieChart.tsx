import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ClassificationData {
  diamante: number;
  ouro: number;
  prata: number;
  bronze: number;
}

interface ClassificationPieChartProps {
  data?: ClassificationData;
  isLoading?: boolean;
}

const chartConfig = {
  diamante: {
    label: 'Diamante',
    color: 'hsl(var(--diamante))',
  },
  ouro: {
    label: 'Ouro',
    color: 'hsl(var(--ouro))',
  },
  prata: {
    label: 'Prata',
    color: 'hsl(var(--prata))',
  },
  bronze: {
    label: 'Bronze',
    color: 'hsl(var(--bronze))',
  },
};

const COLORS = [
  'hsl(var(--diamante))',
  'hsl(var(--ouro))',
  'hsl(var(--prata))',
  'hsl(var(--bronze))',
];

export function ClassificationPieChart({ data, isLoading }: ClassificationPieChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classificação de Leads</CardTitle>
          <CardDescription>Carregando...</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="animate-pulse bg-muted rounded-full w-48 h-48" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data ? [
    { name: 'Diamante', value: data.diamante },
    { name: 'Ouro', value: data.ouro },
    { name: 'Prata', value: data.prata },
    { name: 'Bronze', value: data.bronze },
  ].filter(item => item.value > 0) : [];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Classificação de Leads</CardTitle>
          <CardDescription>Distribuição por classificação</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nenhum lead classificado no período
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Classificação de Leads</CardTitle>
        <CardDescription>Distribuição por classificação ({total} leads)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[['Diamante', 'Ouro', 'Prata', 'Bronze'].indexOf(entry.name)]} 
                  />
                ))}
              </Pie>
              <Tooltip content={<ChartTooltipContent />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
