import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Appointment, AppointmentStatus } from '@/types/database';
import { toast } from 'sonner';
import { syncGoogleCalendar, buildEventData } from '@/lib/googleCalendarSync';

interface JoinedLeadInfo {
  full_name: string;
  phone: string | null;
  email: string | null;
  niche: string | null;
  revenue: number | null;
  main_pain: string | null;
}

interface JoinedCloserInfo {
  email: string;
}

interface AppointmentsFilters {
  closerId?: string;
  closerIds?: string[];
  sdrId?: string;
  status?: AppointmentStatus[];
  startDate?: string;
  endDate?: string;
}

export function useAppointments(filters?: AppointmentsFilters) {
  return useQuery({
    queryKey: ['appointments', filters],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          lead:leads(
            id, full_name, phone, email, classification, qualification,
            state, business_name, business_position, niche, instagram,
            revenue, main_pain, has_partner, knows_specialist_since
          ),
          sdr:profiles!appointments_sdr_profile_fkey(id, name, email),
          closer:profiles!appointments_closer_profile_fkey(id, name, email),
          funnel:funnels(id, name)
        `)
        .order('scheduled_date', { ascending: true });

      if (filters?.closerIds?.length) {
        query = query.in('closer_id', filters.closerIds);
      } else if (filters?.closerId) {
        query = query.eq('closer_id', filters.closerId);
      }

      if (filters?.sdrId) {
        query = query.eq('sdr_id', filters.sdrId);
      }

      if (filters?.status?.length) {
        query = query.in('status', filters.status);
      }

      if (filters?.startDate) {
        query = query.gte('scheduled_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('scheduled_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });
}

export function useAppointment(id: string) {
  return useQuery({
    queryKey: ['appointment', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          lead:leads(id, full_name, phone, email, classification, qualification),
          sdr:profiles!appointments_sdr_profile_fkey(id, name, email),
          closer:profiles!appointments_closer_profile_fkey(id, name, email),
          funnel:funnels(id, name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at' | 'reschedule_count'>) => {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointment)
        .select()
        .single();

      if (error) throw error;

      // Update lead status to agendado
      await supabase
        .from('leads')
        .update({ status: 'agendado' })
        .eq('id', appointment.lead_id);

      // Get lead and closer details for Google Calendar sync
      const [leadResult, closerResult] = await Promise.all([
        supabase.from('leads').select('full_name, phone, email, niche, revenue, main_pain').eq('id', appointment.lead_id).single(),
        supabase.from('profiles').select('email').eq('user_id', appointment.closer_id).single()
      ]);

      if (leadResult.data) {
        const eventData = buildEventData({
          leadName: leadResult.data.full_name,
          leadPhone: leadResult.data.phone,
          leadEmail: leadResult.data.email,
          niche: leadResult.data.niche,
          revenue: leadResult.data.revenue,
          challenge: leadResult.data.main_pain,
          scheduledDate: appointment.scheduled_date,
          duration: appointment.duration || 90,
          notes: appointment.notes,
        });

        syncGoogleCalendar({
          action: 'create',
          appointmentId: data.id,
          closerEmail: closerResult.data?.email,
          eventData,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Agendamento criado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao criar agendamento: ' + error.message);
    },
  });
}

export function useUpdateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Appointment> & { id: string }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento atualizado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar agendamento: ' + error.message);
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, scheduled_date }: { id: string; scheduled_date: string }) => {
      // Get current appointment data including lead and closer
      const { data: current, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          reschedule_count,
          duration,
          notes,
          lead:leads(full_name, phone, email, niche, revenue, main_pain),
          closer:profiles!appointments_closer_profile_fkey(email)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          scheduled_date,
          status: 'reagendado',
          reschedule_count: (current?.reschedule_count || 0) + 1
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Sync with Google Calendar
      if (current?.lead) {
        const lead = current.lead as JoinedLeadInfo;
        const closer = current.closer as JoinedCloserInfo | null;
        const eventData = buildEventData({
          leadName: lead.full_name,
          leadPhone: lead.phone,
          leadEmail: lead.email,
          niche: lead.niche,
          revenue: lead.revenue,
          challenge: lead.main_pain,
          scheduledDate: scheduled_date,
          duration: current.duration || 90,
          notes: current.notes,
        });

        syncGoogleCalendar({
          action: 'update',
          appointmentId: id,
          closerEmail: closer?.email,
          eventData,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Agendamento reagendado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao reagendar: ' + error.message);
    },
  });
}

export function useRegisterCallResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      attended, 
      converted, 
      conversion_value,
      notes 
    }: { 
      id: string; 
      attended: boolean; 
      converted?: boolean;
      conversion_value?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('appointments')
        .update({ 
          attended,
          converted: converted || false,
          conversion_value: conversion_value || null,
          notes,
          status: attended ? 'realizado' : 'nao_compareceu'
        })
        .eq('id', id)
        .select('*, lead_id')
        .single();

      if (error) throw error;

      // Update lead status to concluido
      await supabase
        .from('leads')
        .update({ status: 'concluido' })
        .eq('id', data.lead_id);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Resultado da call registrado');
    },
    onError: (error) => {
      toast.error('Erro ao registrar resultado: ' + error.message);
    },
  });
}

export function useAppointmentStats() {
  return useQuery({
    queryKey: ['appointments-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, status, attended, converted, conversion_value');

      if (error) throw error;

      const total = data.length;
      const agendados = data.filter(a => a.status === 'agendado').length;
      const realizados = data.filter(a => a.status === 'realizado').length;
      const naoCompareceu = data.filter(a => a.status === 'nao_compareceu').length;
      const cancelados = data.filter(a => a.status === 'cancelado').length;
      const convertidos = data.filter(a => a.converted).length;
      const valorTotal = data.reduce((sum, a) => sum + (a.conversion_value || 0), 0);

      return {
        total,
        agendados,
        realizados,
        naoCompareceu,
        cancelados,
        convertidos,
        valorTotal,
        taxaComparecimento: total > 0 ? (realizados / total) * 100 : 0,
      taxaConversao: realizados > 0 ? (convertidos / realizados) * 100 : 0,
    };
  },
});
}

export function useReassignAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, closerId }: { appointmentId: string; closerId: string }) => {
      // Get current appointment data
      const { data: current, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          scheduled_date,
          duration,
          notes,
          closer_id,
          lead:leads(full_name, phone, email, niche, revenue, main_pain),
          closer:profiles!appointments_closer_profile_fkey(email)
        `)
        .eq('id', appointmentId)
        .single();

      if (fetchError) throw fetchError;

      const { data, error } = await supabase
        .from('appointments')
        .update({ closer_id: closerId })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Get new closer email
      const { data: newCloser } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', closerId)
        .single();

      // Delete event from old closer's calendar
      if (current?.closer) {
        const oldCloser = current.closer as JoinedCloserInfo;
        syncGoogleCalendar({
          action: 'delete',
          appointmentId,
          closerEmail: oldCloser.email,
        });
      }

      // Create event in new closer's calendar
      if (current?.lead && newCloser) {
        const lead = current.lead as JoinedLeadInfo;
        const eventData = buildEventData({
          leadName: lead.full_name,
          leadPhone: lead.phone,
          leadEmail: lead.email,
          niche: lead.niche,
          revenue: lead.revenue,
          challenge: lead.main_pain,
          scheduledDate: current.scheduled_date,
          duration: current.duration || 90,
          notes: current.notes,
        });

        syncGoogleCalendar({
          action: 'create',
          appointmentId,
          closerEmail: newCloser.email,
          eventData,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success('Closer reatribuído com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao reatribuir closer: ' + error.message);
    },
  });
}
