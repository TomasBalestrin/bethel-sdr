import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CrmColumn } from '@/types/database';
import { toast } from 'sonner';

export function useCRMColumns() {
  return useQuery({
    queryKey: ['crm-columns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_columns')
        .select('*')
        .order('position');

      if (error) throw error;
      return data as CrmColumn[];
    },
  });
}

export function useCreateCRMColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (column: Omit<CrmColumn, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('crm_columns')
        .insert(column)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-columns'] });
      toast.success('Coluna criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar coluna: ' + error.message);
    },
  });
}

export function useUpdateCRMColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CrmColumn> & { id: string }) => {
      const { data, error } = await supabase
        .from('crm_columns')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-columns'] });
      toast.success('Coluna atualizada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar coluna: ' + error.message);
    },
  });
}

export function useDeleteCRMColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_columns')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-columns'] });
      toast.success('Coluna excluída com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao excluir coluna: ' + error.message);
    },
  });
}

export function useReorderCRMColumns() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (columns: { id: string; position: number }[]) => {
      for (const col of columns) {
        const { error } = await supabase
          .from('crm_columns')
          .update({ position: col.position })
          .eq('id', col.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-columns'] });
      toast.success('Colunas reordenadas');
    },
    onError: (error) => {
      toast.error('Erro ao reordenar: ' + error.message);
    },
  });
}
