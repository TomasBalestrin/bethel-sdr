-- ============================================================
-- BETHEL SDR - COMPLETE DATABASE MIGRATION
-- New Supabase Project: zlijqelcmweqwkivmnag
-- Generated: 2026-03-03
-- ============================================================

-- ============================================================
-- PART 1: ENUM TYPES
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'lider', 'sdr', 'closer');
CREATE TYPE public.lead_classification AS ENUM ('diamante', 'ouro', 'prata', 'bronze');
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_atendimento', 'agendado', 'concluido');
CREATE TYPE public.appointment_status AS ENUM ('agendado', 'reagendado', 'realizado', 'nao_compareceu');

-- ============================================================
-- PART 2: CORE TABLES
-- ============================================================

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Funnels
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_sheet_url TEXT,
  sheet_name TEXT,
  column_mapping JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  auto_sync_enabled BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_interval_minutes INTEGER DEFAULT 30,
  import_from_date DATE DEFAULT '2026-01-01',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- CRM Columns (created before leads because leads references it)
CREATE TABLE public.crm_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT NOT NULL DEFAULT '#64748b',
  editable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default CRM columns
INSERT INTO public.crm_columns (name, position, color, editable) VALUES
  ('Contato Inicial', 1, '#2563eb', false),
  ('Aguardando Resposta', 2, '#eab308', true),
  ('Processo de Ligação', 3, '#f97316', true),
  ('Agendado', 4, '#16a34a', false),
  ('Call Realizada', 5, '#7c3aed', false);

-- Leads
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  revenue DECIMAL,
  niche TEXT,
  instagram TEXT,
  main_pain TEXT,
  difficulty TEXT,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  classification lead_classification DEFAULT 'bronze',
  qualification TEXT,
  assigned_sdr_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status lead_status NOT NULL DEFAULT 'novo',
  custom_fields JSONB DEFAULT '{}',
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  state TEXT,
  business_name TEXT,
  business_position TEXT CHECK (business_position IN ('dono', 'nao_dono')),
  has_partner BOOLEAN,
  knows_specialist_since TEXT,
  distributed_at TIMESTAMPTZ,
  distribution_origin TEXT CHECK (distribution_origin IN ('manual', 'automatic')),
  crm_column_id UUID REFERENCES public.crm_columns(id),
  sheet_row_id TEXT,
  sheet_source_url TEXT,
  form_filled_at TIMESTAMP WITH TIME ZONE
);

-- Qualification Rules
CREATE TABLE public.qualification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]',
  qualification_label TEXT NOT NULL,
  classification lead_classification,
  priority INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lead Activities
CREATE TABLE public.lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  column_id UUID REFERENCES public.crm_columns(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  action_type TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  sdr_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  closer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  qualification TEXT,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL DEFAULT 90,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  google_calendar_event_id TEXT,
  status appointment_status NOT NULL DEFAULT 'agendado',
  reschedule_count INTEGER NOT NULL DEFAULT 0,
  attended BOOLEAN,
  converted BOOLEAN,
  conversion_value DECIMAL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Closer Availability
CREATE TABLE public.closer_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (closer_id, day_of_week)
);

-- Activity Logs
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Distribution Rules
CREATE TABLE public.distribution_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
  classifications TEXT[] DEFAULT '{}',
  sdr_ids UUID[] NOT NULL,
  max_leads_per_sdr INTEGER DEFAULT 50,
  active BOOLEAN DEFAULT true,
  schedule_enabled BOOLEAN DEFAULT false,
  schedule_days INTEGER[] DEFAULT '{}',
  schedule_time TIME DEFAULT '09:00',
  distribution_mode TEXT DEFAULT 'equal' CHECK (distribution_mode IN ('equal', 'percentage', 'funnel_limit')),
  sdr_percentages JSONB DEFAULT '{}',
  sdr_funnel_limits JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lead Distribution Logs
CREATE TABLE public.lead_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES public.distribution_rules(id) ON DELETE SET NULL,
  leads_count INTEGER NOT NULL,
  sdr_ids UUID[] NOT NULL,
  distribution_mode TEXT NOT NULL,
  classifications TEXT[],
  lead_ids UUID[],
  workload_snapshot JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Niches
CREATE TABLE public.niches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default niches
INSERT INTO public.niches (name) VALUES
  ('Salão de Beleza'),
  ('Barbearia'),
  ('Clínica Estética'),
  ('Academia'),
  ('Consultório Médico'),
  ('Consultório Odontológico'),
  ('Escritório de Advocacia'),
  ('Escritório de Contabilidade'),
  ('Agência de Marketing'),
  ('E-commerce'),
  ('Restaurante'),
  ('Loja de Roupas'),
  ('Imobiliária'),
  ('Educação/Cursos'),
  ('Tecnologia/SaaS'),
  ('Coaching/Mentoria'),
  ('Fotografia'),
  ('Arquitetura/Design'),
  ('Pet Shop'),
  ('Outros')
ON CONFLICT (name) DO NOTHING;

-- SDR Capacities
CREATE TABLE public.sdr_capacities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE CASCADE,
  max_leads INTEGER DEFAULT 50,
  percentage NUMERIC(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sdr_id, funnel_id)
);

-- Cleanup Logs
CREATE TABLE public.cleanup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID,
  lead_data JSONB NOT NULL,
  cleanup_reason TEXT NOT NULL CHECK (cleanup_reason IN ('bronze', 'nao_fit', 'manual')),
  google_sheet_row INTEGER,
  google_sheet_url TEXT,
  sheet_name TEXT,
  exported_at TIMESTAMP WITH TIME ZONE,
  cleaned_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PART 3: INDEXES
-- ============================================================

CREATE INDEX idx_leads_funnel ON public.leads(funnel_id);
CREATE INDEX idx_leads_sdr ON public.leads(assigned_sdr_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_classification ON public.leads(classification);
CREATE INDEX idx_leads_created ON public.leads(created_at);
CREATE INDEX idx_leads_crm_column_id ON public.leads(crm_column_id);
CREATE INDEX idx_leads_sheet_row_id ON public.leads(sheet_row_id);
CREATE INDEX idx_leads_sheet_source_url ON public.leads(sheet_source_url);
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX idx_appointments_sdr ON public.appointments(sdr_id);
CREATE INDEX idx_appointments_closer ON public.appointments(closer_id);
CREATE INDEX idx_appointments_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX idx_activities_user ON public.lead_activities(user_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at);

-- ============================================================
-- PART 4: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qualification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_distribution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sdr_capacities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: SECURITY FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_lider(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'lider')
  )
$$;

-- ============================================================
-- PART 6: TIMESTAMP TRIGGER FUNCTION & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_funnels_updated_at
  BEFORE UPDATE ON public.funnels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_distribution_rules_updated_at
  BEFORE UPDATE ON public.distribution_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sdr_capacities_updated_at
  BEFORE UPDATE ON public.sdr_capacities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART 7: NEW USER REGISTRATION HANDLER
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, timezone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'America/Sao_Paulo')
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'sdr')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- PART 8: NOTIFICATION TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND NEW.assigned_sdr_id IS DISTINCT FROM OLD.assigned_sdr_id AND NEW.assigned_sdr_id IS NOT NULL)
     OR (TG_OP = 'INSERT' AND NEW.assigned_sdr_id IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.assigned_sdr_id,
      'Novo lead atribuído',
      'Um novo lead foi atribuído a você: ' || NEW.full_name,
      'info',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.full_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_assignment
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_assignment();

CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_name TEXT;
BEGIN
  SELECT full_name INTO lead_name FROM public.leads WHERE id = NEW.lead_id;

  IF NEW.closer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.closer_id,
      'Novo agendamento',
      'Você tem um novo agendamento com ' || COALESCE(lead_name, 'um lead') || ' às ' || to_char(NEW.scheduled_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI'),
      'success',
      jsonb_build_object('appointment_id', NEW.id, 'lead_name', lead_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_appointment_created();

-- ============================================================
-- PART 9: QUALIFICATION ENGINE
-- ============================================================

CREATE OR REPLACE FUNCTION public.apply_qualification_rules(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule RECORD;
  v_condition RECORD;
  v_lead RECORD;
  v_field_value TEXT;
  v_match BOOLEAN;
  v_condition_met BOOLEAN;
  v_conditions JSONB;
  v_first_logic TEXT;
BEGIN
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  FOR v_rule IN
    SELECT * FROM public.qualification_rules
    WHERE active = true
      AND (funnel_id IS NULL OR funnel_id = v_lead.funnel_id)
    ORDER BY priority ASC
  LOOP
    v_conditions := v_rule.conditions;

    IF v_conditions IS NULL OR jsonb_array_length(v_conditions) = 0 THEN
      CONTINUE;
    END IF;

    v_first_logic := COALESCE(v_conditions->0->>'logic', 'AND');
    v_match := CASE WHEN v_first_logic = 'OR' THEN false ELSE true END;

    FOR v_condition IN
      SELECT * FROM jsonb_array_elements(v_conditions) AS c
    LOOP
      v_field_value := CASE (v_condition.value->>'field')
        WHEN 'revenue' THEN v_lead.revenue::TEXT
        WHEN 'niche' THEN v_lead.niche
        WHEN 'state' THEN v_lead.state
        WHEN 'business_position' THEN v_lead.business_position
        WHEN 'has_partner' THEN v_lead.has_partner::TEXT
        WHEN 'main_pain' THEN v_lead.main_pain
        WHEN 'difficulty' THEN v_lead.difficulty
        WHEN 'full_name' THEN v_lead.full_name
        WHEN 'email' THEN v_lead.email
        WHEN 'phone' THEN v_lead.phone
        WHEN 'business_name' THEN v_lead.business_name
        WHEN 'instagram' THEN v_lead.instagram
        WHEN 'knows_specialist_since' THEN v_lead.knows_specialist_since
        ELSE v_lead.custom_fields ->> (v_condition.value->>'field')
      END;

      v_condition_met := CASE (v_condition.value->>'operator')
        WHEN 'equals' THEN
          LOWER(COALESCE(v_field_value, '')) = LOWER(COALESCE(v_condition.value->>'value', ''))
        WHEN 'not_equals' THEN
          LOWER(COALESCE(v_field_value, '')) != LOWER(COALESCE(v_condition.value->>'value', ''))
        WHEN 'greater_than' THEN
          COALESCE(v_field_value, '0')::NUMERIC > COALESCE(v_condition.value->>'value', '0')::NUMERIC
        WHEN 'less_than' THEN
          COALESCE(v_field_value, '0')::NUMERIC < COALESCE(v_condition.value->>'value', '0')::NUMERIC
        WHEN 'contains' THEN
          COALESCE(v_field_value, '') ILIKE '%' || COALESCE(v_condition.value->>'value', '') || '%'
        WHEN 'not_contains' THEN
          COALESCE(v_field_value, '') NOT ILIKE '%' || COALESCE(v_condition.value->>'value', '') || '%'
        ELSE false
      END;

      IF COALESCE(v_condition.value->>'logic', 'AND') = 'OR' THEN
        v_match := v_match OR v_condition_met;
      ELSE
        v_match := v_match AND v_condition_met;
      END IF;
    END LOOP;

    IF v_match THEN
      UPDATE public.leads
      SET classification = v_rule.classification,
          qualification = v_rule.qualification_label
      WHERE id = p_lead_id;
      RETURN;
    END IF;
  END LOOP;

  UPDATE public.leads
  SET classification = 'bronze',
      qualification = NULL
  WHERE id = p_lead_id
    AND (classification IS NULL);
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_qualify_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.apply_qualification_rules(NEW.id);
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_qualify_lead_after_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qualify_lead();

-- ============================================================
-- PART 10: RLS POLICIES
-- ============================================================

-- == Profiles ==
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and Lider can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- == User Roles ==
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and Lider can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- == Funnels ==
CREATE POLICY "Authenticated users can view funnels"
  ON public.funnels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage funnels"
  ON public.funnels FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- == Leads ==
CREATE POLICY "Admin and Lider can view all leads"
  ON public.leads FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "SDR can view assigned leads"
  ON public.leads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'sdr')
    AND assigned_sdr_id = auth.uid()
  );

CREATE POLICY "Admin and Lider can manage leads"
  ON public.leads FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "SDR can update assigned leads"
  ON public.leads FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'sdr')
    AND assigned_sdr_id = auth.uid()
  );

-- == Qualification Rules ==
CREATE POLICY "Authenticated users can view rules"
  ON public.qualification_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage rules"
  ON public.qualification_rules FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- == CRM Columns ==
CREATE POLICY "Authenticated users can view columns"
  ON public.crm_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage columns"
  ON public.crm_columns FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- == Lead Activities ==
CREATE POLICY "Admin and Lider can view all activities"
  ON public.lead_activities FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Users can view own activities"
  ON public.lead_activities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- == Appointments ==
CREATE POLICY "Admin and Lider can view all appointments"
  ON public.appointments FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "SDR can view all appointments"
  ON public.appointments FOR SELECT
  USING (public.has_role(auth.uid(), 'sdr'));

CREATE POLICY "Closer can view own appointments"
  ON public.appointments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'closer')
    AND closer_id = auth.uid()
  );

CREATE POLICY "SDR can create appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'sdr') AND sdr_id = auth.uid());

CREATE POLICY "Admin and Lider can manage appointments"
  ON public.appointments FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Closer can update own appointments"
  ON public.appointments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'closer')
    AND closer_id = auth.uid()
  );

-- == Closer Availability ==
CREATE POLICY "Authenticated users can view availability"
  ON public.closer_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage availability"
  ON public.closer_availability FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- == Activity Logs ==
CREATE POLICY "Admin can view all logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Lider can view logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'lider'));

CREATE POLICY "Authenticated users can create own logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- == Lead Distribution Logs ==
CREATE POLICY "Admin and Lider can view distribution logs"
  ON public.lead_distribution_logs FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Admin and Lider can create distribution logs"
  ON public.lead_distribution_logs FOR INSERT
  WITH CHECK (public.is_admin_or_lider(auth.uid()));

-- == Distribution Rules ==
CREATE POLICY "Admin e Líder podem gerenciar regras"
  ON public.distribution_rules FOR ALL
  TO authenticated
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Usuários autenticados podem visualizar regras"
  ON public.distribution_rules FOR SELECT
  TO authenticated
  USING (true);

-- == Notifications ==
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- == Niches ==
CREATE POLICY "Authenticated users can view niches"
  ON public.niches FOR SELECT
  USING (true);

CREATE POLICY "Admin and Lider can manage niches"
  ON public.niches FOR ALL
  USING (is_admin_or_lider(auth.uid()));

-- == SDR Capacities ==
CREATE POLICY "Admin and Lider can manage SDR capacities"
  ON public.sdr_capacities FOR ALL
  USING (is_admin_or_lider(auth.uid()));

CREATE POLICY "Authenticated users can view SDR capacities"
  ON public.sdr_capacities FOR SELECT
  USING (true);

-- == Cleanup Logs ==
CREATE POLICY "Admin and Lider can view cleanup logs"
  ON public.cleanup_logs FOR SELECT
  USING (is_admin_or_lider(auth.uid()));

CREATE POLICY "Admin and Lider can insert cleanup logs"
  ON public.cleanup_logs FOR INSERT
  WITH CHECK (is_admin_or_lider(auth.uid()));

-- ============================================================
-- PART 11: ENABLE REALTIME FOR NOTIFICATIONS
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ============================================================
-- MIGRATION COMPLETE!
-- ============================================================
