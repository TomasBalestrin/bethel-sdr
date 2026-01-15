-- Adicionar coluna crm_column_id para leads (rastreamento no Kanban)
ALTER TABLE leads ADD COLUMN crm_column_id UUID REFERENCES crm_columns(id);

-- Criar índice para melhor performance
CREATE INDEX idx_leads_crm_column_id ON leads(crm_column_id);