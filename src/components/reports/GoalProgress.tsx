import { Target, TrendingUp, Calendar, DollarSign, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoalProgress } from '@/hooks/useGoals';
import { cn } from '@/lib/utils';
import type { GoalMetric, GoalPeriod } from '@/types/database';

const METRIC_CONFIG: Record<GoalMetric, { label: string; icon: typeof Target; format: (v: number) => string }> = {
  agendamentos: {
    label: 'Agendamentos',
    icon: Calendar,
    format: (v) => String(Math.round(v)),
  },
  conversoes: {
    label: 'Conversões',
    icon: TrendingUp,
    format: (v) => String(Math.round(v)),
  },
  valor_gerado: {
    label: 'Valor Gerado',
    icon: DollarSign,
    format: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
  },
  leads_contatados: {
    label: 'Leads Contatados',
    icon: Users,
    format: (v) => String(Math.round(v)),
  },
};

const PERIOD_LABELS: Record<GoalPeriod, string> = {
  diario: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
};

interface GoalProgressProps {
  userId: string;
  className?: string;
}

export function GoalProgress({ userId, className }: GoalProgressProps) {
  const { data: goals, isLoading } = useGoalProgress(userId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!goals || goals.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-5 w-5" />
            Metas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma meta definida para o período atual
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5" />
          Metas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const config = METRIC_CONFIG[goal.metric as GoalMetric];
          if (!config) return null;

          const Icon = config.icon;
          const progress = goal.progress ?? 0;
          const isAchieved = progress >= 100;

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{config.label}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {PERIOD_LABELS[goal.period as GoalPeriod]}
                  </Badge>
                </div>
                <span className={cn(
                  'text-sm font-semibold',
                  isAchieved ? 'text-success' : 'text-foreground'
                )}>
                  {config.format(goal.current_value)} / {config.format(goal.target_value)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Progress
                  value={Math.min(progress, 100)}
                  className={cn(
                    'h-2',
                    isAchieved && '[&>div]:bg-success'
                  )}
                />
                <span className={cn(
                  'text-xs font-medium min-w-[3rem] text-right',
                  isAchieved ? 'text-success' : progress >= 75 ? 'text-warning' : 'text-muted-foreground'
                )}>
                  {progress.toFixed(0)}%
                </span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
