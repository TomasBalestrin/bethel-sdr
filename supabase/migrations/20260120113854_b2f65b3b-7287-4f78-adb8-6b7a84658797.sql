-- Add new fields to leads table for complete form data
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS business_position text CHECK (business_position IN ('dono', 'nao_dono'));
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS has_partner boolean;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS knows_specialist_since text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS distributed_at timestamptz;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS distribution_origin text CHECK (distribution_origin IN ('manual', 'automatic'));

-- Create niches table
CREATE TABLE IF NOT EXISTS public.niches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on niches
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;

-- RLS policies for niches
CREATE POLICY "Authenticated users can view niches"
ON public.niches FOR SELECT
USING (true);

CREATE POLICY "Admin and Lider can manage niches"
ON public.niches FOR ALL
USING (is_admin_or_lider(auth.uid()));

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

-- Create SDR capacities table for distribution limits
CREATE TABLE IF NOT EXISTS public.sdr_capacities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sdr_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE,
  max_leads integer DEFAULT 50,
  percentage numeric(5,2) CHECK (percentage >= 0 AND percentage <= 100),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sdr_id, funnel_id)
);

-- Enable RLS on sdr_capacities
ALTER TABLE public.sdr_capacities ENABLE ROW LEVEL SECURITY;

-- RLS policies for sdr_capacities
CREATE POLICY "Admin and Lider can manage SDR capacities"
ON public.sdr_capacities FOR ALL
USING (is_admin_or_lider(auth.uid()));

CREATE POLICY "Authenticated users can view SDR capacities"
ON public.sdr_capacities FOR SELECT
USING (true);

-- Add distribution mode to distribution_rules
ALTER TABLE public.distribution_rules ADD COLUMN IF NOT EXISTS distribution_mode text DEFAULT 'equal' CHECK (distribution_mode IN ('equal', 'percentage', 'funnel_limit'));
ALTER TABLE public.distribution_rules ADD COLUMN IF NOT EXISTS sdr_percentages jsonb DEFAULT '{}';
ALTER TABLE public.distribution_rules ADD COLUMN IF NOT EXISTS sdr_funnel_limits jsonb DEFAULT '{}';

-- Create cleanup_logs table for automatic base cleanup
CREATE TABLE IF NOT EXISTS public.cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid,
  lead_data jsonb NOT NULL,
  cleanup_reason text NOT NULL CHECK (cleanup_reason IN ('bronze', 'nao_fit', 'manual')),
  google_sheet_row integer,
  cleaned_at timestamptz DEFAULT now()
);

-- Enable RLS on cleanup_logs
ALTER TABLE public.cleanup_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for cleanup_logs
CREATE POLICY "Admin and Lider can view cleanup logs"
ON public.cleanup_logs FOR SELECT
USING (is_admin_or_lider(auth.uid()));

CREATE POLICY "Admin and Lider can insert cleanup logs"
ON public.cleanup_logs FOR INSERT
WITH CHECK (is_admin_or_lider(auth.uid()));

-- Add trigger for updated_at on sdr_capacities
CREATE TRIGGER update_sdr_capacities_updated_at
BEFORE UPDATE ON public.sdr_capacities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();