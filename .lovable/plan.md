
# Plano: Integração Direta de Leads via Google Sheets

## Contexto

Atualmente, os leads são importados manualmente via upload de arquivo CSV. O usuário deseja que os leads venham **diretamente de planilhas Google Sheets** configuradas em cada funil, eliminando a necessidade de upload manual.

---

## Arquitetura da Solução

A integração funcionará da seguinte forma:

```text
┌─────────────────────┐      ┌──────────────────────┐      ┌─────────────────┐
│   Google Sheets     │─────▶│  import-leads-sheet  │─────▶│   Tabela leads  │
│ (configurado no     │      │  (Edge Function)     │      │   (Supabase)    │
│    funil)           │      └──────────────────────┘      └─────────────────┘
└─────────────────────┘               │
                                      ▼
                            ┌──────────────────────┐
                            │  distribute-leads    │
                            │  (já existente)      │
                            └──────────────────────┘
```

---

## Estrutura Existente (Pronta para Uso)

### Tabela `funnels` - Já possui campos necessários:
| Campo | Descrição |
|-------|-----------|
| `google_sheet_url` | URL da planilha Google Sheets |
| `sheet_name` | Nome da aba onde estão os leads |
| `column_mapping` | Mapeamento de colunas (atualmente `null`) |

### Secrets Já Configuradas:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Email da Service Account
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - Chave privada para autenticação

---

## 1. Nova Edge Function: `import-leads-sheet`

### Arquivo: `supabase/functions/import-leads-sheet/index.ts`

**Funcionalidades:**
- Ler dados de Google Sheets configurados nos funis
- Usar autenticação via Service Account (mesma do cleanup)
- Mapear colunas da planilha para campos do sistema
- Verificar duplicados (por email ou telefone)
- Inserir novos leads na tabela `leads`
- Marcar linhas processadas na planilha (opcional: coluna de status)
- Retornar resumo da importação

**Mapeamento de Colunas Esperado:**

| Campo Sistema | Coluna Sheets (padrão) |
|---------------|------------------------|
| `full_name` | Nome / Nome Completo |
| `phone` | Telefone / Celular |
| `email` | Email / E-mail |
| `state` | Estado / UF |
| `instagram` | Instagram / @ |
| `niche` | Nicho |
| `business_name` | Negócio / Empresa |
| `business_position` | Posição / Cargo |
| `revenue` | Faturamento |
| `main_pain` | Desafio / Principal Dor |
| `has_partner` | Tem Sócio |
| `knows_specialist_since` | Há quanto tempo conhece |

---

## 2. Atualizar FunnelFormModal

### Arquivo: `src/components/admin/FunnelFormModal.tsx`

**Adicionar:**
- Interface para configurar mapeamento de colunas (`column_mapping`)
- Botão "Testar Conexão" para validar acesso à planilha
- Checkbox "Sincronização Automática" para habilitar cron

---

## 3. Interface de Mapeamento de Colunas

### Novo Componente: `src/components/admin/SheetColumnMapper.tsx`

**Funcionalidades:**
- Buscar headers da planilha via Edge Function
- Permitir arrastar/soltar ou select para mapear cada campo do sistema
- Validar campos obrigatórios (nome, telefone/email)
- Salvar mapeamento no campo `column_mapping` do funil

---

## 4. Cron Job para Importação Automática

### Atualizar: Tabela `funnels`

**Adicionar campos via migration:**
```sql
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS auto_sync_enabled BOOLEAN DEFAULT false;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE funnels ADD COLUMN IF NOT EXISTS sync_interval_minutes INTEGER DEFAULT 30;
```

### Criar Cron Job (pg_cron):
```sql
-- Executa a cada 30 minutos
SELECT cron.schedule(
  'import-leads-from-sheets',
  '*/30 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://lxyqqlwbpygeilrriljc.supabase.co/functions/v1/import-leads-sheet',
    body := '{"syncAll": true}'::jsonb
  );
  $$
);
```

---

## 5. Controle de Duplicados

### Estratégia:
1. **Por ID da linha na planilha:** Adicionar coluna `sheet_row_id` na tabela leads
2. **Por email/telefone:** Verificar se já existe lead com mesmo email ou telefone
3. **Por timestamp:** Armazenar `last_sync_at` no funil e sincronizar apenas linhas novas

### Atualizar tabela leads (migration):
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_row_id TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sheet_source_url TEXT;
CREATE INDEX IF NOT EXISTS idx_leads_sheet_row_id ON leads(sheet_row_id);
```

---

## 6. Painel de Sincronização no Admin

### Novo Tab ou Seção em Admin:

**Funcionalidades:**
- Ver status de sincronização de cada funil
- Data/hora da última sincronização
- Quantidade de leads importados
- Botão "Sincronizar Agora" para forçar importação manual
- Logs de erros de sincronização

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/import-leads-sheet/index.ts` | Edge Function principal de importação |
| `src/components/admin/SheetColumnMapper.tsx` | Componente de mapeamento de colunas |
| `src/components/admin/SyncStatusPanel.tsx` | Painel de status de sincronização |
| `src/hooks/useSheetSync.ts` | Hook para gerenciar sincronização |

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| `src/components/admin/FunnelFormModal.tsx` | Adicionar configuração de mapeamento e botão de teste |
| `src/hooks/useFunnels.ts` | Adicionar mutation para testar conexão |
| `supabase/config.toml` | Registrar nova Edge Function |
| Migration SQL | Adicionar campos de sync na tabela funnels e sheet_row_id em leads |

---

## Fluxo de Funcionamento

### Configuração (Admin):
1. Admin cria/edita funil
2. Insere URL do Google Sheets e nome da aba
3. Clica em "Carregar Colunas" → Sistema busca headers
4. Mapeia cada coluna do Sheets para campos do sistema
5. Ativa "Sincronização Automática" se desejar
6. Salva configuração

### Sincronização (Automática ou Manual):
1. Cron job ou botão manual dispara Edge Function
2. Função busca todos os funis com `google_sheet_url` configurado
3. Para cada funil:
   - Autentica com Google Sheets API
   - Lê dados da planilha
   - Aplica mapeamento de colunas
   - Verifica duplicados
   - Insere novos leads
   - Atualiza `last_sync_at`
4. Dispara distribuição automática (se configurado)

---

## Detalhes Técnicos

### Autenticação Google Sheets
Reutilizar a lógica existente em `cleanup-leads`:
```typescript
// Criar JWT e obter access token
const jwt = await createGoogleJWT(serviceEmail, privateKey);
const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);

// Ler dados da planilha
const response = await fetch(
  `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}`,
  { headers: { Authorization: `Bearer ${accessToken}` } }
);
```

### Extração do Spreadsheet ID da URL
```typescript
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}
```

---

## Segurança

- Service Account deve ter acesso de leitura às planilhas
- Validação de dados antes de inserir (sanitização)
- Rate limiting para evitar sobrecarga
- Logs de auditoria para rastreabilidade

---

## Benefícios

1. **Elimina trabalho manual** de download/upload de CSV
2. **Sincronização em tempo real** (ou quase) com formulários
3. **Configuração flexível** de mapeamento por funil
4. **Rastreabilidade** de origem dos leads
5. **Integração transparente** com sistema de distribuição existente
