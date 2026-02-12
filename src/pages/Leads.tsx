import { useState } from 'react';
import { Search, Filter, Users, Upload, MessageCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClassificationBadge, LeadStatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useLeads, useUpdateLead } from '@/hooks/useLeads';
import { useFunnels } from '@/hooks/useFunnels';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ImportCSVModal } from '@/components/leads/ImportCSVModal';
import { LeadDetailsSheet } from '@/components/leads/LeadDetailsSheet';
import { Database } from '@/integrations/supabase/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  funnel?: { name: string } | null;
  assigned_sdr?: { name: string } | null;
};

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [classificationFilter, setClassificationFilter] = useState<string>('');
  const [funnelFilter, setFunnelFilter] = useState<string>('');
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: leads, isLoading } = useLeads({ 
    search: search || undefined,
    status: statusFilter ? [statusFilter as any] : undefined,
    classification: classificationFilter ? [classificationFilter as any] : undefined,
    funnelId: funnelFilter || undefined,
  });
  const { data: funnels } = useFunnels();
  const updateLead = useUpdateLead();

  const handleRowClick = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailsOpen(true);
  };

  const handleStartAttendance = async () => {
    if (!selectedLead) return;
    await updateLead.mutateAsync({
      id: selectedLead.id,
      status: 'em_atendimento',
    });
    setDetailsOpen(false);
  };

  const clearFilters = () => {
    setStatusFilter('');
    setClassificationFilter('');
    setFunnelFilter('');
  };

  const hasFilters = statusFilter || classificationFilter || funnelFilter;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground">Gerencie seus leads</p>
          </div>
          <Button onClick={() => setImportModalOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative">
                <Filter className="mr-2 h-4 w-4" />
                Filtros
                {hasFilters && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      <SelectItem value="novo">Novo</SelectItem>
                      <SelectItem value="em_atendimento">Em Atendimento</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="convertido">Convertido</SelectItem>
                      <SelectItem value="perdido">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Classificação</Label>
                  <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas</SelectItem>
                      <SelectItem value="diamante">Diamante</SelectItem>
                      <SelectItem value="ouro">Ouro</SelectItem>
                      <SelectItem value="prata">Prata</SelectItem>
                      <SelectItem value="bronze">Bronze</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Funil</Label>
                  <Select value={funnelFilter} onValueChange={setFunnelFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os funis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todos</SelectItem>
                      {funnels?.map(funnel => (
                        <SelectItem key={funnel.id} value={funnel.id}>
                          {funnel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
                    Limpar filtros
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : leads && leads.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Funil</TableHead>
                  <TableHead>Data Formulário</TableHead>
                  <TableHead>Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow 
                    key={lead.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(lead as Lead)}
                  >
                    <TableCell className="font-medium">{lead.full_name}</TableCell>
                    <TableCell>
                      {lead.phone ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const cleanPhone = lead.phone!.replace(/\D/g, '');
                            window.open(`https://wa.me/55${cleanPhone}`, '_blank');
                          }}
                          className="flex items-center gap-1.5 text-green-600 hover:underline cursor-pointer"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {lead.phone}
                        </button>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {lead.classification && <ClassificationBadge classification={lead.classification} />}
                    </TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>{(lead as Lead).funnel?.name || '-'}</TableCell>
                    <TableCell>
                      {lead.form_filled_at 
                        ? format(new Date(lead.form_filled_at), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {format(new Date(lead.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="Nenhum lead encontrado"
            description="Ainda não há leads cadastrados no sistema."
          />
        )}
      </div>

      <ImportCSVModal open={importModalOpen} onOpenChange={setImportModalOpen} />
      
      <LeadDetailsSheet
        lead={selectedLead}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onStartAttendance={handleStartAttendance}
      />
    </AppLayout>
  );
}
