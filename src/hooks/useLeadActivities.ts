import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { LeadActivity } from '@/types/database';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export function useLeadActivities(leadId: string) {
  return useQuery({
    queryKey: ['lead-activities', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activities')
        .select(`
          *,
          user:profiles!lead_activities_user_id_fkey(id, name),
          column:crm_columns(id, name, color)
        `)
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });
}

export function useCreateLeadActivity() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (activity: { 
      lead_id: string; 
      column_id?: string | null; 
      action_type: string; 
      notes?: string | null;
      tags?: string[];
      details?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('lead_activities')
        .insert([{
          lead_id: activity.lead_id,
          column_id: activity.column_id || null,
          action_type: activity.action_type,
          notes: activity.notes || null,
          tags: activity.tags || [],
          details: activity.details || {},
          user_id: user?.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', variables.lead_id] });
    },
    onError: (error) => {
      toast.error('Erro ao registrar atividade: ' + error.message);
    },
  });
}

export function useMoveLead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      leadId, 
      columnId, 
      notes 
    }: { 
      leadId: string; 
      columnId: string;
      notes?: string;
    }) => {
      // Create activity for the move
      const { error: activityError } = await supabase
        .from('lead_activities')
        .insert([{
          lead_id: leadId,
          column_id: columnId,
          user_id: user?.id,
          action_type: 'move',
          notes: notes || null,
          tags: [],
          details: {},
        }]);

      if (activityError) throw activityError;

      return { leadId, columnId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
    onError: (error) => {
      toast.error('Erro ao mover lead: ' + error.message);
    },
  });
}
