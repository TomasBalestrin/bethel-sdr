import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Appointment, AppointmentStatus, AppointmentWithRelations } from '@/types/database';
import { toast } from 'sonner';

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
      // Get current reschedule count
      const { data: current, error: fetchError } = await supabase
        .from('appointments')
        .select('reschedule_count')
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
      const convertidos = data.filter(a => a.converted).length;
      const valorTotal = data.reduce((sum, a) => sum + (a.conversion_value || 0), 0);

      return {
        total,
        agendados,
        realizados,
        naoCompareceu,
        convertidos,
        valorTotal,
        taxaComparecimento: total > 0 ? (realizados / total) * 100 : 0,
        taxaConversao: realizados > 0 ? (convertidos / realizados) * 100 : 0,
      };
    },
  });
}
