import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LeaderDashboardFilters {
  funnelId?: string;
  niche?: string;
  revenueMin?: number;
  revenueMax?: number;
  state?: string;
  businessPosition?: 'dono' | 'nao_dono';
  classification?: string[];
  distributedStartDate?: string;
  distributedEndDate?: string;
  sdrId?: string;
  entryStartDate?: string;
  entryEndDate?: string;
  distributionStatus?: 'distributed' | 'not_distributed' | 'all';
}

export interface LeadWithDetails {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  revenue: number | null;
  niche: string | null;
  instagram: string | null;
  main_pain: string | null;
  difficulty: string | null;
  funnel_id: string | null;
  classification: string | null;
  qualification: string | null;
  assigned_sdr_id: string | null;
  status: string;
  state: string | null;
  business_name: string | null;
  business_position: string | null;
  has_partner: boolean | null;
  knows_specialist_since: string | null;
  distributed_at: string | null;
  distribution_origin: string | null;
  created_at: string;
  updated_at: string;
  funnel?: { id: string; name: string } | null;
  assigned_sdr?: { id: string; name: string; email: string } | null;
}

export function useLeaderDashboard(filters: LeaderDashboardFilters = {}, limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['leader-dashboard', filters, limit, offset],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select(`
          *,
          funnel:funnels(id, name),
          assigned_sdr:profiles!assigned_sdr_id(id, name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (filters.funnelId) {
        query = query.eq('funnel_id', filters.funnelId);
      }

      if (filters.niche) {
        query = query.eq('niche', filters.niche);
      }

      if (filters.revenueMin !== undefined) {
        query = query.gte('revenue', filters.revenueMin);
      }

      if (filters.revenueMax !== undefined) {
        query = query.lte('revenue', filters.revenueMax);
      }

      if (filters.state) {
        query = query.eq('state', filters.state);
      }

      if (filters.businessPosition) {
        query = query.eq('business_position', filters.businessPosition);
      }

      if (filters.classification && filters.classification.length > 0) {
        query = query.in('classification', filters.classification as ('diamante' | 'ouro' | 'prata' | 'bronze')[]);
      }

      if (filters.sdrId) {
        query = query.eq('assigned_sdr_id', filters.sdrId);
      }

      if (filters.distributedStartDate) {
        query = query.gte('distributed_at', filters.distributedStartDate);
      }

      if (filters.distributedEndDate) {
        query = query.lte('distributed_at', filters.distributedEndDate);
      }

      if (filters.entryStartDate) {
        query = query.gte('created_at', filters.entryStartDate);
      }

      if (filters.entryEndDate) {
        query = query.lte('created_at', filters.entryEndDate);
      }

      if (filters.distributionStatus === 'distributed') {
        query = query.not('assigned_sdr_id', 'is', null);
      } else if (filters.distributionStatus === 'not_distributed') {
        query = query.is('assigned_sdr_id', null);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        leads: data as unknown as LeadWithDetails[],
        total: count || 0,
      };
    },
  });
}

export function useLeaderDashboardStats() {
  return useQuery({
    queryKey: ['leader-dashboard-stats'],
    queryFn: async () => {
      const [totalResult, distributedResult, notDistributedResult, todayResult] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).not('assigned_sdr_id', 'is', null),
        supabase.from('leads').select('*', { count: 'exact', head: true }).is('assigned_sdr_id', null),
        supabase.from('leads').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().split('T')[0]),
      ]);

      return {
        total: totalResult.count || 0,
        distributed: distributedResult.count || 0,
        notDistributed: notDistributedResult.count || 0,
        today: todayResult.count || 0,
      };
    },
  });
}

// Brazilian states
export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export const REVENUE_RANGES = [
  { label: 'Até R$ 10.000', min: 0, max: 10000 },
  { label: 'R$ 10.000 - R$ 50.000', min: 10000, max: 50000 },
  { label: 'R$ 50.000 - R$ 100.000', min: 50000, max: 100000 },
  { label: 'R$ 100.000 - R$ 500.000', min: 100000, max: 500000 },
  { label: 'Acima de R$ 500.000', min: 500000, max: undefined },
];
