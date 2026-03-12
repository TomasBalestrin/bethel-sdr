import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Goal, GoalMetric, GoalPeriod } from '@/types/database';
import { toast } from 'sonner';

export function useGoals(userId?: string, period?: GoalPeriod) {
  return useQuery({
    queryKey: ['goals', userId, period],
    queryFn: async () => {
      let query = supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (period) {
        query = query.eq('period', period);
      }

      // Only fetch active goals (where end_date >= today)
      query = query.gte('end_date', new Date().toISOString().split('T')[0]);

      const { data, error } = await query;
      if (error) throw error;
      return data as Goal[];
    },
  });
}

export function useGoalProgress(userId: string) {
  return useQuery({
    queryKey: ['goal-progress', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .lte('start_date', today)
        .gte('end_date', today);

      if (error) throw error;

      // Calculate progress with real data
      const goalsWithProgress = await Promise.all(
        (goals || []).map(async (goal: Goal) => {
          const currentValue = await calculateCurrentValue(
            goal.metric as GoalMetric,
            userId,
            goal.start_date,
            goal.end_date
          );

          return {
            ...goal,
            current_value: currentValue,
            progress: goal.target_value > 0
              ? Math.min(100, (currentValue / goal.target_value) * 100)
              : 0,
          };
        })
      );

      return goalsWithProgress;
    },
    enabled: !!userId,
  });
}

async function calculateCurrentValue(
  metric: GoalMetric,
  userId: string,
  startDate: string,
  endDate: string
): Promise<number> {
  switch (metric) {
    case 'agendamentos': {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('sdr_id', userId)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
      return count || 0;
    }
    case 'conversoes': {
      const { count } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('sdr_id', userId)
        .eq('converted', true)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
      return count || 0;
    }
    case 'valor_gerado': {
      const { data } = await supabase
        .from('appointments')
        .select('conversion_value')
        .eq('sdr_id', userId)
        .eq('converted', true)
        .gte('created_at', startDate)
        .lte('created_at', endDate + 'T23:59:59');
      return (data || []).reduce((sum, a) => sum + (a.conversion_value || 0), 0);
    }
    case 'leads_contatados': {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_sdr_id', userId)
        .in('status', ['em_atendimento', 'agendado', 'concluido'])
        .gte('updated_at', startDate)
        .lte('updated_at', endDate + 'T23:59:59');
      return count || 0;
    }
    default:
      return 0;
  }
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'created_at' | 'updated_at' | 'current_value'>) => {
      const { data, error } = await supabase
        .from('goals')
        .insert({ ...goal, current_value: 0 })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      toast.success('Meta criada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar meta: ' + error.message);
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Goal> & { id: string }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      toast.success('Meta atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar meta: ' + error.message);
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress'] });
      toast.success('Meta removida');
    },
    onError: (error) => {
      toast.error('Erro ao remover meta: ' + error.message);
    },
  });
}
