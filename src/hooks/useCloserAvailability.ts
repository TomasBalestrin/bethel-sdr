import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { CloserAvailability } from '@/types/database';

export function useCloserAvailability(closerId?: string) {
  return useQuery({
    queryKey: ['closer-availability', closerId],
    queryFn: async () => {
      let query = supabase
        .from('closer_availability')
        .select('*')
        .order('day_of_week', { ascending: true });

      if (closerId) {
        query = query.eq('closer_id', closerId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CloserAvailability[];
    },
  });
}

export function useUpsertCloserAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (availability: Omit<CloserAvailability, 'id' | 'created_at'> & { id?: string }) => {
      if (availability.id) {
        const { data, error } = await supabase
          .from('closer_availability')
          .update({
            day_of_week: availability.day_of_week,
            start_time: availability.start_time,
            end_time: availability.end_time,
            break_start: availability.break_start,
            break_end: availability.break_end,
            active: availability.active,
          })
          .eq('id', availability.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('closer_availability')
          .insert({
            closer_id: availability.closer_id,
            day_of_week: availability.day_of_week,
            start_time: availability.start_time,
            end_time: availability.end_time,
            break_start: availability.break_start,
            break_end: availability.break_end,
            active: availability.active,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-availability'] });
      toast.success('Disponibilidade salva');
    },
    onError: (error) => {
      toast.error('Erro ao salvar disponibilidade: ' + error.message);
    },
  });
}

export function useDeleteCloserAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('closer_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['closer-availability'] });
      toast.success('Disponibilidade removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover disponibilidade: ' + error.message);
    },
  });
}
