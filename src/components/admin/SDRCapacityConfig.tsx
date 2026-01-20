import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, Users, AlertCircle } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useSDRCapacities, useDeleteSDRCapacity, SDRCapacity } from '@/hooks/useSDRCapacities';
import { SDRCapacityFormModal } from './SDRCapacityFormModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function SDRCapacityConfig() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: allCapacities, isLoading: capacitiesLoading } = useSDRCapacities();
  const deleteCapacity = useDeleteSDRCapacity();

  const [selectedSdrId, setSelectedSdrId] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCapacity, setEditingCapacity] = useState<SDRCapacity | null>(null);
  const [deletingCapacity, setDeletingCapacity] = useState<SDRCapacity | null>(null);

  // Filter SDR users only
  const sdrUsers = users?.filter((u) => u.role === 'sdr' && u.active) || [];

  // Get capacities for selected SDR
  const sdrCapacities = allCapacities?.filter((c) => c.sdr_id === selectedSdrId) || [];

  // Get selected SDR info
  const selectedSdr = sdrUsers.find((u) => u.user_id === selectedSdrId);

  const handleNewCapacity = () => {
    setEditingCapacity(null);
    setIsFormOpen(true);
  };

  const handleEditCapacity = (capacity: SDRCapacity) => {
    setEditingCapacity(capacity);
    setIsFormOpen(true);
  };

  const handleDeleteCapacity = (capacity: SDRCapacity) => {
    setDeletingCapacity(capacity);
  };

  const confirmDelete = () => {
    if (deletingCapacity) {
      deleteCapacity.mutate(deletingCapacity.id);
      setDeletingCapacity(null);
    }
  };

  // Calculate capacity summary per SDR
  const capacitySummary = sdrUsers.map((sdr) => {
    const caps = allCapacities?.filter((c) => c.sdr_id === sdr.user_id && c.active) || [];
    const totalMax = caps.reduce((sum, c) => sum + (c.max_leads || 0), 0);
    const hasPercentage = caps.some((c) => c.percentage !== null);
    return {
      sdr,
      totalCapacities: caps.length,
      totalMaxLeads: totalMax,
      hasPercentage,
    };
  });

  if (usersLoading || capacitiesLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de Capacidades por SDR</CardTitle>
          <CardDescription>
            Visão geral das configurações de capacidade de cada SDR
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sdrUsers.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum SDR ativo encontrado</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {capacitySummary.map(({ sdr, totalCapacities, totalMaxLeads, hasPercentage }) => (
                <div
                  key={sdr.user_id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSdrId === sdr.user_id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedSdrId(sdr.user_id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{sdr.name}</span>
                    {totalCapacities > 0 ? (
                      <Badge variant="outline">{totalCapacities} config.</Badge>
                    ) : (
                      <Badge variant="secondary">Sem config.</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <span>Máx: {totalMaxLeads} leads</span>
                    {hasPercentage && (
                      <span className="ml-2">• % configurado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SDR Selector and Capacities Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div>
              <CardTitle className="text-base">Configurar Capacidades</CardTitle>
              <CardDescription>
                Selecione um SDR para configurar suas capacidades por funil
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedSdrId} onValueChange={setSelectedSdrId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Selecione um SDR" />
                </SelectTrigger>
                <SelectContent>
                  {sdrUsers.map((sdr) => (
                    <SelectItem key={sdr.user_id} value={sdr.user_id}>
                      {sdr.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleNewCapacity} disabled={!selectedSdrId}>
                <Plus className="h-4 w-4 mr-2" />
                Nova
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedSdrId ? (
            <EmptyState
              icon={Users}
              title="Selecione um SDR"
              description="Escolha um SDR acima para ver e configurar suas capacidades"
            />
          ) : sdrCapacities.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhuma capacidade configurada"
              description={`Configure capacidades de leads para ${selectedSdr?.name}`}
              action={{
                label: 'Adicionar Capacidade',
                onClick: handleNewCapacity,
              }}
            />
          ) : (
            <>
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Leads distribuídos <strong>manualmente</strong> não contam para o limite máximo.
                  Apenas distribuições automáticas respeitam esses limites.
                </AlertDescription>
              </Alert>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Funil</TableHead>
                      <TableHead>Máx. Leads</TableHead>
                      <TableHead>Percentual</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sdrCapacities.map((capacity) => (
                      <TableRow key={capacity.id}>
                        <TableCell className="font-medium">
                          {capacity.funnel?.name || 'Geral (todos os funis)'}
                        </TableCell>
                        <TableCell>{capacity.max_leads || '-'}</TableCell>
                        <TableCell>
                          {capacity.percentage !== null
                            ? `${capacity.percentage}%`
                            : 'Igualitário'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={capacity.active ? 'default' : 'secondary'}>
                            {capacity.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCapacity(capacity)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCapacity(capacity)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      {selectedSdrId && selectedSdr && (
        <SDRCapacityFormModal
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          capacity={editingCapacity}
          sdrId={selectedSdrId}
          sdrName={selectedSdr.name}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingCapacity}
        onOpenChange={(open) => !open && setDeletingCapacity(null)}
        title="Excluir Capacidade"
        description={`Tem certeza que deseja excluir esta configuração de capacidade${
          deletingCapacity?.funnel?.name ? ` para o funil "${deletingCapacity.funnel.name}"` : ''
        }?`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
