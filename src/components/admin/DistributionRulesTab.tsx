import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Play, Plus, History, Users } from 'lucide-react';
import { useDistributionRules, useToggleDistributionRule, useDeleteDistributionRule, useExecuteDistribution, DistributionRule } from '@/hooks/useDistributionRules';
import { DistributionRuleFormModal } from './DistributionRuleFormModal';
import { ManualDistributionModal } from './ManualDistributionModal';
import { DistributionLogsTable } from './DistributionLogsTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';

const CLASSIFICATION_LABELS: Record<string, string> = {
  diamante: 'Diamante',
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
};

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function DistributionRulesTab() {
  const { data: rules, isLoading } = useDistributionRules();
  const toggleRule = useToggleDistributionRule();
  const deleteRule = useDeleteDistributionRule();
  const executeDistribution = useExecuteDistribution();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DistributionRule | null>(null);
  const [deletingRule, setDeletingRule] = useState<DistributionRule | null>(null);
  const [executingRuleId, setExecutingRuleId] = useState<string | null>(null);

  const handleEdit = (rule: DistributionRule) => {
    setEditingRule(rule);
    setIsFormOpen(true);
  };

  const handleDelete = (rule: DistributionRule) => {
    setDeletingRule(rule);
  };

  const confirmDelete = () => {
    if (deletingRule) {
      deleteRule.mutate(deletingRule.id);
      setDeletingRule(null);
    }
  };

  const handleExecute = async (rule: DistributionRule) => {
    setExecutingRuleId(rule.id);
    try {
      await executeDistribution.mutateAsync({ ruleId: rule.id });
    } finally {
      setExecutingRuleId(null);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingRule(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-10 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Regras de Distribuição</h2>
          <p className="text-sm text-muted-foreground">
            Configure regras para distribuição automática de leads entre SDRs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsLogsOpen(true)}>
            <History className="h-4 w-4 mr-2" />
            Histórico
          </Button>
          <Button variant="outline" onClick={() => setIsManualOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            Distribuir Agora
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Regra
          </Button>
        </div>
      </div>

      {rules && rules.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Funil</TableHead>
                <TableHead>Classificações</TableHead>
                <TableHead>SDRs</TableHead>
                <TableHead>Máx/SDR</TableHead>
                <TableHead>Agendamento</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    {rule.funnel?.name || (
                      <span className="text-muted-foreground">Todos</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {rule.classifications && rule.classifications.length > 0 ? (
                      <div className="flex gap-1 flex-wrap">
                        {rule.classifications.map((c) => (
                          <Badge key={c} variant="secondary" className="text-xs">
                            {CLASSIFICATION_LABELS[c] || c}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Todas</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{rule.sdr_ids.length} SDRs</Badge>
                  </TableCell>
                  <TableCell>{rule.max_leads_per_sdr}</TableCell>
                  <TableCell>
                    {rule.schedule_enabled ? (
                      <div className="text-sm">
                        <div className="flex gap-1 flex-wrap">
                          {rule.schedule_days.map((d) => (
                            <Badge key={d} variant="secondary" className="text-xs">
                              {DAY_LABELS[d]}
                            </Badge>
                          ))}
                        </div>
                        <span className="text-muted-foreground">
                          às {rule.schedule_time?.slice(0, 5)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Manual</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(active) => toggleRule.mutate({ id: rule.id, active })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleExecute(rule)}
                        disabled={!rule.active || executingRuleId === rule.id}
                        title="Executar agora"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(rule)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(rule)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="Nenhuma regra configurada"
          description="Crie regras para distribuir leads automaticamente entre SDRs"
          action={{
            label: 'Criar Regra',
            onClick: () => setIsFormOpen(true),
          }}
        />
      )}

      <DistributionRuleFormModal
        open={isFormOpen}
        onOpenChange={handleCloseForm}
        rule={editingRule}
      />

      <ManualDistributionModal
        open={isManualOpen}
        onOpenChange={setIsManualOpen}
      />

      <DistributionLogsTable
        open={isLogsOpen}
        onOpenChange={setIsLogsOpen}
      />

      <ConfirmDialog
        open={!!deletingRule}
        onOpenChange={(open) => !open && setDeletingRule(null)}
        title="Excluir Regra"
        description={`Tem certeza que deseja excluir a regra "${deletingRule?.name}"?`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
