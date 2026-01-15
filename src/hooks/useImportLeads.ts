import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];

interface ImportLeadsParams {
  leads: Omit<LeadInsert, 'id' | 'created_at' | 'updated_at'>[];
  funnelId?: string;
}

export function useImportLeads() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leads, funnelId }: ImportLeadsParams) => {
      const leadsToInsert = leads.map(lead => ({
        ...lead,
        funnel_id: funnelId || lead.funnel_id,
        status: lead.status || 'novo' as const,
        classification: lead.classification || 'bronze' as const,
      }));

      const { data, error } = await supabase
        .from('leads')
        .insert(leadsToInsert)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads-stats'] });
      queryClient.invalidateQueries({ queryKey: ['leads-evolution'] });
      toast.success(`${data.length} leads importados com sucesso!`);
    },
    onError: (error) => {
      toast.error('Erro ao importar leads: ' + error.message);
    },
  });
}
