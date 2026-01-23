import { useState } from 'react';
import { Users, Workflow, Columns, Pencil, Trash2, Plus, Share2, Scale } from 'lucide-react';
import { SyncStatusPanel } from '@/components/admin/SyncStatusPanel';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useUsers, useToggleUserActive } from '@/hooks/useUsers';
import { useFunnels, useDeleteFunnel } from '@/hooks/useFunnels';
import { useCRMColumns, useDeleteCRMColumn } from '@/hooks/useCRMColumns';
import { RoleBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { UserFormModal } from '@/components/admin/UserFormModal';
import { FunnelFormModal } from '@/components/admin/FunnelFormModal';
import { CRMColumnFormModal } from '@/components/admin/CRMColumnFormModal';
import { DistributionRulesTab } from '@/components/admin/DistributionRulesTab';
import { QualificationRulesTab } from '@/components/admin/QualificationRulesTab';
import { CleanupConfigTab } from '@/components/admin/CleanupConfigTab';
import type { ProfileWithRole, Funnel, CrmColumn } from '@/types/database';

export default function Admin() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: funnels, isLoading: funnelsLoading } = useFunnels();
  const { data: columns, isLoading: columnsLoading } = useCRMColumns();

  const toggleUserActive = useToggleUserActive();
  const deleteFunnel = useDeleteFunnel();
  const deleteColumn = useDeleteCRMColumn();

  // User modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ProfileWithRole | null>(null);

  // Funnel modal state
  const [funnelModalOpen, setFunnelModalOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<Funnel | null>(null);

  // Column modal state
  const [columnModalOpen, setColumnModalOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<CrmColumn | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'funnel' | 'column'; id: string; name: string } | null>(null);

  const handleNewUser = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: ProfileWithRole) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const handleNewFunnel = () => {
    setEditingFunnel(null);
    setFunnelModalOpen(true);
  };

  const handleEditFunnel = (funnel: Funnel) => {
    setEditingFunnel(funnel);
    setFunnelModalOpen(true);
  };

  const handleDeleteFunnel = (funnel: Funnel) => {
    setDeleteTarget({ type: 'funnel', id: funnel.id, name: funnel.name });
    setDeleteConfirmOpen(true);
  };

  const handleNewColumn = () => {
    setEditingColumn(null);
    setColumnModalOpen(true);
  };

  const handleEditColumn = (column: CrmColumn) => {
    setEditingColumn(column);
    setColumnModalOpen(true);
  };

  const handleDeleteColumn = (column: CrmColumn) => {
    setDeleteTarget({ type: 'column', id: column.id, name: column.name });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    if (deleteTarget.type === 'funnel') {
      deleteFunnel.mutate(deleteTarget.id);
    } else {
      deleteColumn.mutate(deleteTarget.id);
    }
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administração</h1>
          <p className="text-muted-foreground">Gerencie configurações do sistema</p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="funnels" className="gap-2">
              <Workflow className="h-4 w-4" />
              Funis
            </TabsTrigger>
            <TabsTrigger value="columns" className="gap-2">
              <Columns className="h-4 w-4" />
              Colunas CRM
            </TabsTrigger>
            <TabsTrigger value="distribution" className="gap-2">
              <Share2 className="h-4 w-4" />
              Distribuição
            </TabsTrigger>
            <TabsTrigger value="qualification" className="gap-2">
              <Scale className="h-4 w-4" />
              Qualificação
            </TabsTrigger>
            <TabsTrigger value="cleanup" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Limpeza
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNewUser}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Usuário
              </Button>
            </div>
            {usersLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role && <RoleBadge role={user.role} />}</TableCell>
                        <TableCell>
                          <Badge variant={user.active ? 'default' : 'secondary'}>
                            {user.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditUser(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleUserActive.mutate({ id: user.id, active: !user.active })}
                            >
                              {user.active ? 'Desativar' : 'Ativar'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!users || users.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum usuário cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Funnels Tab */}
          <TabsContent value="funnels" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNewFunnel}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funil
              </Button>
            </div>
            {funnelsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Google Sheets</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funnels?.map((funnel) => (
                      <TableRow key={funnel.id}>
                        <TableCell className="font-medium">{funnel.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {funnel.google_sheet_url || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={funnel.active ? 'default' : 'secondary'}>
                            {funnel.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditFunnel(funnel)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteFunnel(funnel)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!funnels || funnels.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum funil cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Sync Status Panel */}
            <SyncStatusPanel />
          </TabsContent>

          {/* Columns Tab */}
          <TabsContent value="columns" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNewColumn}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Coluna
              </Button>
            </div>
            {columnsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Posição</TableHead>
                      <TableHead>Editável</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns?.map((column) => (
                      <TableRow key={column.id}>
                        <TableCell>
                          <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: column.color }} />
                        </TableCell>
                        <TableCell className="font-medium">{column.name}</TableCell>
                        <TableCell>{column.position}</TableCell>
                        <TableCell>
                          <Badge variant={column.editable ? 'default' : 'secondary'}>
                            {column.editable ? 'Sim' : 'Não'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditColumn(column)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteColumn(column)}
                              disabled={!column.editable}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!columns || columns.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhuma coluna cadastrada
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          {/* Distribution Tab */}
          <TabsContent value="distribution">
            <DistributionRulesTab />
          </TabsContent>

          {/* Qualification Tab */}
          <TabsContent value="qualification">
            <QualificationRulesTab />
          </TabsContent>

          {/* Cleanup Tab */}
          <TabsContent value="cleanup">
            <CleanupConfigTab />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <UserFormModal
        user={editingUser}
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
      />

      <FunnelFormModal
        funnel={editingFunnel}
        open={funnelModalOpen}
        onOpenChange={setFunnelModalOpen}
      />

      <CRMColumnFormModal
        column={editingColumn}
        open={columnModalOpen}
        onOpenChange={setColumnModalOpen}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Excluir ${deleteTarget?.type === 'funnel' ? 'Funil' : 'Coluna'}`}
        description={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </AppLayout>
  );
}
