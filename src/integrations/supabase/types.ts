export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          attended: boolean | null
          closer_id: string | null
          conversion_value: number | null
          converted: boolean | null
          created_at: string
          duration: number
          funnel_id: string | null
          google_calendar_event_id: string | null
          id: string
          lead_id: string
          notes: string | null
          qualification: string | null
          reschedule_count: number
          scheduled_date: string
          sdr_id: string | null
          status: Database["public"]["Enums"]["appointment_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          attended?: boolean | null
          closer_id?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          created_at?: string
          duration?: number
          funnel_id?: string | null
          google_calendar_event_id?: string | null
          id?: string
          lead_id: string
          notes?: string | null
          qualification?: string | null
          reschedule_count?: number
          scheduled_date: string
          sdr_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          attended?: boolean | null
          closer_id?: string | null
          conversion_value?: number | null
          converted?: boolean | null
          created_at?: string
          duration?: number
          funnel_id?: string | null
          google_calendar_event_id?: string | null
          id?: string
          lead_id?: string
          notes?: string | null
          qualification?: string | null
          reschedule_count?: number
          scheduled_date?: string
          sdr_id?: string | null
          status?: Database["public"]["Enums"]["appointment_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_closer_profile_fkey"
            columns: ["closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_sdr_profile_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cleanup_logs: {
        Row: {
          cleaned_at: string | null
          cleanup_reason: string
          exported_at: string | null
          google_sheet_row: number | null
          google_sheet_url: string | null
          id: string
          lead_data: Json
          lead_id: string | null
          sheet_name: string | null
        }
        Insert: {
          cleaned_at?: string | null
          cleanup_reason: string
          exported_at?: string | null
          google_sheet_row?: number | null
          google_sheet_url?: string | null
          id?: string
          lead_data: Json
          lead_id?: string | null
          sheet_name?: string | null
        }
        Update: {
          cleaned_at?: string | null
          cleanup_reason?: string
          exported_at?: string | null
          google_sheet_row?: number | null
          google_sheet_url?: string | null
          id?: string
          lead_data?: Json
          lead_id?: string | null
          sheet_name?: string | null
        }
        Relationships: []
      }
      closer_availability: {
        Row: {
          active: boolean
          break_end: string | null
          break_start: string | null
          closer_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          active?: boolean
          break_end?: string | null
          break_start?: string | null
          closer_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          active?: boolean
          break_end?: string | null
          break_start?: string | null
          closer_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: []
      }
      crm_columns: {
        Row: {
          color: string
          created_at: string
          editable: boolean
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string
          editable?: boolean
          id?: string
          name: string
          position: number
        }
        Update: {
          color?: string
          created_at?: string
          editable?: boolean
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      distribution_rules: {
        Row: {
          active: boolean | null
          classifications: string[] | null
          created_at: string | null
          created_by: string | null
          distribution_mode: string | null
          funnel_id: string | null
          id: string
          max_leads_per_sdr: number | null
          name: string
          schedule_days: number[] | null
          schedule_enabled: boolean | null
          schedule_time: string | null
          sdr_funnel_limits: Json | null
          sdr_ids: string[]
          sdr_percentages: Json | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          classifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          distribution_mode?: string | null
          funnel_id?: string | null
          id?: string
          max_leads_per_sdr?: number | null
          name: string
          schedule_days?: number[] | null
          schedule_enabled?: boolean | null
          schedule_time?: string | null
          sdr_funnel_limits?: Json | null
          sdr_ids: string[]
          sdr_percentages?: Json | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          classifications?: string[] | null
          created_at?: string | null
          created_by?: string | null
          distribution_mode?: string | null
          funnel_id?: string | null
          id?: string
          max_leads_per_sdr?: number | null
          name?: string
          schedule_days?: number[] | null
          schedule_enabled?: boolean | null
          schedule_time?: string | null
          sdr_funnel_limits?: Json | null
          sdr_ids?: string[]
          sdr_percentages?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distribution_rules_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      funnels: {
        Row: {
          active: boolean
          auto_sync_enabled: boolean | null
          column_mapping: Json | null
          created_at: string
          google_sheet_url: string | null
          id: string
          last_sync_at: string | null
          name: string
          sheet_name: string | null
          sync_interval_minutes: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          auto_sync_enabled?: boolean | null
          column_mapping?: Json | null
          created_at?: string
          google_sheet_url?: string | null
          id?: string
          last_sync_at?: string | null
          name: string
          sheet_name?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          auto_sync_enabled?: boolean | null
          column_mapping?: Json | null
          created_at?: string
          google_sheet_url?: string | null
          id?: string
          last_sync_at?: string | null
          name?: string
          sheet_name?: string | null
          sync_interval_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      lead_activities: {
        Row: {
          action_type: string
          column_id: string | null
          created_at: string
          details: Json | null
          id: string
          lead_id: string
          notes: string | null
          tags: string[] | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          column_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          lead_id: string
          notes?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          column_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          lead_id?: string
          notes?: string | null
          tags?: string[] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "crm_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      lead_distribution_logs: {
        Row: {
          classifications: string[] | null
          created_at: string
          distributed_by: string | null
          distribution_mode: string
          funnel_id: string | null
          id: string
          lead_ids: string[] | null
          leads_count: number
          rule_id: string | null
          sdr_ids: string[]
          workload_snapshot: Json | null
        }
        Insert: {
          classifications?: string[] | null
          created_at?: string
          distributed_by?: string | null
          distribution_mode: string
          funnel_id?: string | null
          id?: string
          lead_ids?: string[] | null
          leads_count: number
          rule_id?: string | null
          sdr_ids: string[]
          workload_snapshot?: Json | null
        }
        Update: {
          classifications?: string[] | null
          created_at?: string
          distributed_by?: string | null
          distribution_mode?: string
          funnel_id?: string | null
          id?: string
          lead_ids?: string[] | null
          leads_count?: number
          rule_id?: string | null
          sdr_ids?: string[]
          workload_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_distribution_logs_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_distribution_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "distribution_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_sdr_id: string | null
          business_name: string | null
          business_position: string | null
          classification:
            | Database["public"]["Enums"]["lead_classification"]
            | null
          created_at: string
          crm_column_id: string | null
          custom_fields: Json | null
          difficulty: string | null
          distributed_at: string | null
          distribution_origin: string | null
          email: string | null
          full_name: string
          funnel_id: string | null
          has_partner: boolean | null
          id: string
          imported_at: string | null
          instagram: string | null
          knows_specialist_since: string | null
          main_pain: string | null
          niche: string | null
          phone: string | null
          qualification: string | null
          revenue: number | null
          sheet_row_id: string | null
          sheet_source_url: string | null
          state: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          assigned_sdr_id?: string | null
          business_name?: string | null
          business_position?: string | null
          classification?:
            | Database["public"]["Enums"]["lead_classification"]
            | null
          created_at?: string
          crm_column_id?: string | null
          custom_fields?: Json | null
          difficulty?: string | null
          distributed_at?: string | null
          distribution_origin?: string | null
          email?: string | null
          full_name: string
          funnel_id?: string | null
          has_partner?: boolean | null
          id?: string
          imported_at?: string | null
          instagram?: string | null
          knows_specialist_since?: string | null
          main_pain?: string | null
          niche?: string | null
          phone?: string | null
          qualification?: string | null
          revenue?: number | null
          sheet_row_id?: string | null
          sheet_source_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          assigned_sdr_id?: string | null
          business_name?: string | null
          business_position?: string | null
          classification?:
            | Database["public"]["Enums"]["lead_classification"]
            | null
          created_at?: string
          crm_column_id?: string | null
          custom_fields?: Json | null
          difficulty?: string | null
          distributed_at?: string | null
          distribution_origin?: string | null
          email?: string | null
          full_name?: string
          funnel_id?: string | null
          has_partner?: boolean | null
          id?: string
          imported_at?: string | null
          instagram?: string | null
          knows_specialist_since?: string | null
          main_pain?: string | null
          niche?: string | null
          phone?: string | null
          qualification?: string | null
          revenue?: number | null
          sheet_row_id?: string | null
          sheet_source_url?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_sdr_profile_fkey"
            columns: ["assigned_sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leads_crm_column_id_fkey"
            columns: ["crm_column_id"]
            isOneToOne: false
            referencedRelation: "crm_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      niches: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id?: string
          name: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qualification_rules: {
        Row: {
          active: boolean
          classification:
            | Database["public"]["Enums"]["lead_classification"]
            | null
          conditions: Json
          created_at: string
          funnel_id: string | null
          id: string
          priority: number
          qualification_label: string
          rule_name: string
        }
        Insert: {
          active?: boolean
          classification?:
            | Database["public"]["Enums"]["lead_classification"]
            | null
          conditions?: Json
          created_at?: string
          funnel_id?: string | null
          id?: string
          priority?: number
          qualification_label: string
          rule_name: string
        }
        Update: {
          active?: boolean
          classification?:
            | Database["public"]["Enums"]["lead_classification"]
            | null
          conditions?: Json
          created_at?: string
          funnel_id?: string | null
          id?: string
          priority?: number
          qualification_label?: string
          rule_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualification_rules_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_capacities: {
        Row: {
          active: boolean | null
          created_at: string | null
          funnel_id: string | null
          id: string
          max_leads: number | null
          percentage: number | null
          sdr_id: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          max_leads?: number | null
          percentage?: number | null
          sdr_id: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          funnel_id?: string | null
          id?: string
          max_leads?: number | null
          percentage?: number | null
          sdr_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_capacities_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sdr_capacities_sdr_id_fkey"
            columns: ["sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_lider: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "lider" | "sdr" | "closer"
      appointment_status:
        | "agendado"
        | "reagendado"
        | "realizado"
        | "nao_compareceu"
      lead_classification: "diamante" | "ouro" | "prata" | "bronze"
      lead_status: "novo" | "em_atendimento" | "agendado" | "concluido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "lider", "sdr", "closer"],
      appointment_status: [
        "agendado",
        "reagendado",
        "realizado",
        "nao_compareceu",
      ],
      lead_classification: ["diamante", "ouro", "prata", "bronze"],
      lead_status: ["novo", "em_atendimento", "agendado", "concluido"],
    },
  },
} as const
