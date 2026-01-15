-- Create distribution_rules table
CREATE TABLE public.distribution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  funnel_id uuid REFERENCES public.funnels(id) ON DELETE CASCADE,
  classifications text[] DEFAULT '{}',
  sdr_ids uuid[] NOT NULL,
  max_leads_per_sdr integer DEFAULT 50,
  active boolean DEFAULT true,
  schedule_enabled boolean DEFAULT false,
  schedule_days integer[] DEFAULT '{}',
  schedule_time time DEFAULT '09:00',
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.distribution_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin e Líder podem gerenciar regras"
ON public.distribution_rules
FOR ALL
TO authenticated
USING (public.is_admin_or_lider(auth.uid()));

CREATE POLICY "Usuários autenticados podem visualizar regras"
ON public.distribution_rules
FOR SELECT
TO authenticated
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_distribution_rules_updated_at
BEFORE UPDATE ON public.distribution_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update lead_distribution_logs table
ALTER TABLE public.lead_distribution_logs
ADD COLUMN IF NOT EXISTS rule_id uuid REFERENCES public.distribution_rules(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS classifications text[],
ADD COLUMN IF NOT EXISTS lead_ids uuid[],
ADD COLUMN IF NOT EXISTS workload_snapshot jsonb;