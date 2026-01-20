import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SDRCapacity {
  id: string;
  sdr_id: string;
  funnel_id: string | null;
  max_leads: number;
  percentage: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  sdr?: { id: string; name: string; email: string } | null;
  funnel?: { id: string; name: string } | null;
}

export function useSDRCapacities() {
  return useQuery({
    queryKey: ['sdr-capacities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_capacities')
        .select(`
          *,
          sdr:profiles!sdr_id(id, name, email),
          funnel:funnels(id, name)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as unknown as SDRCapacity[];
    },
  });
}

export function useSDRCapacitiesBySdr(sdrId: string) {
  return useQuery({
    queryKey: ['sdr-capacities', sdrId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sdr_capacities')
        .select(`
          *,
          funnel:funnels(id, name)
        `)
        .eq('sdr_id', sdrId)
        .eq('active', true);

      if (error) throw error;
      return data as unknown as SDRCapacity[];
    },
    enabled: !!sdrId,
  });
}

export function useCreateSDRCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (capacity: { sdr_id: string; funnel_id?: string; max_leads?: number; percentage?: number }) => {
      const { data, error } = await supabase
        .from('sdr_capacities')
        .insert({
          sdr_id: capacity.sdr_id,
          funnel_id: capacity.funnel_id || null,
          max_leads: capacity.max_leads || 50,
          percentage: capacity.percentage || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-capacities'] });
      toast.success('Capacidade configurada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao configurar capacidade: ' + error.message);
    },
  });
}

export function useUpdateSDRCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SDRCapacity> & { id: string }) => {
      const { data, error } = await supabase
        .from('sdr_capacities')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-capacities'] });
      toast.success('Capacidade atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar capacidade: ' + error.message);
    },
  });
}

export function useDeleteSDRCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sdr_capacities')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-capacities'] });
      toast.success('Capacidade removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover capacidade: ' + error.message);
    },
  });
}

export function useUpsertSDRCapacity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (capacity: { sdr_id: string; funnel_id: string | null; max_leads: number; percentage: number | null }) => {
      const { data, error } = await supabase
        .from('sdr_capacities')
        .upsert({
          sdr_id: capacity.sdr_id,
          funnel_id: capacity.funnel_id,
          max_leads: capacity.max_leads,
          percentage: capacity.percentage,
          active: true,
        }, {
          onConflict: 'sdr_id,funnel_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sdr-capacities'] });
      toast.success('Capacidade salva');
    },
    onError: (error) => {
      toast.error('Erro ao salvar capacidade: ' + error.message);
    },
  });
}
