# Bethel SDR — Backend

**Stack:** Supabase (PostgreSQL 15 + PostgREST 14.1 + Edge Functions Deno + Realtime + Auth)

---

## 1. Tabelas do Banco de Dados

### 1.1 profiles

Dados de perfil do usuario, vinculado ao `auth.users`.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK→auth.users, NOT NULL, UNIQUE | - |
| `name` | TEXT | NOT NULL | - |
| `email` | TEXT | NOT NULL | - |
| `timezone` | TEXT | NOT NULL | `'America/Sao_Paulo'` |
| `active` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` (auto-trigger) |

---

### 1.2 user_roles

Role unica por usuario.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `user_id` | UUID | FK→auth.users ON DELETE CASCADE, NOT NULL | - |
| `role` | `app_role` | NOT NULL | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |

**Unique:** `(user_id, role)`

---

### 1.3 funnels

Funis de captacao de leads com configuracao Google Sheets.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `google_sheet_url` | TEXT | - | - |
| `sheet_name` | TEXT | - | - |
| `column_mapping` | JSONB | - | `'{}'` |
| `active` | BOOLEAN | NOT NULL | `true` |
| `auto_sync_enabled` | BOOLEAN | - | `false` |
| `last_sync_at` | TIMESTAMPTZ | - | - |
| `sync_interval_minutes` | INTEGER | - | `30` |
| `import_from_date` | DATE | - | `'2026-01-01'` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` (auto-trigger) |

**column_mapping JSONB:**
```json
{
  "full_name": "Nome Completo",
  "phone": "Telefone",
  "email": "Email",
  "revenue": "Faturamento",
  "niche": "Nicho",
  "state": "Estado",
  "date_column": "Data"
}
```

---

### 1.4 leads

Tabela principal de leads com 25+ campos.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `full_name` | TEXT | NOT NULL | - |
| `phone` | TEXT | - | - |
| `email` | TEXT | - | - |
| `revenue` | DECIMAL | - | - |
| `niche` | TEXT | - | - |
| `instagram` | TEXT | - | - |
| `main_pain` | TEXT | - | - |
| `difficulty` | TEXT | - | - |
| `state` | TEXT | - | - |
| `business_name` | TEXT | - | - |
| `business_position` | TEXT | CHECK: `'dono'` ou `'nao_dono'` | - |
| `has_partner` | BOOLEAN | - | - |
| `knows_specialist_since` | TEXT | - | - |
| `funnel_id` | UUID | FK→funnels ON DELETE SET NULL | - |
| `assigned_sdr_id` | UUID | FK→auth.users ON DELETE SET NULL | - |
| `classification` | `lead_classification` | - | `'bronze'` |
| `qualification` | TEXT | - | - |
| `status` | `lead_status` | NOT NULL | `'novo'` |
| `custom_fields` | JSONB | - | `'{}'` |
| `crm_column_id` | UUID | FK→crm_columns | - |
| `distributed_at` | TIMESTAMPTZ | - | - |
| `distribution_origin` | TEXT | CHECK: `'manual'` ou `'automatic'` | - |
| `sheet_row_id` | TEXT | - | - |
| `sheet_source_url` | TEXT | - | - |
| `form_filled_at` | TIMESTAMPTZ | - | - |
| `imported_at` | TIMESTAMPTZ | - | `now()` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` (auto-trigger) |

**Indices:** `funnel_id`, `assigned_sdr_id`, `status`, `classification`, `created_at`, `crm_column_id`, `sheet_row_id`, `sheet_source_url`

**Foreign Keys:**
- `leads_funnel_id_fkey` → funnels(id)
- `leads_assigned_sdr_profile_fkey` → profiles(user_id)
- `leads_crm_column_id_fkey` → crm_columns(id)

---

### 1.5 crm_columns

Colunas do Kanban CRM.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `position` | INTEGER | NOT NULL | - |
| `color` | TEXT | NOT NULL | `'#64748b'` |
| `editable` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |

**Colunas pre-inseridas:**
1. Contato Inicial (#2563eb, nao editavel)
2. Aguardando Resposta (#eab308, editavel)
3. Processo de Ligacao (#f97316, editavel)
4. Agendado (#16a34a, nao editavel)
5. Call Realizada (#7c3aed, nao editavel)

---

### 1.6 appointments

Agendamentos de calls com closers.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `lead_id` | UUID | FK→leads ON DELETE CASCADE, NOT NULL | - |
| `sdr_id` | UUID | FK→auth.users ON DELETE SET NULL | - |
| `closer_id` | UUID | FK→auth.users ON DELETE SET NULL | - |
| `funnel_id` | UUID | FK→funnels ON DELETE SET NULL | - |
| `qualification` | TEXT | - | - |
| `scheduled_date` | TIMESTAMPTZ | NOT NULL | - |
| `duration` | INTEGER | NOT NULL | `90` (minutos) |
| `timezone` | TEXT | NOT NULL | `'America/Sao_Paulo'` |
| `google_calendar_event_id` | TEXT | - | - |
| `status` | `appointment_status` | NOT NULL | `'agendado'` |
| `reschedule_count` | INTEGER | NOT NULL | `0` |
| `attended` | BOOLEAN | - | - |
| `converted` | BOOLEAN | - | - |
| `conversion_value` | DECIMAL | - | - |
| `notes` | TEXT | - | - |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` (auto-trigger) |

**Indices:** `lead_id`, `sdr_id`, `closer_id`, `scheduled_date`, `status`

**Foreign Keys:**
- `appointments_sdr_profile_fkey` → profiles(user_id)
- `appointments_closer_profile_fkey` → profiles(user_id)

---

### 1.7 lead_activities

Historico de acoes em leads (audit trail do CRM).

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `lead_id` | UUID | FK→leads ON DELETE CASCADE, NOT NULL | - |
| `column_id` | UUID | FK→crm_columns ON DELETE SET NULL | - |
| `user_id` | UUID | FK→auth.users ON DELETE SET NULL | - |
| `action_type` | TEXT | NOT NULL | - |
| `notes` | TEXT | - | - |
| `tags` | TEXT[] | - | `'{}'` |
| `details` | JSONB | - | `'{}'` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |

---

### 1.8 qualification_rules

Motor de qualificacao automatica.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `funnel_id` | UUID | FK→funnels ON DELETE CASCADE | - |
| `rule_name` | TEXT | NOT NULL | - |
| `conditions` | JSONB | NOT NULL | `'[]'` |
| `qualification_label` | TEXT | NOT NULL | - |
| `classification` | `lead_classification` | - | - |
| `priority` | INTEGER | NOT NULL | `1` |
| `active` | BOOLEAN | NOT NULL | `true` |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |

**Estrutura do conditions JSONB:**
```json
[
  {
    "field": "revenue",
    "operator": "greater_than",
    "value": "50000",
    "logic": "AND"
  },
  {
    "field": "niche",
    "operator": "equals",
    "value": "Tecnologia/SaaS",
    "logic": "AND"
  }
]
```

**Campos suportados:** `revenue`, `niche`, `state`, `business_position`, `has_partner`, `main_pain`, `difficulty`, `full_name`, `email`, `phone`, `business_name`, `instagram`, `knows_specialist_since`, ou qualquer chave de `custom_fields`.

**Operadores:** `equals`, `not_equals`, `greater_than`, `less_than`, `contains`, `not_contains`

**Logica:** `AND` (padrao), `OR`

---

### 1.9 distribution_rules

Regras de distribuicao automatica de leads.

| Coluna | Tipo | Constraints | Default |
|---|---|---|---|
| `id` | UUID | PK | `gen_random_uuid()` |
| `name` | TEXT | NOT NULL | - |
| `funnel_id` | UUID | FK→funnels ON DELETE CASCADE | - |
| `classifications` | TEXT[] | - | `'{}'` |
| `sdr_ids` | UUID[] | NOT NULL | - |
| `max_leads_per_sdr` | INTEGER | - | `50` |
| `distribution_mode` | TEXT | CHECK: `'equal'`, `'percentage'`, `'funnel_limit'` | `'equal'` |
| `sdr_percentages` | JSONB | - | `'{}'` |
| `sdr_funnel_limits` | JSONB | - | `'{}'` |
| `active` | BOOLEAN | - | `true` |
| `schedule_enabled` | BOOLEAN | - | `false` |
| `schedule_days` | INTEGER[] | - | `'{}'` |
| `schedule_time` | TIME | - | `'09:00'` |
| `created_by` | UUID | - | - |
| `created_at` | TIMESTAMPTZ | - | `now()` |
| `updated_at` | TIMESTAMPTZ | - | `now()` (auto-trigger) |

---

### 1.10 Tabelas Auxiliares

#### closer_availability
Horarios de disponibilidade dos closers (por dia da semana).
`UNIQUE(closer_id, day_of_week)`, `day_of_week` CHECK 0-6.

#### notifications
Notificacoes em tempo real. **Supabase Realtime habilitado.**
Campos: `user_id`, `title`, `message`, `type` (info/success), `read`, `metadata`.

#### niches
20 nichos pre-cadastrados. `name` UNIQUE.

#### sdr_capacities
Limites por SDR/funil. `UNIQUE(sdr_id, funnel_id)`.

#### lead_distribution_logs
Historico de distribuicoes. Inclui `workload_snapshot` JSONB.

#### activity_logs
Audit trail geral. Campos: `action`, `entity_type`, `entity_id`, `details`, `ip_address`.

#### cleanup_logs
Historico de limpeza. Inclui `lead_data` JSONB (snapshot completo do lead).

---

## 2. Enums

```sql
CREATE TYPE app_role AS ENUM ('admin', 'lider', 'sdr', 'closer');
CREATE TYPE lead_classification AS ENUM ('diamante', 'ouro', 'prata', 'bronze');
CREATE TYPE lead_status AS ENUM ('novo', 'em_atendimento', 'agendado', 'concluido');
CREATE TYPE appointment_status AS ENUM ('agendado', 'reagendado', 'realizado', 'nao_compareceu');
```

---

## 3. Funcoes SQL

### 3.1 Funcoes de Permissao

```sql
has_role(_user_id UUID, _role app_role) → BOOLEAN
-- Verifica se usuario tem a role especificada. SECURITY DEFINER.

get_user_role(_user_id UUID) → app_role
-- Retorna a role do usuario. SECURITY DEFINER.

is_admin_or_lider(_user_id UUID) → BOOLEAN
-- Verifica se usuario e admin ou lider. SECURITY DEFINER.
```

### 3.2 Motor de Qualificacao

```sql
apply_qualification_rules(p_lead_id UUID) → void
```
1. Busca o lead
2. Itera pelas `qualification_rules` ativas, ordenadas por `priority` ASC
3. Avalia cada `conditions[]` com logica AND/OR
4. Primeira regra que bate: seta `classification` e `qualification` no lead
5. Se nenhuma regra bater: default `classification = 'bronze'`

### 3.3 Handler de Novo Usuario

```sql
handle_new_user() → TRIGGER (AFTER INSERT on auth.users)
```
Cria automaticamente `profiles` + `user_roles` quando usuario se registra.
Usa `raw_user_meta_data` para extrair `name`, `role` e `timezone`.

---

## 4. Triggers

| Trigger | Tabela | Evento | Funcao | Descricao |
|---|---|---|---|---|
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` | Auto-cria profile + role |
| `trg_qualify_lead_after_insert` | leads | AFTER INSERT | `trigger_qualify_lead()` | Executa qualificacao automatica |
| `on_lead_assignment` | leads | AFTER INSERT OR UPDATE | `notify_lead_assignment()` | Notifica SDR de lead atribuido |
| `on_appointment_created` | appointments | AFTER INSERT | `notify_appointment_created()` | Notifica closer de agendamento |
| `update_profiles_updated_at` | profiles | BEFORE UPDATE | `update_updated_at_column()` | Auto-atualiza `updated_at` |
| `update_funnels_updated_at` | funnels | BEFORE UPDATE | `update_updated_at_column()` | Auto-atualiza `updated_at` |
| `update_leads_updated_at` | leads | BEFORE UPDATE | `update_updated_at_column()` | Auto-atualiza `updated_at` |
| `update_appointments_updated_at` | appointments | BEFORE UPDATE | `update_updated_at_column()` | Auto-atualiza `updated_at` |
| `update_distribution_rules_updated_at` | distribution_rules | BEFORE UPDATE | `update_updated_at_column()` | Auto-atualiza `updated_at` |
| `update_sdr_capacities_updated_at` | sdr_capacities | BEFORE UPDATE | `update_updated_at_column()` | Auto-atualiza `updated_at` |

---

## 5. Row Level Security (RLS)

**Todas as 16 tabelas tem RLS habilitado.**

### 5.1 Padrao de Permissoes

| Padrao | Tabelas | Descricao |
|---|---|---|
| **Owner-only** | profiles (update), user_roles (select own), notifications, lead_activities (select own) | Usuario so ve/edita seus proprios dados |
| **Admin/Lider full** | leads, funnels, appointments, distribution_rules, crm_columns, qualification_rules, sdr_capacities, lead_distribution_logs, cleanup_logs, closer_availability | Admin e lider tem acesso total |
| **SDR limited** | leads (SELECT assigned), appointments (SELECT all, INSERT own) | SDR ve leads atribuidos e todos os appointments |
| **Closer limited** | appointments (SELECT own, UPDATE own) | Closer so ve/edita seus appointments |
| **Public read** | funnels, crm_columns, qualification_rules, niches, sdr_capacities, distribution_rules, closer_availability | Qualquer autenticado pode ler |

### 5.2 Politicas por Tabela

**profiles:**
- SELECT: own (`user_id = auth.uid()`) OU admin/lider (todos)
- UPDATE: own OU admin (qualquer)
- INSERT: admin only

**leads:**
- SELECT: admin/lider (todos) OU SDR (assigned_sdr_id = auth.uid())
- ALL: admin/lider
- UPDATE: SDR (assigned only)

**appointments:**
- SELECT: admin/lider (todos) OU SDR (todos) OU closer (closer_id = auth.uid())
- INSERT: SDR (sdr_id = auth.uid()) OU admin/lider
- UPDATE: closer (own) OU admin/lider
- ALL: admin/lider

**notifications:**
- SELECT: own (user_id = auth.uid())
- UPDATE: own
- INSERT: apenas via triggers SECURITY DEFINER

---

## 6. Edge Functions

Todas as 5 funcoes requerem `verify_jwt = true` (config.toml).

### 6.1 admin-create-user

**Proposito:** Criar usuario com role pre-definida (apenas admin)
**Auth:** Bearer JWT + role = admin
**Tabelas:** auth.users (admin.createUser), profiles (INSERT), user_roles (INSERT)
**Rollback:** Deleta usuario se profile/role falhar

### 6.2 distribute-leads

**Proposito:** Distribuir leads novos para SDRs com round-robin e balanceamento
**Auth:** Bearer JWT + role = admin/lider
**Tabelas:** distribution_rules (READ), profiles (READ), leads (READ/UPDATE), lead_distribution_logs (INSERT)
**Logica:** Round-robin com workload balancing, suporta dry-run

### 6.3 cleanup-leads

**Proposito:** Arquivar leads bronze/nao-fit em Google Sheets e deletar do banco
**Auth:** Bearer JWT + role = admin/lider
**Tabelas:** leads (READ/DELETE), cleanup_logs (INSERT)
**Google:** Sheets API v4 (append rows)
**Secrets:** GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, CLEANUP_SPREADSHEET_ID

### 6.4 import-leads-sheet

**Proposito:** Importar leads de Google Sheets com mapeamento, deduplicacao e paginacao
**Auth:** Bearer JWT + role = admin/lider
**Tabelas:** funnels (READ/UPDATE), leads (READ/INSERT)
**Google:** Sheets API v4 (read data)
**Acoes:** `import`, `fetch-headers`, `test-connection`, `update-dates`
**Paginacao:** 2000 linhas por requisicao

### 6.5 sync-google-calendar

**Proposito:** Sincronizar agendamentos com Google Calendar
**Auth:** Bearer JWT
**Tabelas:** appointments (READ/UPDATE)
**Google:** Calendar API v3 (create/update/delete events)
**Acoes:** `create`, `update`, `delete`

---

## 7. Realtime

**Tabela habilitada:** `notifications`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

O frontend subscribe via `supabase.channel('notifications-{userId}')` para receber notificacoes em tempo real.

---

## 8. Indices

```sql
-- Leads (7 indices)
idx_leads_funnel, idx_leads_sdr, idx_leads_status, idx_leads_classification,
idx_leads_created, idx_leads_crm_column_id, idx_leads_sheet_row_id, idx_leads_sheet_source_url

-- Appointments (5 indices)
idx_appointments_lead, idx_appointments_sdr, idx_appointments_closer,
idx_appointments_date, idx_appointments_status

-- Activities (2 indices)
idx_activities_lead, idx_activities_user

-- Logs (2 indices)
idx_activity_logs_user, idx_activity_logs_created
```

---

## 9. Migracoes

| Arquivo | Data | Resumo |
|---|---|---|
| `20260115170247_*.sql` | 15/01 | Schema inicial: tabelas, enums, funcoes, RLS |
| `20260115172911_*.sql` | 15/01 | FKs: appointments→profiles, leads→profiles |
| `20260115174211_*.sql` | 15/01 | FK: leads.crm_column_id + index |
| `20260115170300_*.sql` | 15/01 | Fix: activity_logs INSERT policy |
| `20260115183546_*.sql` | 15/01 | Notifications: tabela, triggers, realtime |
| `20260115204822_*.sql` | 15/01 | Fix: notifications INSERT policy |
| `20260115204838_*.sql` | 15/01 | FKs adicionais: profiles |
| `20260120113854_*.sql` | 20/01 | Expansao: campos leads, niches, sdr_capacities, cleanup_logs |
| `20260120142727_*.sql` | 20/01 | Campos cleanup_logs: sheet_url, sheet_name |
| `20260123125325_*.sql` | 23/01 | Sync: auto_sync_enabled, sheet_row_id |
| `20260211133758_*.sql` | 11/02 | Motor de qualificacao |
| `20260212132515_*.sql` | 12/02 | Campo import_from_date |
| `20260212135353_*.sql` | 12/02 | Campo form_filled_at |
| `complete_migration.sql` | 03/03 | Snapshot completo consolidado |
