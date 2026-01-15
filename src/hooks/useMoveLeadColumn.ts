import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MoveLeadParams {
  leadId: string;
  fromColumnId: string | null;
  toColumnId: string;
  userId: string;
}

export function useMoveLeadColumn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, fromColumnId, toColumnId, userId }: MoveLeadParams) => {
      // Get column names for activity log
      const { data: columns } = await supabase
        .from('crm_columns')
        .select('id, name')
        .in('id', [fromColumnId, toColumnId].filter(Boolean) as string[]);

      const fromColumn = columns?.find(c => c.id === fromColumnId);
      const toColumn = columns?.find(c => c.id === toColumnId);

      // Update lead column
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          crm_column_id: toColumnId,
          status: 'em_atendimento' as const,
        })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Create activity log
      const { error: activityError } = await supabase
        .from('lead_activities')
        .insert({
          lead_id: leadId,
          user_id: userId,
          action_type: 'move',
          column_id: toColumnId,
          notes: fromColumn 
            ? `Movido de "${fromColumn.name}" para "${toColumn?.name}"`
            : `Adicionado em "${toColumn?.name}"`,
          details: {
            from_column_id: fromColumnId,
            to_column_id: toColumnId,
            from_column_name: fromColumn?.name || null,
            to_column_name: toColumn?.name || null,
          },
        });

      if (activityError) throw activityError;

      return { leadId, toColumnId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities'] });
    },
    onError: (error) => {
      toast.error('Erro ao mover lead: ' + error.message);
    },
  });
}
