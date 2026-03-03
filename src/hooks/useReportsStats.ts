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

      let appointmentsData: { id: string; converted: boolean | null; conversion_value: number | null; lead_id: string }[] = [];
      if (leadIds.length > 0) {
        const { data, error } = await supabase
          .from('appointments')
          .select('id, converted, conversion_value, lead_id')
          .in('lead_id', leadIds);
        if (error) throw error;
        appointmentsData = data || [];
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

// Optimized: 3 queries total instead of 2*N (N = number of funnels)
export function useFunnelStats(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['funnel-stats', dateRange.from, dateRange.to],
    queryFn: async (): Promise<FunnelMetrics[]> => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // 3 parallel queries instead of 2*N sequential
      const [funnelsResult, leadsResult, appointmentsResult] = await Promise.all([
        supabase.from('funnels').select('id, name').eq('active', true),
        supabase.from('leads').select('id, status, funnel_id')
          .gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('appointments').select('id, converted, conversion_value, funnel_id')
          .gte('scheduled_date', startDate).lte('scheduled_date', endDate),
      ]);

      if (funnelsResult.error) throw funnelsResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const funnels = funnelsResult.data || [];
      const allLeads = leadsResult.data || [];
      const allAppointments = appointmentsResult.data || [];

      return funnels.map((funnel) => {
        const leads = allLeads.filter(l => l.funnel_id === funnel.id);
        const appointments = allAppointments.filter(a => a.funnel_id === funnel.id);

        const leadsCount = leads.length;
        const agendamentos = appointments.length;
        const conversoes = appointments.filter(a => a.converted).length;
        const valorGerado = appointments
          .filter(a => a.converted && a.conversion_value)
          .reduce((sum, a) => sum + Number(a.conversion_value), 0);

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
      });
    },
  });
}

// Optimized: 4 queries total instead of 2*N+2 (N = number of SDRs)
export function useSDRRankings(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['sdr-rankings', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      // Get SDR profiles
      const { data: sdrRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sdr');
      if (rolesError) throw rolesError;

      const sdrIds = sdrRoles?.map(r => r.user_id) || [];
      if (sdrIds.length === 0) return { byAgendamento: [], byConversao: [] };

      // 3 parallel queries for all data
      const [profilesResult, leadsResult, appointmentsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, name').in('user_id', sdrIds).eq('active', true),
        supabase.from('leads').select('id, status, assigned_sdr_id')
          .in('assigned_sdr_id', sdrIds)
          .gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('appointments').select('id, converted, lead_id')
          .gte('created_at', startDate).lte('created_at', endDate),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const profiles = profilesResult.data || [];
      const allLeads = leadsResult.data || [];
      const allAppointments = appointmentsResult.data || [];

      // Build lead-to-sdr lookup for appointment matching
      const leadToSdr = new Map(allLeads.map(l => [l.id, l.assigned_sdr_id]));

      const rankings: { byAgendamento: RankingEntry[]; byConversao: RankingEntry[] } = {
        byAgendamento: [],
        byConversao: [],
      };

      for (const profile of profiles) {
        const leads = allLeads.filter(l => l.assigned_sdr_id === profile.user_id);
        const leadIds = new Set(leads.map(l => l.id));
        const sdrAppointments = allAppointments.filter(a => a.lead_id && leadIds.has(a.lead_id));
        const conversoes = sdrAppointments.filter(a => a.converted).length;

        const leadsCount = leads.length;
        const agendados = leads.filter(l => l.status === 'agendado').length;
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

// Optimized: 3 queries total instead of N+2 (N = number of closers)
export function useCloserRankings(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['closer-rankings', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: closerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'closer');
      if (rolesError) throw rolesError;

      const closerIds = closerRoles?.map(r => r.user_id) || [];
      if (closerIds.length === 0) return { byConversao: [], byValor: [] };

      const [profilesResult, appointmentsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, name').in('user_id', closerIds).eq('active', true),
        supabase.from('appointments').select('id, status, converted, conversion_value, closer_id')
          .in('closer_id', closerIds)
          .gte('scheduled_date', startDate).lte('scheduled_date', endDate),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const profiles = profilesResult.data || [];
      const allAppointments = appointmentsResult.data || [];

      const rankings: { byConversao: RankingEntry[]; byValor: RankingEntry[] } = {
        byConversao: [],
        byValor: [],
      };

      for (const profile of profiles) {
        const appointments = allAppointments.filter(a => a.closer_id === profile.user_id);
        const realizadas = appointments.filter(a => a.status === 'realizado').length;
        const conversoes = appointments.filter(a => a.converted).length;
        const taxaConversao = realizadas > 0 ? (conversoes / realizadas) * 100 : 0;
        const valorTotal = appointments
          .filter(a => a.converted && a.conversion_value)
          .reduce((sum, a) => sum + Number(a.conversion_value), 0);

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

// Optimized: 4 queries total instead of 2*N+2 (N = number of SDRs)
export function useAllSDRsPerformance(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['all-sdrs-performance', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: sdrRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'sdr');
      if (rolesError) throw rolesError;

      const sdrIds = sdrRoles?.map(r => r.user_id) || [];
      if (sdrIds.length === 0) return [];

      const [profilesResult, leadsResult, appointmentsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, name').in('user_id', sdrIds).eq('active', true),
        supabase.from('leads').select('id, status, assigned_sdr_id')
          .in('assigned_sdr_id', sdrIds)
          .gte('created_at', startDate).lte('created_at', endDate),
        supabase.from('appointments').select('id, converted, lead_id')
          .gte('created_at', startDate).lte('created_at', endDate),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (leadsResult.error) throw leadsResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const profiles = profilesResult.data || [];
      const allLeads = leadsResult.data || [];
      const allAppointments = appointmentsResult.data || [];

      return profiles.map((profile) => {
        const leads = allLeads.filter(l => l.assigned_sdr_id === profile.user_id);
        const leadIds = new Set(leads.map(l => l.id));
        const sdrAppointments = allAppointments.filter(a => a.lead_id && leadIds.has(a.lead_id));
        const conversoes = sdrAppointments.filter(a => a.converted).length;

        return {
          name: profile.name,
          atribuidos: leads.length,
          agendados: leads.filter(l => l.status === 'agendado').length,
          convertidos: conversoes,
        };
      });
    },
  });
}

// Optimized: 3 queries total instead of N+2 (N = number of closers)
export function useAllClosersPerformance(dateRange: DateRange = defaultDateRange) {
  return useQuery({
    queryKey: ['all-closers-performance', dateRange.from, dateRange.to],
    queryFn: async () => {
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();

      const { data: closerRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'closer');
      if (rolesError) throw rolesError;

      const closerIds = closerRoles?.map(r => r.user_id) || [];
      if (closerIds.length === 0) return [];

      const [profilesResult, appointmentsResult] = await Promise.all([
        supabase.from('profiles').select('user_id, name').in('user_id', closerIds).eq('active', true),
        supabase.from('appointments').select('id, status, converted, conversion_value, closer_id')
          .in('closer_id', closerIds)
          .gte('scheduled_date', startDate).lte('scheduled_date', endDate),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (appointmentsResult.error) throw appointmentsResult.error;

      const profiles = profilesResult.data || [];
      const allAppointments = appointmentsResult.data || [];

      return profiles.map((profile) => {
        const appointments = allAppointments.filter(a => a.closer_id === profile.user_id);

        return {
          name: profile.name,
          agendadas: appointments.length,
          realizadas: appointments.filter(a => a.status === 'realizado').length,
          conversoes: appointments.filter(a => a.converted).length,
          valor: appointments
            .filter(a => a.converted && a.conversion_value)
            .reduce((sum, a) => sum + Number(a.conversion_value), 0),
        };
      });
    },
  });
}
