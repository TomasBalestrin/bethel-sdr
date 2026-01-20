import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Niche {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export function useNiches() {
  return useQuery({
    queryKey: ['niches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('niches')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return data as Niche[];
    },
  });
}

export function useCreateNiche() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase
        .from('niches')
        .insert({ name })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niches'] });
      toast.success('Nicho criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar nicho: ' + error.message);
    },
  });
}

export function useDeleteNiche() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('niches')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['niches'] });
      toast.success('Nicho removido');
    },
    onError: (error) => {
      toast.error('Erro ao remover nicho: ' + error.message);
    },
  });
}
