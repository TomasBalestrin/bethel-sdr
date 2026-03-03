import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { QualificationRule, RuleCondition, LeadClassification } from '@/types/database';

export interface QualificationRuleWithFunnel extends Omit<QualificationRule, 'conditions'> {
  conditions: RuleCondition[];
  funnel?: { id: string; name: string } | null;
}

export function useQualificationRules(funnelId?: string) {
  return useQuery({
    queryKey: ['qualification-rules', funnelId],
    queryFn: async () => {
      let query = supabase
        .from('qualification_rules')
        .select(`
          *,
          funnel:funnels(id, name)
        `)
        .order('priority', { ascending: true });

      if (funnelId) {
        query = query.eq('funnel_id', funnelId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map(rule => ({
        ...rule,
        conditions: Array.isArray(rule.conditions) ? rule.conditions : JSON.parse(rule.conditions as string || '[]'),
      })) as QualificationRuleWithFunnel[];
    },
  });
}

export function useQualificationRule(id: string) {
  return useQuery({
    queryKey: ['qualification-rule', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qualification_rules')
        .select(`
          *,
          funnel:funnels(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return {
        ...data,
        conditions: Array.isArray(data.conditions) ? data.conditions : JSON.parse(data.conditions as string || '[]'),
      } as QualificationRuleWithFunnel;
    },
    enabled: !!id,
  });
}

export function useCreateQualificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rule: {
      rule_name: string;
      funnel_id: string | null;
      conditions: RuleCondition[];
      qualification_label: string;
      classification: string | null;
      priority: number;
      active: boolean;
    }) => {
      const { data, error } = await supabase
        .from('qualification_rules')
        .insert({
          rule_name: rule.rule_name,
          funnel_id: rule.funnel_id,
          conditions: JSON.stringify(rule.conditions),
          qualification_label: rule.qualification_label,
          classification: rule.classification as LeadClassification | null,
          priority: rule.priority,
          active: rule.active,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualification-rules'] });
      toast.success('Regra de qualificação criada');
    },
    onError: (error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

export function useUpdateQualificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<QualificationRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('qualification_rules')
        .update({
          ...updates,
          conditions: updates.conditions ? JSON.stringify(updates.conditions) : undefined,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualification-rules'] });
      queryClient.invalidateQueries({ queryKey: ['qualification-rule'] });
      toast.success('Regra atualizada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}

export function useDeleteQualificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('qualification_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualification-rules'] });
      toast.success('Regra excluída');
    },
    onError: (error) => {
      toast.error('Erro ao excluir regra: ' + error.message);
    },
  });
}

export function useToggleQualificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { data, error } = await supabase
        .from('qualification_rules')
        .update({ active })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['qualification-rules'] });
      toast.success(data.active ? 'Regra ativada' : 'Regra desativada');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra: ' + error.message);
    },
  });
}
