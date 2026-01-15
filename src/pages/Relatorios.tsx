import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { subDays } from 'date-fns';
import { BarChart3, Users, Phone, Layers, Trophy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useUsersByRole } from '@/hooks/useUsers';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { SDRMetricsCards } from '@/components/reports/SDRMetricsCards';
import { SDRPerformanceChart } from '@/components/reports/SDRPerformanceChart';
import { CloserMetricsCards } from '@/components/reports/CloserMetricsCards';
import { CloserPerformanceChart } from '@/components/reports/CloserPerformanceChart';
import { FunnelComparisonChart } from '@/components/reports/FunnelComparisonChart';
import { FunnelMetricsCards } from '@/components/reports/FunnelMetricsCards';
import { ClassificationPieChart } from '@/components/reports/ClassificationPieChart';
import { RankingTable } from '@/components/reports/RankingTable';
import {
  useSDRStats,
  useCloserStats,
  useFunnelStats,
  useSDRRankings,
  useCloserRankings,
  useAllSDRsPerformance,
  useAllClosersPerformance,
  type DateRange,
} from '@/hooks/useReportsStats';

export default function Relatorios() {
  const { isAdminOrLider, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('sdrs');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedSDR, setSelectedSDR] = useState<string | undefined>();
  const [selectedCloser, setSelectedCloser] = useState<string | undefined>();

  // Fetch users by role
  const { data: sdrs } = useUsersByRole('sdr');
  const { data: closers } = useUsersByRole('closer');

  // Stats hooks
  const { data: sdrStats, isLoading: sdrStatsLoading } = useSDRStats(selectedSDR, dateRange);
  const { data: closerStats, isLoading: closerStatsLoading } = useCloserStats(selectedCloser, dateRange);
  const { data: funnelStats, isLoading: funnelStatsLoading } = useFunnelStats(dateRange);
  const { data: sdrRankings, isLoading: sdrRankingsLoading } = useSDRRankings(dateRange);
  const { data: closerRankings, isLoading: closerRankingsLoading } = useCloserRankings(dateRange);
  const { data: allSDRsPerformance, isLoading: allSDRsLoading } = useAllSDRsPerformance(dateRange);
  const { data: allClosersPerformance, isLoading: allClosersLoading } = useAllClosersPerformance(dateRange);

  // Access protection - only Admin and Lider can access
  if (!authLoading && !isAdminOrLider) {
    return <Navigate to="/" replace />;
  }

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6" />
              Relatórios
            </h1>
            <p className="text-muted-foreground">Análise de performance da equipe</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="sdrs" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">SDRs</span>
            </TabsTrigger>
            <TabsTrigger value="closers" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Closers</span>
            </TabsTrigger>
            <TabsTrigger value="funis" className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Funis</span>
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <span className="hidden sm:inline">Rankings</span>
            </TabsTrigger>
          </TabsList>

          {/* SDRs Tab */}
          <TabsContent value="sdrs" className="space-y-6">
            <ReportFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              users={sdrs}
              selectedUserId={selectedSDR}
              onUserChange={setSelectedSDR}
              userLabel="SDR"
            />

            <SDRMetricsCards metrics={sdrStats} isLoading={sdrStatsLoading} />

            <div className="grid gap-6 lg:grid-cols-2">
              <SDRPerformanceChart data={allSDRsPerformance} isLoading={allSDRsLoading} />
              <ClassificationPieChart 
                data={sdrStats?.classificacaoLeads} 
                isLoading={sdrStatsLoading} 
              />
            </div>
          </TabsContent>

          {/* Closers Tab */}
          <TabsContent value="closers" className="space-y-6">
            <ReportFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              users={closers}
              selectedUserId={selectedCloser}
              onUserChange={setSelectedCloser}
              userLabel="Closer"
            />

            <CloserMetricsCards metrics={closerStats} isLoading={closerStatsLoading} />

            <CloserPerformanceChart data={allClosersPerformance} isLoading={allClosersLoading} />
          </TabsContent>

          {/* Funis Tab */}
          <TabsContent value="funis" className="space-y-6">
            <ReportFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showUserFilter={false}
            />

            <FunnelMetricsCards data={funnelStats} isLoading={funnelStatsLoading} />

            <FunnelComparisonChart data={funnelStats} isLoading={funnelStatsLoading} />
          </TabsContent>

          {/* Rankings Tab */}
          <TabsContent value="rankings" className="space-y-6">
            <ReportFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showUserFilter={false}
            />

            <div className="grid gap-6 md:grid-cols-2">
              {/* SDR Rankings */}
              <RankingTable
                title="SDRs - Taxa de Agendamento"
                description="Ranking por taxa de conversão para agendamento"
                data={sdrRankings?.byAgendamento}
                isLoading={sdrRankingsLoading}
                valueLabel="Taxa"
                valueFormatter={formatPercent}
                secondaryLabel="Agendados"
              />
              <RankingTable
                title="SDRs - Conversões"
                description="Ranking por número de conversões"
                data={sdrRankings?.byConversao}
                isLoading={sdrRankingsLoading}
                valueLabel="Conversões"
                secondaryLabel="Total Leads"
              />

              {/* Closer Rankings */}
              <RankingTable
                title="Closers - Taxa de Conversão"
                description="Ranking por taxa de fechamento"
                data={closerRankings?.byConversao}
                isLoading={closerRankingsLoading}
                valueLabel="Taxa"
                valueFormatter={formatPercent}
                secondaryLabel="Conversões"
              />
              <RankingTable
                title="Closers - Valor Gerado"
                description="Ranking por valor total em vendas"
                data={closerRankings?.byValor}
                isLoading={closerRankingsLoading}
                valueLabel="Valor"
                valueFormatter={formatCurrency}
                secondaryLabel="Conversões"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
