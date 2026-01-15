-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'lider', 'sdr', 'closer');
CREATE TYPE public.lead_classification AS ENUM ('diamante', 'ouro', 'prata', 'bronze');
CREATE TYPE public.lead_status AS ENUM ('novo', 'em_atendimento', 'agendado', 'concluido');
CREATE TYPE public.appointment_status AS ENUM ('agendado', 'reagendado', 'realizado', 'nao_compareceu');

-- Create profiles table
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

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create funnels table
CREATE TABLE public.funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  google_sheet_url TEXT,
  sheet_name TEXT,
  column_mapping JSONB DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
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
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create qualification_rules table
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

-- Create crm_columns table
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

-- Create lead_activities table
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

-- Create appointments table
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

-- Create closer_availability table
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

-- Create activity_logs table
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

-- Create lead_distribution_logs table
CREATE TABLE public.lead_distribution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  funnel_id UUID REFERENCES public.funnels(id) ON DELETE SET NULL,
  leads_count INTEGER NOT NULL,
  sdr_ids UUID[] NOT NULL,
  distribution_mode TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_leads_funnel ON public.leads(funnel_id);
CREATE INDEX idx_leads_sdr ON public.leads(assigned_sdr_id);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_classification ON public.leads(classification);
CREATE INDEX idx_leads_created ON public.leads(created_at);
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX idx_appointments_sdr ON public.appointments(sdr_id);
CREATE INDEX idx_appointments_closer ON public.appointments(closer_id);
CREATE INDEX idx_appointments_date ON public.appointments(scheduled_date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_activities_lead ON public.lead_activities(lead_id);
CREATE INDEX idx_activities_user ON public.lead_activities(user_id);
CREATE INDEX idx_activity_logs_user ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON public.activity_logs(created_at);

-- Enable RLS on all tables
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

-- Create security definer function to check roles
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

-- Create function to get user role
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

-- Create function to check if user is admin or lider
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

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
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

-- Create function to handle new user registration
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
  
  -- Default role to 'sdr' if not specified
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'sdr')
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles
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

-- RLS Policies for user_roles
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admin and Lider can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Admin can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for funnels
CREATE POLICY "Authenticated users can view funnels"
  ON public.funnels FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage funnels"
  ON public.funnels FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- RLS Policies for leads
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

-- RLS Policies for qualification_rules
CREATE POLICY "Authenticated users can view rules"
  ON public.qualification_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage rules"
  ON public.qualification_rules FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- RLS Policies for crm_columns
CREATE POLICY "Authenticated users can view columns"
  ON public.crm_columns FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage columns"
  ON public.crm_columns FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- RLS Policies for lead_activities
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

-- RLS Policies for appointments
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

-- RLS Policies for closer_availability
CREATE POLICY "Authenticated users can view availability"
  ON public.closer_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin and Lider can manage availability"
  ON public.closer_availability FOR ALL
  USING (public.is_admin_or_lider(auth.uid()));

-- RLS Policies for activity_logs
CREATE POLICY "Admin can view all logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Lider can view logs"
  ON public.activity_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'lider'));

CREATE POLICY "Authenticated users can create logs"
  ON public.activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for lead_distribution_logs
CREATE POLICY "Admin and Lider can view distribution logs"
  ON public.lead_distribution_logs FOR SELECT
  USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Admin and Lider can create distribution logs"
  ON public.lead_distribution_logs FOR INSERT
  WITH CHECK (public.is_admin_or_lider(auth.uid()));