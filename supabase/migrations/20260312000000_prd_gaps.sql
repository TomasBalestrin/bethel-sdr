-- Migration: PRD Gap Implementation
-- Adds: cancelado status, funnels.category, goals table, sdr_tipo, sdr_metrics view
-- Date: 2026-03-12

-- ============================================================
-- 1. Add 'cancelado' to appointment_status enum
-- ============================================================
ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'cancelado';

-- ============================================================
-- 2. Add 'category' column to funnels table
-- ============================================================
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS category TEXT;

-- ============================================================
-- 3. Create sdr_tipo enum and add to profiles
-- ============================================================
DO $$ BEGIN
  CREATE TYPE sdr_tipo AS ENUM ('sdr', 'social_selling');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sdr_type sdr_tipo DEFAULT 'sdr';

-- ============================================================
-- 4. Create goals table
-- ============================================================
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  metric TEXT NOT NULL,  -- e.g. 'agendamentos', 'conversoes', 'valor_gerado', 'leads_contatados'
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  period TEXT NOT NULL CHECK (period IN ('diario', 'semanal', 'mensal')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select_own_org" ON goals
  FOR SELECT USING (organization_id = (SELECT my_org()));

CREATE POLICY "goals_insert_admin" ON goals
  FOR INSERT WITH CHECK (
    organization_id = (SELECT my_org())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'lider')
    )
  );

CREATE POLICY "goals_update_admin" ON goals
  FOR UPDATE USING (
    organization_id = (SELECT my_org())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'lider')
    )
  );

CREATE POLICY "goals_delete_admin" ON goals
  FOR DELETE USING (
    organization_id = (SELECT my_org())
    AND EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'lider')
    )
  );

-- Updated_at trigger for goals
CREATE TRIGGER set_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. Create sdr_metrics materialized view
-- ============================================================
-- This view pre-calculates SDR performance metrics for faster dashboard queries.
-- Refresh it periodically or after bulk operations.
CREATE MATERIALIZED VIEW IF NOT EXISTS sdr_metrics AS
SELECT
  p.user_id AS sdr_id,
  p.organization_id,
  p.name AS sdr_name,
  p.sdr_type,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'em_atendimento') AS leads_em_atendimento,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'agendado') AS leads_agendados,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'concluido') AS leads_concluidos,
  COUNT(DISTINCT a.id) AS total_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.converted = true) AS conversions,
  COALESCE(SUM(a.conversion_value) FILTER (WHERE a.converted = true), 0) AS total_value,
  CASE
    WHEN COUNT(DISTINCT l.id) > 0
    THEN ROUND(COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'agendado')::NUMERIC / COUNT(DISTINCT l.id) * 100, 2)
    ELSE 0
  END AS scheduling_rate,
  CASE
    WHEN COUNT(DISTINCT a.id) > 0
    THEN ROUND(COUNT(DISTINCT a.id) FILTER (WHERE a.converted = true)::NUMERIC / COUNT(DISTINCT a.id) * 100, 2)
    ELSE 0
  END AS conversion_rate,
  now() AS refreshed_at
FROM profiles p
JOIN user_roles ur ON ur.user_id = p.user_id AND ur.role = 'sdr'
LEFT JOIN leads l ON l.assigned_sdr_id = p.user_id
LEFT JOIN appointments a ON a.sdr_id = p.user_id
WHERE p.active = true
GROUP BY p.user_id, p.organization_id, p.name, p.sdr_type;

-- Index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS sdr_metrics_sdr_id_idx ON sdr_metrics (sdr_id);
CREATE INDEX IF NOT EXISTS sdr_metrics_org_idx ON sdr_metrics (organization_id);

-- Function to refresh sdr_metrics (call from cron or after bulk operations)
CREATE OR REPLACE FUNCTION refresh_sdr_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sdr_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 6. Add funnel_id to crm_columns (link columns to specific funnels)
-- ============================================================
ALTER TABLE crm_columns ADD COLUMN IF NOT EXISTS funnel_id UUID REFERENCES funnels(id) ON DELETE SET NULL;

-- Comment explaining the change
COMMENT ON COLUMN crm_columns.funnel_id IS 'Optional link to a specific funnel. NULL means the column is global (applies to all funnels).';
