import { useState } from 'react';
import { useFunnels } from '@/hooks/useFunnels';
import { useSyncFunnelWithProgress, useSyncAllFunnels, useUpdateLeadDates } from '@/hooks/useSheetSync';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Loader2,
  CalendarClock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function SyncStatusPanel() {
  const { data: funnels, isLoading } = useFunnels();
  const { syncFunnel, progress } = useSyncFunnelWithProgress();
  const syncAllFunnels = useSyncAllFunnels();
  const { updateDates, progress: updateProgress } = useUpdateLeadDates();
  const [syncingFunnelId, setSyncingFunnelId] = useState<string | null>(null);
  const [updatingFunnelId, setUpdatingFunnelId] = useState<string | null>(null);

  const funnelsWithSheets = funnels?.filter(
    (f) => f.google_sheet_url && f.sheet_name
  ) || [];

  const handleSyncFunnel = async (funnelId: string) => {
    setSyncingFunnelId(funnelId);
    try {
      await syncFunnel(funnelId);
    } finally {
      setSyncingFunnelId(null);
    }
  };

  const handleSyncAll = async () => {
    await syncAllFunnels.mutateAsync();
  };

  const handleUpdateDates = async (funnelId: string) => {
    setUpdatingFunnelId(funnelId);
    try {
      await updateDates(funnelId);
    } finally {
      setUpdatingFunnelId(null);
    }
  };

  const getSyncStatus = (funnel: typeof funnelsWithSheets[0]) => {
    if (!funnel.column_mapping || Object.keys(funnel.column_mapping).length === 0) {
      return { status: 'not-configured', label: 'Não configurado', color: 'secondary' };
    }
    if (!funnel.auto_sync_enabled) {
      return { status: 'manual', label: 'Sincronização manual', color: 'outline' };
    }
    return { status: 'auto', label: 'Sincronização automática', color: 'default' };
  };

  const getProgressPercentage = () => {
    if (!progress.isActive || progress.totalRows === 0) return 0;
    return Math.round((progress.processedRows / progress.totalRows) * 100);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Sincronização de Leads</CardTitle>
            <CardDescription>
              Gerencie a importação de leads das planilhas Google Sheets
            </CardDescription>
          </div>
          <Button
            onClick={handleSyncAll}
            disabled={syncAllFunnels.isPending || funnelsWithSheets.length === 0 || progress.isActive}
          >
            {syncAllFunnels.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sincronizar Todos
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress indicator */}
        {progress.isActive && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Importando leads...</span>
              <span className="text-muted-foreground">
                {progress.processedRows.toLocaleString()} / {progress.totalRows.toLocaleString()} linhas
              </span>
            </div>
            <Progress value={getProgressPercentage()} className="h-2" />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {progress.imported} importados
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-yellow-500" />
                {progress.skipped} duplicados
              </span>
            </div>
          </div>
        )}

        {/* Update dates progress indicator */}
        {updateProgress.isActive && (
          <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Atualizando datas dos formulários...</span>
              <span className="text-muted-foreground">
                {updateProgress.processedRows.toLocaleString()} / {updateProgress.totalRows.toLocaleString()} linhas
              </span>
            </div>
            <Progress value={updateProgress.totalRows > 0 ? Math.round((updateProgress.processedRows / updateProgress.totalRows) * 100) : 0} className="h-2" />
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3 text-primary" />
                {updateProgress.updated} datas atualizadas
              </span>
            </div>
          </div>
        )}

        {funnelsWithSheets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Nenhum funil configurado</p>
            <p className="text-sm">
              Configure uma planilha Google Sheets em um funil para começar a importar leads automaticamente.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funil</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Sincronização</TableHead>
                <TableHead>Planilha</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnelsWithSheets.map((funnel) => {
                const syncStatus = getSyncStatus(funnel);
                const isSyncing = syncingFunnelId === funnel.id || (progress.isActive && progress.funnelId === funnel.id);
                const isUpdating = updatingFunnelId === funnel.id || (updateProgress.isActive && updateProgress.funnelId === funnel.id);
                const anyActive = progress.isActive || updateProgress.isActive;

                return (
                  <TableRow key={funnel.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {funnel.active ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{funnel.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={syncStatus.color as "default" | "secondary" | "outline"}>
                        {syncStatus.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {funnel.last_sync_at ? (
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(funnel.last_sync_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={funnel.google_sheet_url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {funnel.sheet_name}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Atualizar datas dos formulários"
                          onClick={() => handleUpdateDates(funnel.id)}
                          disabled={isUpdating || syncStatus.status === 'not-configured' || anyActive || !funnel.column_mapping?.date_column}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CalendarClock className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Sincronizar leads"
                          onClick={() => handleSyncFunnel(funnel.id)}
                          disabled={isSyncing || syncStatus.status === 'not-configured' || anyActive}
                        >
                          {isSyncing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
