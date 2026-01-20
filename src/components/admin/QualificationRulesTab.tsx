import { useState } from 'react';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { QualificationRuleFormModal } from './QualificationRuleFormModal';
import { 
  useQualificationRules, 
  useDeleteQualificationRule, 
  useToggleQualificationRule,
  QualificationRuleWithFunnel
} from '@/hooks/useQualificationRules';
import { useFunnels } from '@/hooks/useFunnels';
import { ClassificationBadge } from '@/components/shared/StatusBadge';

const OPERATOR_LABELS: Record<string, string> = {
  equals: '=',
  not_equals: '≠',
  greater_than: '>',
  less_than: '<',
  contains: 'contém',
  not_contains: 'não contém',
};

export function QualificationRulesTab() {
  const [selectedFunnelId, setSelectedFunnelId] = useState<string>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<QualificationRuleWithFunnel | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<QualificationRuleWithFunnel | null>(null);

  const { data: funnels } = useFunnels();
  const { data: rules, isLoading } = useQualificationRules(
    selectedFunnelId !== 'all' ? selectedFunnelId : undefined
  );
  const deleteRule = useDeleteQualificationRule();
  const toggleRule = useToggleQualificationRule();

  const handleNewRule = () => {
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleEditRule = (rule: QualificationRuleWithFunnel) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleDeleteRule = (rule: QualificationRuleWithFunnel) => {
    setRuleToDelete(rule);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (ruleToDelete) {
      deleteRule.mutate(ruleToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setRuleToDelete(null);
  };

  const formatConditions = (conditions: any[]) => {
    if (!conditions || conditions.length === 0) return 'Sem condições';
    return conditions.map((c, i) => (
      <span key={i} className="inline-flex items-center gap-1 text-xs">
        {i > 0 && <span className="text-muted-foreground mx-1">{c.logic || 'E'}</span>}
        <Badge variant="outline" className="text-xs">
          {c.field} {OPERATOR_LABELS[c.operator] || c.operator} {c.value}
        </Badge>
      </span>
    ));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Regras de Qualificação
              </CardTitle>
              <CardDescription>
                Configure regras automáticas para qualificar e classificar leads por funil
              </CardDescription>
            </div>
            <Button onClick={handleNewRule}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Funnel Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filtrar por Funil:</span>
            <Select value={selectedFunnelId} onValueChange={setSelectedFunnelId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione um funil" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Funis</SelectItem>
                {funnels?.map((funnel) => (
                  <SelectItem key={funnel.id} value={funnel.id}>
                    {funnel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info Alert */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Regras são aplicadas por ordem de prioridade</p>
              <p className="text-blue-600 dark:text-blue-400">
                A primeira regra que corresponder às condições será aplicada ao lead. 
                Leads classificados como "Bronze" ou "Não-Fit" podem ser removidos automaticamente.
              </p>
            </div>
          </div>

          {/* Rules Table */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Prior.</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Funil</TableHead>
                    <TableHead>Condições</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules?.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell>
                        <Badge variant="outline">{rule.priority}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{rule.rule_name}</TableCell>
                      <TableCell>
                        {rule.funnel?.name || (
                          <span className="text-muted-foreground">Todos</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {formatConditions(rule.conditions)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="text-sm">{rule.qualification_label}</span>
                          {rule.classification && (
                            <ClassificationBadge classification={rule.classification as any} />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.active ? 'default' : 'secondary'}>
                          {rule.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleRule.mutate({ id: rule.id, active: !rule.active })}
                            title={rule.active ? 'Desativar' : 'Ativar'}
                          >
                            {rule.active ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditRule(rule)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRule(rule)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!rules || rules.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma regra de qualificação configurada
                        {selectedFunnelId !== 'all' && ' para este funil'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal */}
      <QualificationRuleFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        rule={editingRule}
        defaultFunnelId={selectedFunnelId !== 'all' ? selectedFunnelId : undefined}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir Regra"
        description={`Tem certeza que deseja excluir a regra "${ruleToDelete?.rule_name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
