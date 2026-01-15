import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Funnel } from '@/types/database';
import { toast } from 'sonner';

export function useFunnels() {
  return useQuery({
    queryKey: ['funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Funnel[];
    },
  });
}

export function useFunnel(id: string) {
  return useQuery({
    queryKey: ['funnel', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Funnel;
    },
    enabled: !!id,
  });
}

export function useCreateFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (funnel: Omit<Funnel, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('funnels')
        .insert(funnel)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar funil: ' + error.message);
    },
  });
}

export function useUpdateFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Funnel> & { id: string }) => {
      const { data, error } = await supabase
        .from('funnels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar funil: ' + error.message);
    },
  });
}

export function useDeleteFunnel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('funnels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['funnels'] });
      toast.success('Funil excluído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir funil: ' + error.message);
    },
  });
}
