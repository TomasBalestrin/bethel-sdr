import { useState } from 'react';
import { Plus, Trash2, Tag, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useNiches, useCreateNiche, useDeleteNiche } from '@/hooks/useNiches';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function NichesTab() {
  const [newNicheName, setNewNicheName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [nicheToDelete, setNicheToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: niches, isLoading } = useNiches();
  const createNiche = useCreateNiche();
  const deleteNiche = useDeleteNiche();

  const handleCreate = async () => {
    if (!newNicheName.trim()) return;
    await createNiche.mutateAsync(newNicheName.trim());
    setNewNicheName('');
  };

  const handleDelete = (id: string, name: string) => {
    setNicheToDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (nicheToDelete) {
      deleteNiche.mutate(nicheToDelete.id);
    }
    setDeleteConfirmOpen(false);
    setNicheToDelete(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gerenciar Nichos
          </CardTitle>
          <CardDescription>
            Adicione, visualize e desative nichos de atuação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Niche */}
          <div className="flex gap-2">
            <Input
              placeholder="Nome do novo nicho..."
              value={newNicheName}
              onChange={(e) => setNewNicheName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="max-w-sm"
            />
            <Button onClick={handleCreate} disabled={createNiche.isPending || !newNicheName.trim()}>
              {createNiche.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar
            </Button>
          </div>

          {/* Niches Table */}
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {niches?.map((niche) => (
                    <TableRow key={niche.id}>
                      <TableCell className="font-medium">{niche.name}</TableCell>
                      <TableCell>
                        <Badge variant={niche.active ? 'default' : 'secondary'}>
                          {niche.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(niche.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(niche.id, niche.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!niches || niches.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhum nicho cadastrado
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
        title="Desativar Nicho"
        description={`Tem certeza que deseja desativar o nicho "${nicheToDelete?.name}"? Leads existentes não serão afetados.`}
        confirmLabel="Desativar"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
