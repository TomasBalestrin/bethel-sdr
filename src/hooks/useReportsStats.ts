import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface SDRMetrics {
  leadsAtribuidos: number;
  leadsEmAtendimento: number;
  leadsConcluidos: number;
  leadsAgendados: number;
  taxaAgendamento: number;
  conversoes: number;
  valorGerado: number;
  classificacaoLeads: {
    diamante: number;
    ouro: number;
    prata: number;
    bronze: number;
  };
}

export interface CloserMetrics {
  callsAgendadas: number;
  callsRealizadas: number;
  callsNaoCompareceu: number;
  taxaComparecimento: number;
  conversoes: number;
  taxaConversao: number;
  valorTotal: number;
  ticketMedio: number;
}

export interface FunnelMetrics {
  id: string;
  name: string;
  leads: number;
  agendamentos: number;
  conversoes: number;
  valorGerado: number;
  taxaAgendamento: number;
  taxaConversao: number;
}

export interface RankingEntry {
  id: string;
  name: string;
  value: number;
  secondary?: number;
}

const defaultDateRange: DateRange = {
  from: subDays(new Date(), 30),
  to: new Date(),
};

export function useSDRStats(sdrId?: string, dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['sdr-stats', sdrId, dateRange.from, dateRange.to],
    queryFn: async (): Promise<SDRMetrics> => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      let leadsQuery = supabase
        .from('leads')
        .select('id, classification, status, created_at')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (sdrId) {
        leadsQuery = leadsQuery.eq('assigned_sdr_id', sdrId);
      }

      const { data: leads, error: leadsError } = await leadsQuery;
      if (leadsError) throw leadsError;

      const leadIds = leads?.map(l => l.id) || [];

      // Get appointments for these leads
      let appointmentsData: any[] = [];
      if (leadIds.length > 0) {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, converted, conversion_value, lead_id')
          .in('lead_id', leadIds);
        if (!error) appointmentsData = data || [];
      }

      const leadsAtribuidos = leads?.length || 0;
      const leadsEmAtendimento = leads?.filter(l => l.status === 'em_atendimento').length || 0;
      const leadsConcluidos = leads?.filter(l => l.status === 'concluido').length || 0;
      const leadsAgendados = leads?.filter(l => l.status === 'agendado').length || 0;
      const taxaAgendamento = leadsAtribuidos > 0 ? (leadsAgendados / leadsAtribuidos) * 100 : 0;
      const conversoes = appointmentsData.filter(a => a.converted).length;
      const valorGerado = appointmentsData
        .filter(a => a.converted && a.conversion_value)
        .reduce((sum, a) => sum + Number(a.conversion_value), 0);

      const classificacaoLeads = {
        diamante: leads?.filter(l => l.classification === 'diamante').length || 0,
        ouro: leads?.filter(l => l.classification === 'ouro').length || 0,
        prata: leads?.filter(l => l.classification === 'prata').length || 0,
        bronze: leads?.filter(l => l.classification === 'bronze').length || 0,
      };

      return {
        leadsAtribuidos,
        leadsEmAtendimento,
        leadsConcluidos,
        leadsAgendados,
        taxaAgendamento,
        conversoes,
        valorGerado,
        classificacaoLeads,
      };
    },
  });
}

export function useCloserStats(closerId?: string, dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['closer-stats', closerId, dateRange.from, dateRange.to],
    queryFn: async (): Promise<CloserMetrics> => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      let query = supabase
        .from('appointments')
        .select('id, status, attended, converted, conversion_value')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (closerId) {
        query = query.eq('closer_id', closerId);
      }

      const { data: appointments, error } = await query;
      if (error) throw error;

      const callsAgendadas = appointments?.length || 0;
      const callsRealizadas = appointments?.filter(a => a.status === 'realizado').length || 0;
      const callsNaoCompareceu = appointments?.filter(a => a.status === 'nao_compareceu').length || 0;
      const taxaComparecimento = callsAgendadas > 0 ? (callsRealizadas / callsAgendadas) * 100 : 0;
      const conversoes = appointments?.filter(a => a.converted).length || 0;
      const taxaConversao = callsRealizadas > 0 ? (conversoes / callsRealizadas) * 100 : 0;
      const valorTotal = appointments
        ?.filter(a => a.converted && a.conversion_value)
        .reduce((sum, a) => sum + Number(a.conversion_value), 0) || 0;
      const ticketMedio = conversoes > 0 ? valorTotal / conversoes : 0;

      return {
        callsAgendadas,
        callsRealizadas,
        callsNaoCompareceu,
        taxaComparecimento,
        conversoes,
        taxaConversao,
        valorTotal,
        ticketMedio,
      };
    },
  });
}

export function useFunnelStats(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['funnel-stats', dateRange.from, dateRange.to],
    queryFn: async (): Promise<FunnelMetrics[]> => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: funnels, error: funnelsError } = await supabase
        .from('funnels')
        .select('id, name')
        .eq('active', true);

      if (funnelsError) throw funnelsError;

      const results = await Promise.all(
        (funnels || []).map(async (funnel) => {
          const { data: leads } = await supabase
            .from('leads')
            .select('id, status')
            .eq('funnel_id', funnel.id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          const { data: appointments } = await supabase
            .from('appointments')
            .select('id, converted, conversion_value')
            .eq('funnel_id', funnel.id)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate);

          const leadsCount = leads?.length || 0;
          const agendamentos = appointments?.length || 0;
          const conversoes = appointments?.filter(a => a.converted).length || 0;
          const valorGerado = appointments
            ?.filter(a => a.converted && a.conversion_value)
            .reduce((sum, a) => sum + Number(a.conversion_value), 0) || 0;

          return {
            id: funnel.id,
            name: funnel.name,
            leads: leadsCount,
            agendamentos,
            conversoes,
            valorGerado,
            taxaAgendamento: leadsCount > 0 ? (agendamentos / leadsCount) * 100 : 0,
            taxaConversao: agendamentos > 0 ? (conversoes / agendamentos) * 100 : 0,
          };
        })
      );

      return results;
    },
  });
}

export function useSDRRankings(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['sdr-rankings', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Get all SDRs
      const { data: sdrRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sdr');

      const sdrIds = sdrRoles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', sdrIds)
        .eq('active', true);

      const rankings: { byAgendamento: RankingEntry[]; byConversao: RankingEntry[] } = {
        byAgendamento: [],
        byConversao: [],
      };

      for (const profile of profiles || []) {
        const { data: leads } = await supabase
          .from('leads')
          .select('id, status')
          .eq('assigned_sdr_id', profile.user_id)
          .gte('created_at', startDate)
          .lte('created_at', endDate);

        const leadIds = leads?.map(l => l.id) || [];
        let conversoes = 0;

        if (leadIds.length > 0) {
          const { data: appointments } = await supabase
            .from('appointments')
            .select('id, converted')
            .in('lead_id', leadIds);
          conversoes = appointments?.filter(a => a.converted).length || 0;
        }

        const leadsCount = leads?.length || 0;
        const agendados = leads?.filter(l => l.status === 'agendado').length || 0;
        const taxaAgendamento = leadsCount > 0 ? (agendados / leadsCount) * 100 : 0;

        rankings.byAgendamento.push({
          id: profile.user_id,
          name: profile.name,
          value: taxaAgendamento,
          secondary: agendados,
        });

        rankings.byConversao.push({
          id: profile.user_id,
          name: profile.name,
          value: conversoes,
          secondary: leadsCount,
        });
      }

      rankings.byAgendamento.sort((a, b) => b.value - a.value);
      rankings.byConversao.sort((a, b) => b.value - a.value);

      return rankings;
    },
  });
}

export function useCloserRankings(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['closer-rankings', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Get all Closers
      const { data: closerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'closer');

      const closerIds = closerRoles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', closerIds)
        .eq('active', true);

      const rankings: { byConversao: RankingEntry[]; byValor: RankingEntry[] } = {
        byConversao: [],
        byValor: [],
      };

      for (const profile of profiles || []) {
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, status, converted, conversion_value')
          .eq('closer_id', profile.user_id)
          .gte('scheduled_date', startDate)
          .lte('scheduled_date', endDate);

        const realizadas = appointments?.filter(a => a.status === 'realizado').length || 0;
        const conversoes = appointments?.filter(a => a.converted).length || 0;
        const taxaConversao = realizadas > 0 ? (conversoes / realizadas) * 100 : 0;
        const valorTotal = appointments
          ?.filter(a => a.converted && a.conversion_value)
          .reduce((sum, a) => sum + Number(a.conversion_value), 0) || 0;

        rankings.byConversao.push({
          id: profile.user_id,
          name: profile.name,
          value: taxaConversao,
          secondary: conversoes,
        });

        rankings.byValor.push({
          id: profile.user_id,
          name: profile.name,
          value: valorTotal,
          secondary: conversoes,
        });
      }

      rankings.byConversao.sort((a, b) => b.value - a.value);
      rankings.byValor.sort((a, b) => b.value - a.value);

      return rankings;
    },
  });
}

export function useAllSDRsPerformance(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['all-sdrs-performance', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: sdrRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sdr');

      const sdrIds = sdrRoles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', sdrIds)
        .eq('active', true);

      const performance = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: leads } = await supabase
            .from('leads')
            .select('id, status')
            .eq('assigned_sdr_id', profile.user_id)
            .gte('created_at', startDate)
            .lte('created_at', endDate);

          const leadIds = leads?.map(l => l.id) || [];
          let conversoes = 0;

          if (leadIds.length > 0) {
            const { data: appointments } = await supabase
              .from('appointments')
              .select('id, converted')
              .in('lead_id', leadIds);
            conversoes = appointments?.filter(a => a.converted).length || 0;
          }

          return {
            name: profile.name,
            atribuidos: leads?.length || 0,
            agendados: leads?.filter(l => l.status === 'agendado').length || 0,
            convertidos: conversoes,
          };
        })
      );

      return performance;
    },
  });
}

export function useAllClosersPerformance(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['all-closers-performance', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: closerRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'closer');

      const closerIds = closerRoles?.map(r => r.user_id) || [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', closerIds)
        .eq('active', true);

      const performance = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: appointments } = await supabase
            .from('appointments')
            .select('id, status, converted, conversion_value')
            .eq('closer_id', profile.user_id)
            .gte('scheduled_date', startDate)
            .lte('scheduled_date', endDate);

          return {
            name: profile.name,
            agendadas: appointments?.length || 0,
            realizadas: appointments?.filter(a => a.status === 'realizado').length || 0,
            conversoes: appointments?.filter(a => a.converted).length || 0,
            valor: appointments
              ?.filter(a => a.converted && a.conversion_value)
              .reduce((sum, a) => sum + Number(a.conversion_value), 0) || 0,
          };
        })
      );

      return performance;
    },
  });
}
