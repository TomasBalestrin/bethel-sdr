import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend,
  className,
  iconClassName
}: StatsCardProps) {
  return (
    <Card className={cn(
      'relative overflow-hidden border-border/50 hover:border-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5',
      className
    )}>
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-transparent pointer-events-none" />
      
      <CardContent className="relative pt-6 pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight text-foreground">{value}</p>
            
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            
            {trend && (
              <div className={cn(
                'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold',
                trend.isPositive 
                  ? 'bg-success/10 text-success' 
                  : 'bg-destructive/10 text-destructive'
              )}>
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
                <span className="text-muted-foreground font-normal">vs anterior</span>
              </div>
            )}
          </div>
          
          <div className={cn(
            'flex-shrink-0 rounded-xl p-3 bg-primary/10',
            iconClassName
          )}>
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}