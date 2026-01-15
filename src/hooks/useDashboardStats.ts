import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format } from 'date-fns';

export function useLeadsEvolution(days: number = 30) {
  return useQuery({
    queryKey: ['leads-evolution', days],
    queryFn: async () => {
      const startDate = subDays(new Date(), days);
      
      const { data, error } = await supabase
        .from('leads')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const grouped: Record<string, number> = {};
      
      for (let i = 0; i <= days; i++) {
        const date = format(subDays(new Date(), days - i), 'dd/MM');
        grouped[date] = 0;
      }

      data?.forEach((lead) => {
        const date = format(new Date(lead.created_at), 'dd/MM');
        if (grouped[date] !== undefined) {
          grouped[date]++;
        }
      });

      return Object.entries(grouped).map(([date, count]) => ({
        date,
        leads: count,
      }));
    },
  });
}

export function useConversionFunnel() {
  return useQuery({
    queryKey: ['conversion-funnel'],
    queryFn: async () => {
      // Get leads count by status
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('status');

      if (leadsError) throw leadsError;

      // Get appointments stats
      const { data: appointments, error: appError } = await supabase
        .from('appointments')
        .select('status, converted');

      if (appError) throw appError;

      const totalLeads = leads?.length || 0;
      const emAtendimento = leads?.filter(l => l.status === 'em_atendimento').length || 0;
      const agendados = appointments?.filter(a => a.status === 'agendado').length || 0;
      const realizados = appointments?.filter(a => a.status === 'realizado').length || 0;
      const convertidos = appointments?.filter(a => a.converted).length || 0;

      return [
        { name: 'Leads', value: totalLeads, fill: 'hsl(var(--primary))' },
        { name: 'Em Atendimento', value: emAtendimento, fill: 'hsl(var(--warning))' },
        { name: 'Agendados', value: agendados, fill: 'hsl(var(--column-calling))' },
        { name: 'Realizados', value: realizados, fill: 'hsl(var(--success))' },
        { name: 'Convertidos', value: convertidos, fill: 'hsl(var(--diamante))' },
      ];
    },
  });
}

export function usePerformanceByFunnel() {
  return useQuery({
    queryKey: ['performance-by-funnel'],
    queryFn: async () => {
      const { data: funnels, error: funnelsError } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('active', true);

      if (funnelsError) throw funnelsError;

      const results = await Promise.all(
        (funnels || []).map(async (funnel) => {
          const { count: leadsCount } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('funnel_id', funnel.id);

          const { count: appointmentsCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('funnel_id', funnel.id);

          const { count: conversionsCount } = await supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('funnel_id', funnel.id)
            .eq('converted', true);

          return {
            name: funnel.name,
            leads: leadsCount || 0,
            agendamentos: appointmentsCount || 0,
            conversoes: conversionsCount || 0,
          };
        })
      );

      return results;
    },
  });
}
