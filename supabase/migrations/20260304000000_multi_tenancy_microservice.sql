-- ============================================================
-- BETHEL SDR - MULTI-TENANCY & MICROSERVICE MIGRATION
-- Date: 2026-03-04
-- Purpose: Add organization scoping, webhook system, and
--          external auth support for microservice integration
-- ============================================================

-- ============================================================
-- PART 1: ORGANIZATIONS TABLE
-- ============================================================

CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB NOT NULL DEFAULT '{
    "timezone": "America/Sao_Paulo",
    "locale": "pt-BR",
    "default_appointment_duration": 90,
    "max_leads_per_page": 50,
    "cleanup_retention_hours": 24
  }',
  google_service_account_email TEXT,
  google_service_account_key_ref TEXT,
  cleanup_spreadsheet_id TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PART 2: ADD organization_id TO ALL TABLES
-- ============================================================

-- profiles
ALTER TABLE public.profiles
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- funnels
ALTER TABLE public.funnels
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- leads
ALTER TABLE public.leads
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- crm_columns
ALTER TABLE public.crm_columns
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- qualification_rules
ALTER TABLE public.qualification_rules
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- lead_activities
ALTER TABLE public.lead_activities
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- appointments
ALTER TABLE public.appointments
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- closer_availability
ALTER TABLE public.closer_availability
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- activity_logs
ALTER TABLE public.activity_logs
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- distribution_rules
ALTER TABLE public.distribution_rules
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- lead_distribution_logs
ALTER TABLE public.lead_distribution_logs
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- notifications
ALTER TABLE public.notifications
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- niches
ALTER TABLE public.niches
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- sdr_capacities
ALTER TABLE public.sdr_capacities
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- cleanup_logs
ALTER TABLE public.cleanup_logs
  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Indexes for organization_id on all tables
CREATE INDEX idx_profiles_org ON public.profiles(organization_id);
CREATE INDEX idx_funnels_org ON public.funnels(organization_id);
CREATE INDEX idx_leads_org ON public.leads(organization_id);
CREATE INDEX idx_crm_columns_org ON public.crm_columns(organization_id);
CREATE INDEX idx_qualification_rules_org ON public.qualification_rules(organization_id);
CREATE INDEX idx_lead_activities_org ON public.lead_activities(organization_id);
CREATE INDEX idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX idx_closer_availability_org ON public.closer_availability(organization_id);
CREATE INDEX idx_activity_logs_org ON public.activity_logs(organization_id);
CREATE INDEX idx_distribution_rules_org ON public.distribution_rules(organization_id);
CREATE INDEX idx_lead_distribution_logs_org ON public.lead_distribution_logs(organization_id);
CREATE INDEX idx_notifications_org ON public.notifications(organization_id);
CREATE INDEX idx_niches_org ON public.niches(organization_id);
CREATE INDEX idx_sdr_capacities_org ON public.sdr_capacities(organization_id);
CREATE INDEX idx_cleanup_logs_org ON public.cleanup_logs(organization_id);

-- ============================================================
-- PART 3: ORGANIZATION HELPER FUNCTIONS
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_organization(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.user_belongs_to_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND organization_id = _org_id
  )
$$;

-- Shortcut: current user's org
CREATE OR REPLACE FUNCTION public.my_org()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1
$$;

-- ============================================================
-- PART 4: UPDATE handle_new_user TRIGGER
-- Now requires organization_id in user_metadata
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _org_id UUID;
BEGIN
  _org_id := (NEW.raw_user_meta_data ->> 'organization_id')::UUID;

  INSERT INTO public.profiles (user_id, name, email, timezone, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'America/Sao_Paulo'),
    _org_id
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'sdr')
  );

  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 5: UPDATE NOTIFICATION TRIGGERS (add org_id)
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
    INSERT INTO public.notifications (user_id, title, message, type, metadata, organization_id)
    VALUES (
      NEW.assigned_sdr_id,
      'Novo lead atribuído',
      'Um novo lead foi atribuído a você: ' || NEW.full_name,
      'info',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.full_name),
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$;

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
    INSERT INTO public.notifications (user_id, title, message, type, metadata, organization_id)
    VALUES (
      NEW.closer_id,
      'Novo agendamento',
      'Você tem um novo agendamento com ' || COALESCE(lead_name, 'um lead') || ' às ' || to_char(NEW.scheduled_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI'),
      'success',
      jsonb_build_object('appointment_id', NEW.id, 'lead_name', lead_name),
      NEW.organization_id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 6: DROP ALL OLD RLS POLICIES & CREATE NEW ONES
-- ============================================================

-- == Organizations ==
CREATE POLICY "Users can view own organization"
  ON public.organizations FOR SELECT
  USING (id = public.my_org());

CREATE POLICY "Admin can update own organization"
  ON public.organizations FOR UPDATE
  USING (id = public.my_org() AND public.has_role(auth.uid(), 'admin'));

-- == Profiles (drop old, create new) ==
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin and Lider can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and Lider can view org profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admin can update org profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.my_org()
  );

CREATE POLICY "Admin can insert org profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.my_org()
  );

-- == User Roles (drop old, create new) ==
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admin and Lider can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and Lider can view org roles"
  ON public.user_roles FOR SELECT
  USING (
    public.is_admin_or_lider(auth.uid())
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.my_org())
  );

CREATE POLICY "Admin can manage org roles"
  ON public.user_roles FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    AND user_id IN (SELECT p.user_id FROM public.profiles p WHERE p.organization_id = public.my_org())
  );

-- == Funnels (drop old, create new) ==
DROP POLICY IF EXISTS "Authenticated users can view funnels" ON public.funnels;
DROP POLICY IF EXISTS "Admin and Lider can manage funnels" ON public.funnels;

CREATE POLICY "Authenticated users can view org funnels"
  ON public.funnels FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org());

CREATE POLICY "Admin and Lider can manage org funnels"
  ON public.funnels FOR ALL
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == Leads (drop old, create new) ==
DROP POLICY IF EXISTS "Admin and Lider can view all leads" ON public.leads;
DROP POLICY IF EXISTS "SDR can view assigned leads" ON public.leads;
DROP POLICY IF EXISTS "Admin and Lider can manage leads" ON public.leads;
DROP POLICY IF EXISTS "SDR can update assigned leads" ON public.leads;

CREATE POLICY "Admin and Lider can view org leads"
  ON public.leads FOR SELECT
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "SDR can view assigned org leads"
  ON public.leads FOR SELECT
  USING (
    public.has_role(auth.uid(), 'sdr')
    AND assigned_sdr_id = auth.uid()
    AND organization_id = public.my_org()
  );

CREATE POLICY "Admin and Lider can manage org leads"
  ON public.leads FOR ALL
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "SDR can update assigned org leads"
  ON public.leads FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'sdr')
    AND assigned_sdr_id = auth.uid()
    AND organization_id = public.my_org()
  );

-- == Qualification Rules (drop old, create new) ==
DROP POLICY IF EXISTS "Authenticated users can view rules" ON public.qualification_rules;
DROP POLICY IF EXISTS "Admin and Lider can manage rules" ON public.qualification_rules;

CREATE POLICY "Authenticated users can view org rules"
  ON public.qualification_rules FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org());

CREATE POLICY "Admin and Lider can manage org rules"
  ON public.qualification_rules FOR ALL
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == CRM Columns (drop old, create new) ==
DROP POLICY IF EXISTS "Authenticated users can view columns" ON public.crm_columns;
DROP POLICY IF EXISTS "Admin and Lider can manage columns" ON public.crm_columns;

CREATE POLICY "Authenticated users can view org columns"
  ON public.crm_columns FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org());

CREATE POLICY "Admin and Lider can manage org columns"
  ON public.crm_columns FOR ALL
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == Lead Activities (drop old, create new) ==
DROP POLICY IF EXISTS "Admin and Lider can view all activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Users can view own activities" ON public.lead_activities;
DROP POLICY IF EXISTS "Authenticated users can create activities" ON public.lead_activities;

CREATE POLICY "Admin and Lider can view org activities"
  ON public.lead_activities FOR SELECT
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "Users can view own org activities"
  ON public.lead_activities FOR SELECT
  USING (
    auth.uid() = user_id
    AND organization_id = public.my_org()
  );

CREATE POLICY "Authenticated users can create org activities"
  ON public.lead_activities FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND organization_id = public.my_org()
  );

-- == Appointments (drop old, create new) ==
DROP POLICY IF EXISTS "Admin and Lider can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "SDR can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Closer can view own appointments" ON public.appointments;
DROP POLICY IF EXISTS "SDR can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admin and Lider can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Closer can update own appointments" ON public.appointments;

CREATE POLICY "Admin and Lider can view org appointments"
  ON public.appointments FOR SELECT
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "SDR can view org appointments"
  ON public.appointments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'sdr')
    AND organization_id = public.my_org()
  );

CREATE POLICY "Closer can view own org appointments"
  ON public.appointments FOR SELECT
  USING (
    public.has_role(auth.uid(), 'closer')
    AND closer_id = auth.uid()
    AND organization_id = public.my_org()
  );

CREATE POLICY "SDR can create org appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'sdr')
    AND sdr_id = auth.uid()
    AND organization_id = public.my_org()
  );

CREATE POLICY "Admin and Lider can manage org appointments"
  ON public.appointments FOR ALL
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "Closer can update own org appointments"
  ON public.appointments FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'closer')
    AND closer_id = auth.uid()
    AND organization_id = public.my_org()
  );

-- == Closer Availability (drop old, create new) ==
DROP POLICY IF EXISTS "Authenticated users can view availability" ON public.closer_availability;
DROP POLICY IF EXISTS "Admin and Lider can manage availability" ON public.closer_availability;

CREATE POLICY "Authenticated users can view org availability"
  ON public.closer_availability FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org());

CREATE POLICY "Admin and Lider can manage org availability"
  ON public.closer_availability FOR ALL
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == Activity Logs (drop old, create new) ==
DROP POLICY IF EXISTS "Admin can view all logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Lider can view logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users can create own logs" ON public.activity_logs;

CREATE POLICY "Admin can view org logs"
  ON public.activity_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.my_org()
  );

CREATE POLICY "Lider can view org logs"
  ON public.activity_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'lider')
    AND organization_id = public.my_org()
  );

CREATE POLICY "Authenticated users can create org logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id OR user_id IS NULL)
    AND organization_id = public.my_org()
  );

-- == Distribution Rules (drop old, create new) ==
DROP POLICY IF EXISTS "Admin e Líder podem gerenciar regras" ON public.distribution_rules;
DROP POLICY IF EXISTS "Usuários autenticados podem visualizar regras" ON public.distribution_rules;

CREATE POLICY "Authenticated users can view org distribution rules"
  ON public.distribution_rules FOR SELECT
  TO authenticated
  USING (organization_id = public.my_org());

CREATE POLICY "Admin and Lider can manage org distribution rules"
  ON public.distribution_rules FOR ALL
  TO authenticated
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == Lead Distribution Logs (drop old, create new) ==
DROP POLICY IF EXISTS "Admin and Lider can view distribution logs" ON public.lead_distribution_logs;
DROP POLICY IF EXISTS "Admin and Lider can create distribution logs" ON public.lead_distribution_logs;

CREATE POLICY "Admin and Lider can view org distribution logs"
  ON public.lead_distribution_logs FOR SELECT
  USING (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "Admin and Lider can create org distribution logs"
  ON public.lead_distribution_logs FOR INSERT
  WITH CHECK (
    public.is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == Notifications (drop old, create new) ==
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own org notifications"
  ON public.notifications FOR SELECT
  USING (
    auth.uid() = user_id
    AND organization_id = public.my_org()
  );

CREATE POLICY "Users can update own org notifications"
  ON public.notifications FOR UPDATE
  USING (
    auth.uid() = user_id
    AND organization_id = public.my_org()
  );

-- == Niches (drop old, create new) ==
DROP POLICY IF EXISTS "Authenticated users can view niches" ON public.niches;
DROP POLICY IF EXISTS "Admin and Lider can manage niches" ON public.niches;

CREATE POLICY "Authenticated users can view org niches"
  ON public.niches FOR SELECT
  USING (organization_id = public.my_org() OR organization_id IS NULL);

CREATE POLICY "Admin and Lider can manage org niches"
  ON public.niches FOR ALL
  USING (
    is_admin_or_lider(auth.uid())
    AND (organization_id = public.my_org() OR organization_id IS NULL)
  );

-- == SDR Capacities (drop old, create new) ==
DROP POLICY IF EXISTS "Admin and Lider can manage SDR capacities" ON public.sdr_capacities;
DROP POLICY IF EXISTS "Authenticated users can view SDR capacities" ON public.sdr_capacities;

CREATE POLICY "Authenticated users can view org SDR capacities"
  ON public.sdr_capacities FOR SELECT
  USING (organization_id = public.my_org());

CREATE POLICY "Admin and Lider can manage org SDR capacities"
  ON public.sdr_capacities FOR ALL
  USING (
    is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- == Cleanup Logs (drop old, create new) ==
DROP POLICY IF EXISTS "Admin and Lider can view cleanup logs" ON public.cleanup_logs;
DROP POLICY IF EXISTS "Admin and Lider can insert cleanup logs" ON public.cleanup_logs;

CREATE POLICY "Admin and Lider can view org cleanup logs"
  ON public.cleanup_logs FOR SELECT
  USING (
    is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

CREATE POLICY "Admin and Lider can insert org cleanup logs"
  ON public.cleanup_logs FOR INSERT
  WITH CHECK (
    is_admin_or_lider(auth.uid())
    AND organization_id = public.my_org()
  );

-- ============================================================
-- PART 7: WEBHOOK SYSTEM
-- ============================================================

CREATE TABLE public.webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  headers JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES public.webhook_subscriptions(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered BOOLEAN NOT NULL DEFAULT false,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_webhook_subs_org ON public.webhook_subscriptions(organization_id);
CREATE INDEX idx_webhook_subs_event ON public.webhook_subscriptions(event_type);
CREATE INDEX idx_webhook_logs_org ON public.webhook_logs(organization_id);
CREATE INDEX idx_webhook_logs_sub ON public.webhook_logs(subscription_id);

CREATE TRIGGER update_webhook_subscriptions_updated_at
  BEFORE UPDATE ON public.webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Admin can manage org webhooks"
  ON public.webhook_subscriptions FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.my_org()
  );

CREATE POLICY "Admin can view org webhook logs"
  ON public.webhook_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.my_org()
  );

-- ============================================================
-- PART 8: API KEYS TABLE (service-to-service auth)
-- ============================================================

CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{"read"}',
  active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX idx_api_keys_hash ON public.api_keys(key_hash);

CREATE POLICY "Admin can manage org API keys"
  ON public.api_keys FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin')
    AND organization_id = public.my_org()
  );

-- ============================================================
-- PART 9: SUPPORTED WEBHOOK EVENT TYPES (reference)
-- ============================================================
-- lead.created
-- lead.updated
-- lead.assigned
-- lead.qualified
-- lead.cleaned
-- appointment.created
-- appointment.updated
-- appointment.completed
-- distribution.executed
-- import.completed

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
