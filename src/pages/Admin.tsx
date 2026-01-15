import { useState } from 'react';
import { Settings, Users, Workflow, Columns, Clock } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/hooks/useUsers';
import { useFunnels } from '@/hooks/useFunnels';
import { useCRMColumns } from '@/hooks/useCRMColumns';
import { RoleBadge } from '@/components/shared/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function Admin() {
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: funnels, isLoading: funnelsLoading } = useFunnels();
  const { data: columns, isLoading: columnsLoading } = useCRMColumns();

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
          </TabsList>

          <TabsContent value="users" className="space-y-4">
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="funnels" className="space-y-4">
            <div className="flex justify-end">
              <Button>Novo Funil</Button>
            </div>
            {funnelsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {funnels?.map((funnel) => (
                      <TableRow key={funnel.id}>
                        <TableCell className="font-medium">{funnel.name}</TableCell>
                        <TableCell>
                          <Badge variant={funnel.active ? 'default' : 'secondary'}>
                            {funnel.active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!funnels || funnels.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                          Nenhum funil cadastrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="columns" className="space-y-4">
            <div className="flex justify-end">
              <Button>Nova Coluna</Button>
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns?.map((column) => (
                      <TableRow key={column.id}>
                        <TableCell>
                          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: column.color }} />
                        </TableCell>
                        <TableCell className="font-medium">{column.name}</TableCell>
                        <TableCell>{column.position}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
