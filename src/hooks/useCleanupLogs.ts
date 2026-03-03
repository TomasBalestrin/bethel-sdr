import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CleanupLog {
  id: string;
  lead_id: string | null;
  lead_data: unknown;
  cleanup_reason: string;
  cleaned_at: string | null;
  exported_at: string | null;
  google_sheet_url: string | null;
  sheet_name: string | null;
  google_sheet_row: number | null;
}

export interface CleanupStats {
  totalCleaned: number;
  bronzeCleaned: number;
  naoFitCleaned: number;
  lastCleanup: string | null;
}

export interface EligibleLead {
  id: string;
  full_name: string;
  classification: string | null;
  qualification: string | null;
  created_at: string;
  funnel_name: string | null;
}

export function useCleanupLogs() {
  return useQuery({
    queryKey: ['cleanup-logs'],
    queryFn: async (): Promise<CleanupLog[]> => {
      const { data, error } = await supabase
        .from('cleanup_logs')
        .select('*')
        .order('cleaned_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
  });
}

export function useCleanupStats() {
  return useQuery({
    queryKey: ['cleanup-stats'],
    queryFn: async (): Promise<CleanupStats> => {
      const { data: logs, error } = await supabase
        .from('cleanup_logs')
        .select('cleanup_reason, cleaned_at');

      if (error) throw error;

      const bronzeCleaned = logs?.filter(l => l.cleanup_reason === 'bronze').length || 0;
      const naoFitCleaned = logs?.filter(l => l.cleanup_reason === 'nao_fit').length || 0;
      const lastCleanup = logs?.[0]?.cleaned_at || null;

      return {
        totalCleaned: logs?.length || 0,
        bronzeCleaned,
        naoFitCleaned,
        lastCleanup,
      };
    },
  });
}

export function useEligibleLeadsForCleanup() {
  return useQuery({
    queryKey: ['eligible-leads-cleanup'],
    queryFn: async (): Promise<EligibleLead[]> => {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          full_name,
          classification,
          qualification,
          created_at,
          funnel:funnels(name)
        `)
        .or('classification.eq.bronze,qualification.ilike.%não-fit%,qualification.ilike.%nao-fit%')
        .lt('created_at', twentyFourHoursAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((lead) => ({
        id: lead.id,
        full_name: lead.full_name,
        classification: lead.classification,
        qualification: lead.qualification,
        created_at: lead.created_at,
        funnel_name: (lead.funnel as { name: string } | null)?.name || null,
      }));
    },
  });
}

export function useExecuteCleanup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ dryRun = false }: { dryRun?: boolean } = {}) => {
      const { data, error } = await supabase.functions.invoke('cleanup-leads', {
        body: { dryRun },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao executar limpeza');

      return data;
    },
    onSuccess: (data, variables) => {
      if (variables.dryRun) {
        toast.success(`Preview: ${data.cleaned_count || 0} leads seriam removidos`);
      } else {
        toast.success(`${data.cleaned_count || 0} leads foram arquivados`);
        queryClient.invalidateQueries({ queryKey: ['cleanup-logs'] });
        queryClient.invalidateQueries({ queryKey: ['cleanup-stats'] });
        queryClient.invalidateQueries({ queryKey: ['eligible-leads-cleanup'] });
        queryClient.invalidateQueries({ queryKey: ['leads'] });
      }
    },
    onError: (error: Error) => {
      toast.error('Erro na limpeza: ' + error.message);
    },
  });
}
