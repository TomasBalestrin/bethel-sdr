import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Lead, LeadClassification, LeadStatus } from '@/types/database';
import { toast } from 'sonner';

interface LeadsFilters {
  search?: string;
  classification?: LeadClassification[];
  status?: LeadStatus[];
  funnelId?: string;
  assignedSdrId?: string;
}

export function useLeads(filters?: LeadsFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          funnel:funnels(id, name),
          assigned_sdr:profiles!leads_assigned_sdr_profile_fkey(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.search) {
        query = query.or(`full_name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters?.classification?.length) {
        query = query.in('classification', filters.classification);
      }

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters?.funnelId) {
        query = query.eq('funnel_id', filters.funnelId);
      }

      if (filters?.assignedSdrId) {
        query = query.eq('assigned_sdr_id', filters.assignedSdrId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['lead', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          funnel:funnels(id, name),
          assigned_sdr:profiles!leads_assigned_sdr_profile_fkey(id, name, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      toast.success('Lead atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lead: ' + error.message);
    },
  });
}

export function useLeadsStats() {
  return useQuery({
    queryKey: ['leads-stats'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, classification, status, created_at');

      if (error) throw error;

      const total = leads.length;
      const byClassification = {
        diamante: leads.filter(l => l.classification === 'diamante').length,
        ouro: leads.filter(l => l.classification === 'ouro').length,
        prata: leads.filter(l => l.classification === 'prata').length,
        bronze: leads.filter(l => l.classification === 'bronze').length,
      };
      const byStatus = {
        novo: leads.filter(l => l.status === 'novo').length,
        em_atendimento: leads.filter(l => l.status === 'em_atendimento').length,
        agendado: leads.filter(l => l.status === 'agendado').length,
        concluido: leads.filter(l => l.status === 'concluido').length,
      };

      return { total, byClassification, byStatus };
    },
  });
}
