import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDistributionLogs } from '@/hooks/useDistributionRules';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { History } from 'lucide-react';

interface DistributionLogsTableProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DistributionLogsTable({ open, onOpenChange }: DistributionLogsTableProps) {
  const { data: logs, isLoading } = useDistributionLogs();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Histórico de Distribuições</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : logs && logs.length > 0 ? (
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Regra/Funil</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>SDRs</TableHead>
                  <TableHead>Executado por</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={log.distribution_mode === 'automatic' ? 'default' : 'secondary'}>
                        {log.distribution_mode === 'automatic' ? 'Automático' : 'Manual'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.rule?.name || log.funnel?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.leads_count}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.sdr_ids?.length || 0} SDRs</Badge>
                    </TableCell>
                    <TableCell>
                      {log.distributor?.name || 'Sistema'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          <EmptyState
            icon={History}
            title="Nenhum registro"
            description="O histórico de distribuições aparecerá aqui"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
