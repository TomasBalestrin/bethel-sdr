import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trash2, Play, Eye, Clock, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatsCard } from '@/components/shared/StatsCard';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  useCleanupLogs,
  useCleanupStats,
  useEligibleLeadsForCleanup,
  useExecuteCleanup,
} from '@/hooks/useCleanupLogs';

export function CleanupConfigTab() {
  const { data: logs, isLoading: logsLoading } = useCleanupLogs();
  const { data: stats, isLoading: statsLoading } = useCleanupStats();
  const { data: eligibleLeads, isLoading: eligibleLoading } = useEligibleLeadsForCleanup();
  const executeCleanup = useExecuteCleanup();

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDryRun = () => {
    executeCleanup.mutate({ dryRun: true });
  };

  const handleExecuteCleanup = () => {
    setConfirmOpen(true);
  };

  const confirmCleanup = () => {
    executeCleanup.mutate({ dryRun: false });
    setConfirmOpen(false);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const getReasonBadge = (reason: string) => {
    if (reason === 'bronze') {
      return <Badge className="bg-amber-600/20 text-amber-700 dark:text-amber-400">Bronze</Badge>;
    }
    return <Badge variant="secondary">Não-Fit</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Arquivados"
          value={statsLoading ? '...' : stats?.totalCleaned || 0}
          icon={Trash2}
          description="Leads removidos"
        />
        <StatsCard
          title="Bronze Removidos"
          value={statsLoading ? '...' : stats?.bronzeCleaned || 0}
          icon={AlertTriangle}
          description="Classificação Bronze"
        />
        <StatsCard
          title="Não-Fit Removidos"
          value={statsLoading ? '...' : stats?.naoFitCleaned || 0}
          icon={AlertTriangle}
          description="Qualificação Não-Fit"
        />
        <StatsCard
          title="Última Limpeza"
          value={statsLoading ? '...' : stats?.lastCleanup ? format(new Date(stats.lastCleanup), 'dd/MM HH:mm') : 'Nunca'}
          icon={Clock}
          description="Data da última execução"
        />
      </div>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Execução Manual
          </CardTitle>
          <CardDescription>
            A limpeza automática ocorre diariamente às 3:00 AM. Use os botões abaixo para execução manual.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleDryRun}
            disabled={executeCleanup.isPending}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview (Dry Run)
          </Button>
          <Button
            variant="destructive"
            onClick={handleExecuteCleanup}
            disabled={executeCleanup.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Executar Limpeza Agora
          </Button>
        </CardContent>
      </Card>

      {/* Eligible Leads Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Leads Elegíveis para Limpeza
          </CardTitle>
          <CardDescription>
            Leads Bronze ou Não-Fit com mais de 24 horas que serão removidos na próxima execução
          </CardDescription>
        </CardHeader>
        <CardContent>
          {eligibleLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : eligibleLeads && eligibleLeads.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Classificação</TableHead>
                    <TableHead>Qualificação</TableHead>
                    <TableHead>Funil</TableHead>
                    <TableHead>Data Criação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eligibleLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.full_name}</TableCell>
                      <TableCell>
                        {lead.classification ? (
                          <Badge className="bg-amber-600/20 text-amber-700 dark:text-amber-400">
                            {lead.classification}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{lead.qualification || '-'}</TableCell>
                      <TableCell>{lead.funnel_name || '-'}</TableCell>
                      <TableCell>{formatDate(lead.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead elegível para limpeza no momento
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Histórico de Limpezas
          </CardTitle>
          <CardDescription>
            Últimas 100 limpezas realizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : logs && logs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Razão</TableHead>
                    <TableHead>Data Limpeza</TableHead>
                    <TableHead>Planilha</TableHead>
                    <TableHead>Aba</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {(log.lead_data as Record<string, unknown>)?.full_name as string || 'Lead removido'}
                      </TableCell>
                      <TableCell>{getReasonBadge(log.cleanup_reason)}</TableCell>
                      <TableCell>{formatDate(log.cleaned_at)}</TableCell>
                      <TableCell>
                        {log.google_sheet_url ? (
                          <a
                            href={log.google_sheet_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Ver planilha
                          </a>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{log.sheet_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma limpeza realizada ainda
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Executar Limpeza"
        description={`Tem certeza que deseja executar a limpeza agora? ${eligibleLeads?.length || 0} leads serão arquivados na planilha e removidos do sistema.`}
        confirmLabel="Executar"
        onConfirm={confirmCleanup}
        variant="destructive"
      />
    </div>
  );
}
