import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Users, 
  Share2, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  Filter,
  X,
  RefreshCw
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { ClassificationBadge } from '@/components/shared/StatusBadge';
import { LeadFilters } from '@/components/leader/LeadFilters';
import { LeadCard } from '@/components/leader/LeadCard';
import { 
  useLeaderDashboard, 
  useLeaderDashboardStats,
  LeaderDashboardFilters 
} from '@/hooks/useLeaderDashboard';
import { useQueryClient } from '@tanstack/react-query';

export default function LeaderDashboard() {
  const [filters, setFilters] = useState<LeaderDashboardFilters>({
    distributionStatus: 'all',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: dashboardData, isLoading, isFetching } = useLeaderDashboard(filters);
  const { data: stats } = useLeaderDashboardStats();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['leader-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['leader-dashboard-stats'] });
  };

  const clearFilters = () => {
    setFilters({ distributionStatus: 'all' });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'distributionStatus' && value === 'all') return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== '';
  });

  const activeFilterCount = Object.entries(filters).reduce((count, [key, value]) => {
    if (key === 'distributionStatus' && value !== 'all') return count + 1;
    if (Array.isArray(value) && value.length > 0) return count + 1;
    if (value !== undefined && value !== '' && key !== 'distributionStatus') return count + 1;
    return count;
  }, 0);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard de Leads</h1>
            <p className="text-muted-foreground">Visão geral e gestão de leads</p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
              <div className="stats-icon-bg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">leads no sistema</p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Distribuídos</CardTitle>
              <div className="stats-icon-bg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats?.distributed || 0}
              </div>
              <p className="text-xs text-muted-foreground">leads atribuídos</p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Não Distribuídos</CardTitle>
              <div className="stats-icon-bg bg-orange-100 dark:bg-orange-900/30">
                <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats?.notDistributed || 0}
              </div>
              <p className="text-xs text-muted-foreground">aguardando atribuição</p>
            </CardContent>
          </Card>

          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <div className="stats-icon-bg bg-blue-100 dark:bg-blue-900/30">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.today || 0}
              </div>
              <p className="text-xs text-muted-foreground">leads recebidos hoje</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters Panel */}
        {filtersOpen && (
          <LeadFilters filters={filters} onFiltersChange={setFilters} />
        )}

        {/* Leads Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : dashboardData?.leads && dashboardData.leads.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Exibindo {dashboardData.leads.length} leads
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhum lead encontrado"
            description="Não há leads que correspondam aos filtros selecionados."
          />
        )}
      </div>
    </AppLayout>
  );
}
