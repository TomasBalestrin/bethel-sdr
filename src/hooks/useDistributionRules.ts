import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DistributionRule {
  id: string;
  name: string;
  funnel_id: string | null;
  classifications: string[];
  sdr_ids: string[];
  max_leads_per_sdr: number;
  active: boolean;
  schedule_enabled: boolean;
  schedule_days: number[];
  schedule_time: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  funnel?: { id: string; name: string } | null;
}

export interface DistributionLog {
  id: string;
  rule_id: string | null;
  leads_count: number;
  sdr_ids: string[];
  distribution_mode: string;
  distributed_by: string | null;
  funnel_id: string | null;
  classifications: string[] | null;
  lead_ids: string[] | null;
  workload_snapshot: Record<string, unknown> | null;
  created_at: string;
  rule?: { id: string; name: string } | null;
  distributor?: { id: string; name: string } | null;
  funnel?: { id: string; name: string } | null;
}

export interface DistributeParams {
  ruleId?: string;
  leadIds?: string[];
  sdrIds?: string[];
  funnelId?: string;
  classifications?: string[];
  limit?: number;
  considerWorkload?: boolean;
  dryRun?: boolean;
}

export interface DistributeResult {
  success: boolean;
  distributed: number;
  assignments: Array<{
    leadId: string;
    leadName: string;
    sdrId: string;
    sdrName: string;
  }>;
  skipped: number;
  logId?: string;
  message?: string;
  error?: string;
  dryRun?: boolean;
}

export function useDistributionRules() {
  return useQuery({
    queryKey: ['distribution-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_rules')
        .select(`
          *,
          funnel:funnels(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DistributionRule[];
    },
  });
}

export function useDistributionRule(id: string) {
  return useQuery({
    queryKey: ['distribution-rule', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('distribution_rules')
        .select(`
          *,
          funnel:funnels(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as DistributionRule;
    },
    enabled: !!id,
  });
}

export function useCreateDistributionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Partial<Omit<DistributionRule, 'id' | 'created_at' | 'updated_at' | 'funnel'>> & { name: string; sdr_ids: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('distribution_rules')
        .insert({
          ...rule,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast.success('Regra de distribuição criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

export function useUpdateDistributionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DistributionRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('distribution_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      queryClient.invalidateQueries({ queryKey: ['distribution-rule'] });
      toast.success('Regra de distribuição atualizada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}

export function useDeleteDistributionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('distribution_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast.success('Regra de distribuição excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir regra: ' + error.message);
    },
  });
}

export function useToggleDistributionRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('distribution_rules')
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['distribution-rules'] });
      toast.success(data.active ? 'Regra ativada' : 'Regra desativada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}

export function useDistributionLogs(limit = 50) {
  return useQuery({
    queryKey: ['distribution-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_distribution_logs')
        .select(`
          *,
          rule:distribution_rules(id, name),
          funnel:funnels(id, name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as DistributionLog[];
    },
  });
}

export function useExecuteDistribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: DistributeParams): Promise<DistributeResult> => {
      const { data, error } = await supabase.functions.invoke('distribute-leads', {
        body: params,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao distribuir leads');
      
      return data as DistributeResult;
    },
    onSuccess: (data) => {
      if (!data.dryRun) {
        queryClient.invalidateQueries({ queryKey: ['leads'] });
        queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
        queryClient.invalidateQueries({ queryKey: ['distribution-logs'] });
        toast.success(data.message || `${data.distributed} leads distribuídos`);
      }
    },
    onError: (error) => {
      toast.error('Erro ao distribuir leads: ' + error.message);
    },
  });
}

export function useNewLeadsCount(funnelId?: string, classifications?: string[]) {
  return useQuery({
    queryKey: ['new-leads-count', funnelId, classifications],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'novo')
        .is('assigned_sdr_id', null);

      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }

      if (classifications && classifications.length > 0) {
        query = query.in('classification', classifications as ('diamante' | 'ouro' | 'prata' | 'bronze')[]);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    },
  });
}
