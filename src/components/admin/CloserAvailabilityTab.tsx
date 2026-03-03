import { useState } from 'react';
import { Clock, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useCloserAvailability, useUpsertCloserAvailability, useDeleteCloserAvailability } from '@/hooks/useCloserAvailability';
import { useUsersByRole } from '@/hooks/useUsers';
import type { CloserAvailability } from '@/types/database';

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function CloserAvailabilityTab() {
  const [selectedCloserId, setSelectedCloserId] = useState<string>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<Partial<CloserAvailability> & { _isNew?: boolean } | null>(null);

  const { data: closers } = useUsersByRole('closer');
  const { data: availability, isLoading } = useCloserAvailability(
    selectedCloserId !== 'all' ? selectedCloserId : undefined
  );
  const upsertAvailability = useUpsertCloserAvailability();
  const deleteAvailability = useDeleteCloserAvailability();

  const handleAddSlot = () => {
    if (selectedCloserId === 'all' && closers && closers.length > 0) {
      setEditingSlot({
        _isNew: true,
        closer_id: closers[0].user_id,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '18:00',
        break_start: '12:00',
        break_end: '13:00',
        active: true,
      });
    } else {
      setEditingSlot({
        _isNew: true,
        closer_id: selectedCloserId,
        day_of_week: 1,
        start_time: '09:00',
        end_time: '18:00',
        break_start: '12:00',
        break_end: '13:00',
        active: true,
      });
    }
  };

  const handleSaveSlot = async () => {
    if (!editingSlot || !editingSlot.closer_id) return;

    await upsertAvailability.mutateAsync({
      id: editingSlot._isNew ? undefined : editingSlot.id,
      closer_id: editingSlot.closer_id,
      day_of_week: editingSlot.day_of_week ?? 1,
      start_time: editingSlot.start_time ?? '09:00',
      end_time: editingSlot.end_time ?? '18:00',
      break_start: editingSlot.break_start ?? null,
      break_end: editingSlot.break_end ?? null,
      active: editingSlot.active ?? true,
    });
    setEditingSlot(null);
  };

  const handleEditSlot = (slot: CloserAvailability) => {
    setEditingSlot({ ...slot, _isNew: false });
  };

  const handleDeleteSlot = (id: string) => {
    setSlotToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (slotToDelete) {
      deleteAvailability.mutate(slotToDelete);
    }
    setDeleteConfirmOpen(false);
    setSlotToDelete(null);
  };

  const getCloserName = (closerId: string) => {
    return closers?.find(c => c.user_id === closerId)?.name || closerId;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Disponibilidade dos Closers
              </CardTitle>
              <CardDescription>
                Configure os horários disponíveis para agendamento de calls
              </CardDescription>
            </div>
            <Button onClick={handleAddSlot}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Horário
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Closer Filter */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">Filtrar por Closer:</span>
            <Select value={selectedCloserId} onValueChange={setSelectedCloserId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Selecione um closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Closers</SelectItem>
                {closers?.map((closer) => (
                  <SelectItem key={closer.user_id} value={closer.user_id}>
                    {closer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Editing Form */}
          {editingSlot && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 items-end">
                  {selectedCloserId === 'all' && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium">Closer</label>
                      <Select
                        value={editingSlot.closer_id || ''}
                        onValueChange={(v) => setEditingSlot({ ...editingSlot, closer_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {closers?.map((c) => (
                            <SelectItem key={c.user_id} value={c.user_id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Dia</label>
                    <Select
                      value={String(editingSlot.day_of_week ?? 1)}
                      onValueChange={(v) => setEditingSlot({ ...editingSlot, day_of_week: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAY_LABELS.map((label, i) => (
                          <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Início</label>
                    <Input
                      type="time"
                      value={editingSlot.start_time || '09:00'}
                      onChange={(e) => setEditingSlot({ ...editingSlot, start_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Fim</label>
                    <Input
                      type="time"
                      value={editingSlot.end_time || '18:00'}
                      onChange={(e) => setEditingSlot({ ...editingSlot, end_time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Pausa Início</label>
                    <Input
                      type="time"
                      value={editingSlot.break_start || ''}
                      onChange={(e) => setEditingSlot({ ...editingSlot, break_start: e.target.value || null })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Pausa Fim</label>
                    <Input
                      type="time"
                      value={editingSlot.break_end || ''}
                      onChange={(e) => setEditingSlot({ ...editingSlot, break_end: e.target.value || null })}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveSlot} disabled={upsertAvailability.isPending}>
                      {upsertAvailability.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingSlot(null)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Availability Table */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Closer</TableHead>
                    <TableHead>Dia</TableHead>
                    <TableHead>Horário</TableHead>
                    <TableHead>Pausa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability?.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell className="font-medium">{getCloserName(slot.closer_id)}</TableCell>
                      <TableCell>{DAY_LABELS[slot.day_of_week]}</TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">{slot.start_time} - {slot.end_time}</span>
                      </TableCell>
                      <TableCell>
                        {slot.break_start && slot.break_end ? (
                          <span className="font-mono text-sm text-muted-foreground">
                            {slot.break_start} - {slot.break_end}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={slot.active ? 'default' : 'secondary'}>
                          {slot.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditSlot(slot)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSlot(slot.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!availability || availability.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma disponibilidade configurada
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Excluir Disponibilidade"
        description="Tem certeza que deseja excluir este horário? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
