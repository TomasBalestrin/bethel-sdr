import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { subDays } from 'date-fns';
import { BarChart3, Users, Phone, Layers, Trophy } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryErrorState } from '@/components/shared/QueryErrorState';
import { useAuth } from '@/hooks/useAuth';
import { useUsersByRole } from '@/hooks/useUsers';
import { ReportFilters } from '@/components/reports/ReportFilters';
import { ExportButtons } from '@/components/reports/ExportButtons';
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
import {
  exportSDRData,
  exportCloserData,
  exportFunnelData,
} from '@/lib/exportUtils';
import { toast } from 'sonner';

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

  // Stats hooks with error handling
  const { data: sdrStats, isLoading: sdrStatsLoading, isError: sdrStatsError, refetch: refetchSdrStats } = useSDRStats(selectedSDR, dateRange);
  const { data: closerStats, isLoading: closerStatsLoading, isError: closerStatsError, refetch: refetchCloserStats } = useCloserStats(selectedCloser, dateRange);
  const { data: funnelStats, isLoading: funnelStatsLoading, isError: funnelStatsError, refetch: refetchFunnelStats } = useFunnelStats(dateRange);
  const { data: sdrRankings, isLoading: sdrRankingsLoading, isError: sdrRankingsError, refetch: refetchSdrRankings } = useSDRRankings(dateRange);
  const { data: closerRankings, isLoading: closerRankingsLoading, isError: closerRankingsError, refetch: refetchCloserRankings } = useCloserRankings(dateRange);
  const { data: allSDRsPerformance, isLoading: allSDRsLoading, isError: allSDRsError, refetch: refetchAllSDRs } = useAllSDRsPerformance(dateRange);
  const { data: allClosersPerformance, isLoading: allClosersLoading, isError: allClosersError, refetch: refetchAllClosers } = useAllClosersPerformance(dateRange);

  // Unified loading/error per tab
  const sdrTabLoading = sdrStatsLoading || allSDRsLoading;
  const sdrTabError = sdrStatsError || allSDRsError;
  const closerTabLoading = closerStatsLoading || allClosersLoading;
  const closerTabError = closerStatsError || allClosersError;
  const rankingsTabLoading = sdrRankingsLoading || closerRankingsLoading;
  const rankingsTabError = sdrRankingsError || closerRankingsError;

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

  // Export handlers
  const handleExportSDR = (format: 'csv' | 'excel') => {
    if (!allSDRsPerformance) return;
    const exportData = allSDRsPerformance.map(sdr => ({
      ...sdr,
      taxaAgendamento: sdr.atribuidos > 0 ? (sdr.agendados / sdr.atribuidos) * 100 : 0,
    }));
    exportSDRData(exportData, dateRange, format);
  };

  const handleExportCloser = (format: 'csv' | 'excel') => {
    if (!allClosersPerformance) return;
    const exportData = allClosersPerformance.map(closer => ({
      ...closer,
      taxaConversao: closer.realizadas > 0 ? (closer.conversoes / closer.realizadas) * 100 : 0,
    }));
    exportCloserData(exportData, dateRange, format);
  };

  const handleExportFunnel = (format: 'csv' | 'excel') => {
    if (!funnelStats) return;
    exportFunnelData(funnelStats, dateRange, format);
  };

  // PDF Export handlers (lazy-loaded to reduce bundle size)
  const handleExportSDRPDF = async () => {
    if (!allSDRsPerformance) return;
    try {
      const { exportSDRToPDF } = await import('@/lib/pdfExportUtils');
      const pdfData = allSDRsPerformance.map(sdr => ({
        name: sdr.name,
        leadsRecebidos: sdr.atribuidos,
        leadsContatados: sdr.agendados,
        taxaContato: sdr.atribuidos > 0 ? (sdr.agendados / sdr.atribuidos) * 100 : 0,
        agendamentos: sdr.agendados,
        taxaAgendamento: sdr.atribuidos > 0 ? (sdr.agendados / sdr.atribuidos) * 100 : 0,
      }));
      await exportSDRToPDF(pdfData, dateRange);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error(error);
    }
  };

  const handleExportCloserPDF = async () => {
    if (!allClosersPerformance) return;
    try {
      const { exportCloserToPDF } = await import('@/lib/pdfExportUtils');
      const pdfData = allClosersPerformance.map(closer => ({
        name: closer.name,
        agendamentos: closer.agendadas,
        realizadas: closer.realizadas,
        taxaComparecimento: closer.agendadas > 0 ? (closer.realizadas / closer.agendadas) * 100 : 0,
        conversoes: closer.conversoes,
        taxaConversao: closer.realizadas > 0 ? (closer.conversoes / closer.realizadas) * 100 : 0,
        valorTotal: closer.valor,
      }));
      await exportCloserToPDF(pdfData, dateRange);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error(error);
    }
  };

  const handleExportFunnelPDF = async () => {
    if (!funnelStats) return;
    try {
      const { exportFunnelToPDF } = await import('@/lib/pdfExportUtils');
      const pdfData = funnelStats.map(funnel => ({
        name: funnel.name,
        totalLeads: funnel.leads,
        leadsQualificados: funnel.agendamentos,
        agendamentos: funnel.agendamentos,
        conversoes: funnel.conversoes,
        taxaConversao: funnel.taxaConversao,
        valorTotal: funnel.valorGerado,
      }));
      await exportFunnelToPDF(pdfData, dateRange);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar PDF');
      console.error(error);
    }
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
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ReportFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                users={sdrs}
                selectedUserId={selectedSDR}
                onUserChange={setSelectedSDR}
                userLabel="SDR"
              />
              <ExportButtons
                onExportCSV={() => handleExportSDR('csv')}
                onExportExcel={() => handleExportSDR('excel')}
                onExportPDF={handleExportSDRPDF}
                disabled={!allSDRsPerformance || allSDRsPerformance.length === 0}
              />
            </div>

            {sdrTabError ? (
              <QueryErrorState onRetry={() => { refetchSdrStats(); refetchAllSDRs(); }} />
            ) : sdrTabLoading ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                <Skeleton className="h-[300px]" />
              </div>
            ) : (
              <>
                <SDRMetricsCards metrics={sdrStats} isLoading={false} />
                <div className="grid gap-6 lg:grid-cols-2">
                  <SDRPerformanceChart data={allSDRsPerformance} isLoading={false} />
                  <ClassificationPieChart data={sdrStats?.classificacaoLeads} isLoading={false} />
                </div>
              </>
            )}
          </TabsContent>

          {/* Closers Tab */}
          <TabsContent value="closers" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ReportFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                users={closers}
                selectedUserId={selectedCloser}
                onUserChange={setSelectedCloser}
                userLabel="Closer"
              />
              <ExportButtons
                onExportCSV={() => handleExportCloser('csv')}
                onExportExcel={() => handleExportCloser('excel')}
                onExportPDF={handleExportCloserPDF}
                disabled={!allClosersPerformance || allClosersPerformance.length === 0}
              />
            </div>

            {closerTabError ? (
              <QueryErrorState onRetry={() => { refetchCloserStats(); refetchAllClosers(); }} />
            ) : closerTabLoading ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                <Skeleton className="h-[300px]" />
              </div>
            ) : (
              <>
                <CloserMetricsCards metrics={closerStats} isLoading={false} />
                <CloserPerformanceChart data={allClosersPerformance} isLoading={false} />
              </>
            )}
          </TabsContent>

          {/* Funis Tab */}
          <TabsContent value="funis" className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <ReportFilters
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
                showUserFilter={false}
              />
              <ExportButtons
                onExportCSV={() => handleExportFunnel('csv')}
                onExportExcel={() => handleExportFunnel('excel')}
                onExportPDF={handleExportFunnelPDF}
                disabled={!funnelStats || funnelStats.length === 0}
              />
            </div>

            {funnelStatsError ? (
              <QueryErrorState onRetry={() => { refetchFunnelStats(); }} />
            ) : funnelStatsLoading ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                <Skeleton className="h-[300px]" />
              </div>
            ) : (
              <>
                <FunnelMetricsCards data={funnelStats} isLoading={false} />
                <FunnelComparisonChart data={funnelStats} isLoading={false} />
              </>
            )}
          </TabsContent>

          {/* Rankings Tab */}
          <TabsContent value="rankings" className="space-y-6">
            <ReportFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              showUserFilter={false}
            />

            {rankingsTabError ? (
              <QueryErrorState onRetry={() => { refetchSdrRankings(); refetchCloserRankings(); }} />
            ) : rankingsTabLoading ? (
              <div className="grid gap-6 md:grid-cols-2">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-64" />)}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <RankingTable
                  title="SDRs - Taxa de Agendamento"
                  description="Ranking por taxa de conversão para agendamento"
                  data={sdrRankings?.byAgendamento}
                  isLoading={false}
                  valueLabel="Taxa"
                  valueFormatter={formatPercent}
                  secondaryLabel="Agendados"
                />
                <RankingTable
                  title="SDRs - Conversões"
                  description="Ranking por número de conversões"
                  data={sdrRankings?.byConversao}
                  isLoading={false}
                  valueLabel="Conversões"
                  secondaryLabel="Total Leads"
                />
                <RankingTable
                  title="Closers - Taxa de Conversão"
                  description="Ranking por taxa de fechamento"
                  data={closerRankings?.byConversao}
                  isLoading={false}
                  valueLabel="Taxa"
                  valueFormatter={formatPercent}
                  secondaryLabel="Conversões"
                />
                <RankingTable
                  title="Closers - Valor Gerado"
                  description="Ranking por valor total em vendas"
                  data={closerRankings?.byValor}
                  isLoading={false}
                  valueLabel="Valor"
                  valueFormatter={formatCurrency}
                  secondaryLabel="Conversões"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
