import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ActivityLog } from '@/types/database';

interface ActivityLogWithUser extends ActivityLog {
  user?: { name: string; email: string } | null;
}

interface ActivityLogFilters {
  entityType?: string;
  userId?: string;
  limit?: number;
}

export function useActivityLogs(filters?: ActivityLogFilters) {
  return useQuery({
    queryKey: ['activity-logs', filters],
    queryFn: async () => {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:profiles!activity_logs_user_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.entityType) {
        query = query.eq('entity_type', filters.entityType);
      }

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActivityLogWithUser[];
    },
  });
}

export function useActivityLogEntityTypes() {
  return useQuery({
    queryKey: ['activity-log-entity-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('entity_type')
        .limit(1000);

      if (error) throw error;
      const types = [...new Set((data || []).map(d => d.entity_type))].sort();
      return types;
    },
  });
}
