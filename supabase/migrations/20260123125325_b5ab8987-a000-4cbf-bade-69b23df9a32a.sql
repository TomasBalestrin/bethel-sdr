-- Adicionar campos de sincronização na tabela funnels
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 30;

-- Adicionar campos de rastreamento de origem na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_row_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_source_url TEXT;

-- Criar índice para busca rápida por sheet_row_id
CREATE INDEX IF NOT EXISTS idx_leads_sheet_row_id ON leads(sheet_row_id);
CREATE INDEX IF NOT EXISTS idx_leads_sheet_source_url ON leads(sheet_source_url);