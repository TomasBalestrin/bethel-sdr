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
  column_mapping: Record<string, string> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  // Sync fields
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
  sync_interval_minutes: number;
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
  classification: LeadClassification | null;
  qualification: string | null;
  assigned_sdr_id: string | null;
  status: LeadStatus;
  custom_fields: Record<string, unknown>;
  imported_at: string | null;
  created_at: string;
  updated_at: string;
  // New fields
  state: string | null;
  business_name: string | null;
  business_position: 'dono' | 'nao_dono' | null;
  has_partner: boolean | null;
  knows_specialist_since: string | null;
  distributed_at: string | null;
  distribution_origin: 'manual' | 'automatic' | null;
  crm_column_id: string | null;
}

export interface Niche {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface SDRCapacity {
  id: string;
  sdr_id: string;
  funnel_id: string | null;
  max_leads: number;
  percentage: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CleanupLog {
  id: string;
  lead_id: string | null;
  lead_data: Record<string, unknown>;
  cleanup_reason: 'bronze' | 'nao_fit' | 'manual';
  google_sheet_row: number | null;
  cleaned_at: string;
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

// Simplified lead info for appointments
export interface LeadBasicInfo {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  classification: LeadClassification;
  qualification?: string | null;
}

export interface AppointmentWithRelations extends Appointment {
  lead?: LeadBasicInfo | null;
  sdr?: Pick<Profile, 'id' | 'name' | 'email'> | null;
  closer?: Pick<Profile, 'id' | 'name' | 'email'> | null;
  funnel?: Pick<Funnel, 'id' | 'name'> | null;
}

export interface ProfileWithRole extends Profile {
  role?: AppRole;
}
