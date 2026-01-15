// Types matching our Supabase database schema

export type AppRole = 'admin' | 'lider' | 'sdr' | 'closer';
export type LeadClassification = 'diamante' | 'ouro' | 'prata' | 'bronze';
export type LeadStatus = 'novo' | 'em_atendimento' | 'agendado' | 'concluido';
export type AppointmentStatus = 'agendado' | 'reagendado' | 'realizado' | 'nao_compareceu';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  timezone: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Funnel {
  id: string;
  name: string;
  google_sheet_url: string | null;
  sheet_name: string | null;
  column_mapping: Record<string, string>;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
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
  classification: LeadClassification;
  qualification: string | null;
  assigned_sdr_id: string | null;
  status: LeadStatus;
  custom_fields: Record<string, unknown>;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualificationRule {
  id: string;
  funnel_id: string | null;
  rule_name: string;
  conditions: RuleCondition[];
  qualification_label: string;
  classification: LeadClassification | null;
  priority: number;
  active: boolean;
  created_at: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains';
  value: string | number;
  logic?: 'AND' | 'OR';
}

export interface CrmColumn {
  id: string;
  name: string;
  position: number;
  color: string;
  editable: boolean;
  created_at: string;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  column_id: string | null;
  user_id: string | null;
  notes: string | null;
  tags: string[];
  action_type: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: string;
  lead_id: string;
  sdr_id: string | null;
  closer_id: string | null;
  funnel_id: string | null;
  qualification: string | null;
  scheduled_date: string;
  duration: number;
  timezone: string;
  google_calendar_event_id: string | null;
  status: AppointmentStatus;
  reschedule_count: number;
  attended: boolean | null;
  converted: boolean | null;
  conversion_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloserAvailability {
  id: string;
  closer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface LeadDistributionLog {
  id: string;
  distributed_by: string | null;
  funnel_id: string | null;
  leads_count: number;
  sdr_ids: string[];
  distribution_mode: string;
  created_at: string;
}

// Extended types with relations
export interface LeadWithRelations extends Lead {
  funnel?: Funnel | null;
  assigned_sdr?: Profile | null;
}

export interface AppointmentWithRelations extends Appointment {
  lead?: Lead | null;
  sdr?: Profile | null;
  closer?: Profile | null;
  funnel?: Funnel | null;
}

export interface ProfileWithRole extends Profile {
  role?: AppRole;
}
