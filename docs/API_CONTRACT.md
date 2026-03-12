# Bethel SDR — Contrato de Integracao (API Contract)

**Versao:** 3.0 (Multi-Tenant)
**Base URL:** `https://{PROJECT_ID}.supabase.co`
**Autenticacao:** Bearer JWT (Supabase Auth)

Este documento descreve como o frontend se comunica com o backend e como servicos externos podem integrar com o Bethel SDR como microsservico.

> **MULTI-TENANCY:** Todas as queries sao automaticamente filtradas por `organization_id` via RLS.
> O usuario so ve dados da sua organizacao. Edge Functions resolvem `organization_id` a partir do perfil do usuario autenticado.

---

## 1. Autenticacao

### 1.1 Login

```
POST /auth/v1/token?grant_type=password
Content-Type: application/json
apikey: {SUPABASE_ANON_KEY}

{
  "email": "usuario@exemplo.com",
  "password": "senha123"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbG...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "user": { "id": "uuid", "email": "...", "role": "authenticated" }
}
```

### 1.2 Usar Token

Todas as requisicoes subsequentes:
```
Authorization: Bearer {access_token}
apikey: {SUPABASE_ANON_KEY}
```

### 1.3 Obter Dados do Usuario Logado

O frontend busca profile + role em paralelo apos login:

```
GET /rest/v1/profiles?user_id=eq.{userId}&select=*
GET /rest/v1/user_roles?user_id=eq.{userId}&select=role
```

---

## 2. PostgREST API (CRUD Automatico)

Base: `{SUPABASE_URL}/rest/v1/{tabela}`

### 2.1 Headers Obrigatorios

```
Authorization: Bearer {JWT_TOKEN}
apikey: {SUPABASE_ANON_KEY}
Content-Type: application/json
```

### 2.2 Leads

#### Listar leads (sem paginacao)

```
GET /rest/v1/leads?select=*,funnel:funnels(id,name),assigned_sdr:profiles!leads_assigned_sdr_profile_fkey(id,name,email)&order=created_at.desc
```

#### Listar leads (com paginacao)

```
GET /rest/v1/leads?select=*,funnel:funnels(id,name),assigned_sdr:profiles!leads_assigned_sdr_profile_fkey(id,name,email)&order=created_at.desc&offset=0&limit=50
Prefer: count=exact
```

**Resposta:** Header `Content-Range: 0-49/1234` com total count.

#### Filtros suportados

| Parametro | Operador PostgREST | Exemplo |
|---|---|---|
| Busca texto | `or` | `?or=(full_name.ilike.*termo*,phone.ilike.*termo*,email.ilike.*termo*)` |
| Status | `in` | `?status=in.(em_atendimento,agendado)` |
| Classificacao | `in` | `?classification=in.(diamante,ouro)` |
| Funil | `eq` | `?funnel_id=eq.{uuid}` |
| SDR atribuido | `eq` | `?assigned_sdr_id=eq.{uuid}` |

#### Criar lead

```
POST /rest/v1/leads
Content-Type: application/json

{
  "full_name": "Joao Silva",
  "phone": "11999999999",
  "email": "joao@exemplo.com",
  "revenue": 50000,
  "niche": "Tecnologia/SaaS",
  "funnel_id": "uuid",
  "status": "novo"
}
```

**Trigger automatico:** `trg_qualify_lead_after_insert` executa qualificacao.

#### Atualizar lead

```
PATCH /rest/v1/leads?id=eq.{uuid}
Content-Type: application/json

{
  "status": "em_atendimento",
  "assigned_sdr_id": "uuid",
  "crm_column_id": "uuid"
}
```

**Trigger automatico:** `on_lead_assignment` notifica SDR se `assigned_sdr_id` mudou.

---

### 2.3 Appointments

#### Listar agendamentos

```
GET /rest/v1/appointments?select=*,lead:leads(id,full_name,phone,email,classification,qualification),sdr:profiles!appointments_sdr_profile_fkey(id,name,email),closer:profiles!appointments_closer_profile_fkey(id,name,email),funnel:funnels(id,name)&order=scheduled_date.desc
```

#### Filtros

| Filtro | Exemplo |
|---|---|
| Por closer | `?closer_id=eq.{uuid}` |
| Por status | `?status=in.(agendado,reagendado)` |
| Por data | `?scheduled_date=gte.2026-03-01T00:00:00Z&scheduled_date=lte.2026-03-31T23:59:59Z` |

#### Criar agendamento

```
POST /rest/v1/appointments
Content-Type: application/json

{
  "lead_id": "uuid",
  "sdr_id": "uuid",
  "closer_id": "uuid",
  "funnel_id": "uuid",
  "qualification": "diamante",
  "scheduled_date": "2026-03-15T14:00:00-03:00",
  "duration": 90,
  "timezone": "America/Sao_Paulo",
  "notes": "Observacoes"
}
```

**Trigger automatico:** `on_appointment_created` notifica closer.
**Side effect frontend:** Apos INSERT, chama Edge Function `sync-google-calendar` com action=create.

#### Registrar resultado

```
PATCH /rest/v1/appointments?id=eq.{uuid}
Content-Type: application/json

{
  "status": "realizado",
  "attended": true,
  "converted": true,
  "conversion_value": 15000,
  "notes": "Cliente fechou pacote premium"
}
```

---

### 2.4 Profiles e Users

#### Listar usuarios (com roles)

O frontend faz 2 queries em paralelo:
```
GET /rest/v1/profiles?select=*&order=name
GET /rest/v1/user_roles?select=user_id,role
```

E combina client-side para montar `ProfileWithRole[]`.

#### Atualizar perfil

```
PATCH /rest/v1/profiles?user_id=eq.{uuid}
Content-Type: application/json

{
  "name": "Novo Nome",
  "timezone": "America/Sao_Paulo"
}
```

#### Atualizar role

```
PATCH /rest/v1/user_roles?user_id=eq.{uuid}
Content-Type: application/json

{
  "role": "lider"
}
```

---

### 2.5 Funnels

#### Listar funis

```
GET /rest/v1/funnels?select=*&order=name
```

#### Criar funil

```
POST /rest/v1/funnels
Content-Type: application/json

{
  "name": "Funil Instagram",
  "google_sheet_url": "https://docs.google.com/spreadsheets/d/...",
  "sheet_name": "Respostas",
  "column_mapping": {
    "full_name": "Nome Completo",
    "phone": "Telefone",
    "email": "E-mail"
  }
}
```

---

### 2.6 CRM Columns

#### Listar colunas

```
GET /rest/v1/crm_columns?select=*&order=position
```

#### Reordenar (batch update)

O frontend chama PATCH para cada coluna com novo `position`.

---

### 2.7 Notifications

#### Listar notificacoes

```
GET /rest/v1/notifications?user_id=eq.{uuid}&select=*&order=created_at.desc
```

#### Marcar como lida

```
PATCH /rest/v1/notifications?id=eq.{uuid}
Content-Type: application/json

{ "read": true }
```

#### Realtime (WebSocket)

```typescript
supabase
  .channel(`notifications-${userId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Nova notificacao recebida
  })
  .subscribe();
```

---

### 2.8 Stats e Counts (HEAD requests)

Para contagens sem dados:

```
HEAD /rest/v1/leads?status=eq.novo&assigned_sdr_id=is.null&select=*
Prefer: count=exact
```

Resposta: `Content-Range: */42` (42 leads novos sem SDR).

---

## 3. Edge Functions

Base: `{SUPABASE_URL}/functions/v1/{nome}`

### 3.1 admin-create-user

**URL:** `POST /functions/v1/admin-create-user`
**Auth:** Bearer JWT (admin only)

**Request:**
```json
{
  "email": "novo@usuario.com",
  "password": "senha123",
  "name": "Novo Usuario",
  "role": "sdr",
  "timezone": "America/Sao_Paulo"
}
```

**Response 200:**
```json
{
  "success": true,
  "user": { "id": "uuid", "email": "...", "name": "...", "role": "sdr" }
}
```

**Errors:** 401 (no token), 403 (not admin), 400 (invalid input/duplicate email), 500 (internal)

---

### 3.2 distribute-leads

**URL:** `POST /functions/v1/distribute-leads`
**Auth:** Bearer JWT (admin ou lider)

**Request (via regra):**
```json
{
  "ruleId": "uuid"
}
```

**Request (manual):**
```json
{
  "sdrIds": ["uuid1", "uuid2"],
  "funnelId": "uuid",
  "classifications": ["diamante", "ouro"],
  "limit": 100,
  "considerWorkload": true,
  "dryRun": false
}
```

**Request (leads especificos):**
```json
{
  "leadIds": ["uuid1", "uuid2", "uuid3"],
  "sdrIds": ["uuid1"]
}
```

**Response 200:**
```json
{
  "success": true,
  "distributed": 42,
  "skipped": 5,
  "assignments": [
    { "leadId": "uuid", "leadName": "Joao", "sdrId": "uuid", "sdrName": "Maria" }
  ],
  "logId": "uuid",
  "message": "42 leads distribuidos com sucesso"
}
```

**Algoritmo:**
1. Calcula workload de cada SDR (leads em_atendimento)
2. Ordena SDRs por menor carga
3. Round-robin: atribui cada lead ao SDR com menor carga
4. Respeita `max_leads_per_sdr`
5. Atualiza `leads.status = 'em_atendimento'` e `leads.assigned_sdr_id`

---

### 3.3 cleanup-leads

**URL:** `POST /functions/v1/cleanup-leads`
**Auth:** Bearer JWT (admin ou lider)

**Request:**
```json
{
  "retentionHours": 24,
  "bronzeSheetName": "Bronze",
  "nonfitSheetName": "Nao-Fit",
  "dryRun": false
}
```

**Response 200:**
```json
{
  "success": true,
  "cleaned_count": 42,
  "bronze_count": 30,
  "nonfit_count": 12,
  "sheet_rows_added": 42,
  "sheet_url": "https://docs.google.com/spreadsheets/d/...",
  "dry_run": false,
  "errors": []
}
```

**Fluxo:**
1. Busca leads onde `classification = 'bronze'` OU `qualification = 'nao_fit'` E `updated_at < now() - retentionHours`
2. Exporta dados para Google Sheets (Bronze e Nao-Fit em abas separadas)
3. Registra em `cleanup_logs` com snapshot completo
4. Deleta leads do banco

---

### 3.4 import-leads-sheet

**URL:** `POST /functions/v1/import-leads-sheet`
**Auth:** Bearer JWT (admin ou lider)

#### Acao: import (default)

**Request:**
```json
{
  "funnelId": "uuid",
  "startRow": 2
}
```

**Response 200:**
```json
{
  "success": true,
  "totalImported": 150,
  "totalSkipped": 25,
  "hasMore": true,
  "nextRow": 2002,
  "totalRows": 5000,
  "processedRows": 2000
}
```

**Paginacao:** Processa 2000 linhas por chamada. Se `hasMore = true`, chamar novamente com `startRow = nextRow`.

**Deduplicacao:**
- Por `sheet_row_id` (evita reimportar mesma linha)
- Por `email` (dentro do mesmo funil)
- Por `phone` (dentro do mesmo funil)
- Por `import_from_date` (ignora linhas anteriores a data configurada)

#### Acao: sync-all

```json
{ "syncAll": true }
```

Sincroniza todos os funis com `auto_sync_enabled = true`.

#### Acao: fetch-headers

```json
{
  "action": "fetch-headers",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "sheetName": "Respostas"
}
```

**Response:** `{ "success": true, "headers": ["Nome", "Email", "Telefone", ...] }`

#### Acao: test-connection

```json
{
  "action": "test-connection",
  "sheetUrl": "https://docs.google.com/spreadsheets/d/...",
  "sheetName": "Respostas"
}
```

**Response:** `{ "success": true }` ou erro com detalhes.

#### Acao: update-dates

```json
{
  "action": "update-dates",
  "funnelId": "uuid",
  "startRow": 2
}
```

Backfill de `form_filled_at` para leads existentes sem data.

---

### 3.5 sync-google-calendar

**URL:** `POST /functions/v1/sync-google-calendar`
**Auth:** Bearer JWT

#### Criar evento

```json
{
  "action": "create",
  "appointmentId": "uuid",
  "closerEmail": "closer@email.com",
  "eventData": {
    "summary": "Call - Joao Silva (Diamante)",
    "description": "Lead: Joao Silva\nTelefone: 11999999999\nFunil: Instagram",
    "start": "2026-03-15T14:00:00-03:00",
    "end": "2026-03-15T15:30:00-03:00",
    "attendees": ["closer@email.com"]
  }
}
```

**Response:** `{ "success": true, "eventId": "google_event_id" }`

Salva `google_calendar_event_id` no appointment.

#### Atualizar evento

```json
{
  "action": "update",
  "appointmentId": "uuid",
  "closerEmail": "closer@email.com",
  "eventData": { "summary": "...", "start": "...", "end": "..." }
}
```

#### Deletar evento

```json
{
  "action": "delete",
  "appointmentId": "uuid"
}
```

Limpa `google_calendar_event_id` do appointment.

---

## 4. Mapa de Queries por Hook

Esta tabela mostra exatamente quais tabelas e operacoes cada hook do frontend realiza.

| Hook | Tabela(s) | Operacao | Query Key |
|---|---|---|---|
| `useLeads` | leads + funnels + profiles | SELECT | `['leads', filters]` |
| `useLead` | leads + funnels + profiles | SELECT | `['lead', id]` |
| `useUpdateLead` | leads | UPDATE | invalidates `['leads']` |
| `useLeadsStats` | leads | SELECT (.limit 5000) | `['leads-stats']` |
| `useAppointments` | appointments + leads + profiles + funnels | SELECT | `['appointments', filters]` |
| `useCreateAppointment` | appointments, leads | INSERT, UPDATE | invalidates `['appointments']`, `['leads']` |
| `useUpdateAppointment` | appointments | UPDATE | invalidates `['appointments']` |
| `useRescheduleAppointment` | appointments | UPDATE | invalidates `['appointments']` |
| `useRegisterCallResult` | appointments, leads | UPDATE | invalidates `['appointments']`, `['leads']` |
| `useAppointmentStats` | appointments | SELECT | `['appointment-stats']` |
| `useUsers` | profiles + user_roles | SELECT (parallel) | `['users']` |
| `useUsersByRole` | profiles + user_roles | SELECT | `['users-by-role', role]` |
| `useCRMColumns` | crm_columns | SELECT | `['crm-columns']` |
| `useMoveLeadColumn` | leads, lead_activities | UPDATE, INSERT | invalidates `['leads']` |
| `useFunnels` | funnels | SELECT | `['funnels']` |
| `useDistributionRules` | distribution_rules | SELECT | `['distribution-rules']` |
| `useExecuteDistribution` | Edge Function | POST | invalidates `['leads']` |
| `useQualificationRules` | qualification_rules | SELECT | `['qualification-rules', funnelId]` |
| `useSDRCapacities` | sdr_capacities | SELECT | `['sdr-capacities']` |
| `useNiches` | niches | SELECT | `['niches']` |
| `useNotifications` | notifications | SELECT + Realtime | `['notifications']` |
| `useActivityLogs` | activity_logs | SELECT | `['activity-logs', filters]` |
| `useCleanupLogs` | cleanup_logs | SELECT | `['cleanup-logs']` |
| `useExecuteCleanup` | Edge Function | POST | invalidates `['cleanup-*']` |
| `useSheetSync` | Edge Function | POST | invalidates `['funnels']` |
| `useSDRStats` | leads + appointments | SELECT (parallel) | `['sdr-stats', sdrId, dateRange]` |
| `useCloserStats` | appointments | SELECT | `['closer-stats', closerId, dateRange]` |
| `useFunnelStats` | funnels + leads + appointments | SELECT (parallel) | `['funnel-stats', dateRange]` |
| `useLeadsEvolution` | leads | SELECT | `['leads-evolution']` |
| `useConversionFunnel` | leads + appointments | SELECT | `['conversion-funnel']` |

---

## 5. Integracao como Microsservico

### 5.1 Como Conectar um Servico Externo

1. **Obter token JWT** via `/auth/v1/token` com credenciais de um usuario admin/lider
2. **Usar PostgREST** para CRUD de leads, appointments, funnels etc.
3. **Usar Edge Functions** para operacoes complexas (distribuicao, import, cleanup)
4. **Assinar Realtime** para receber notificacoes em tempo real

### 5.2 Exemplo: Inserir Lead via Servico Externo

```bash
# 1. Autenticar
TOKEN=$(curl -s -X POST '{SUPABASE_URL}/auth/v1/token?grant_type=password' \
  -H 'apikey: {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemplo.com","password":"senha123"}' \
  | jq -r '.access_token')

# 2. Inserir lead
curl -X POST '{SUPABASE_URL}/rest/v1/leads' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'apikey: {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Lead Externo",
    "phone": "11999999999",
    "email": "lead@externo.com",
    "revenue": 100000,
    "niche": "Tecnologia/SaaS",
    "funnel_id": "{UUID_DO_FUNIL}",
    "status": "novo"
  }'
```

O trigger `trg_qualify_lead_after_insert` executa automaticamente a qualificacao.

### 5.3 Exemplo: Distribuir Leads via Servico Externo

```bash
curl -X POST '{SUPABASE_URL}/functions/v1/distribute-leads' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "ruleId": "{UUID_DA_REGRA}"
  }'
```

### 5.4 Webhooks HTTP (Saida)

O sistema suporta webhooks HTTP para notificar servicos externos sobre eventos.

#### Registrar webhook

```bash
curl -X POST '{SUPABASE_URL}/rest/v1/webhook_subscriptions' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'apikey: {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "organization_id": "{ORG_UUID}",
    "event_type": "lead.created",
    "target_url": "https://sistema-mae.com/webhooks/bethel",
    "secret": "whsec_minha_chave_secreta_256bits",
    "active": true
  }'
```

#### Eventos disponiveis

| Evento | Quando disparado |
|---|---|
| `lead.created` | Novo lead inserido |
| `lead.updated` | Lead atualizado (status, classificacao, etc) |
| `lead.assigned` | Lead atribuido a um SDR |
| `lead.qualified` | Lead qualificado automaticamente |
| `lead.cleaned` | Lead arquivado (cleanup) |
| `appointment.created` | Agendamento criado |
| `appointment.updated` | Agendamento atualizado |
| `appointment.completed` | Call realizada (resultado registrado) |
| `distribution.executed` | Distribuicao de leads executada |
| `import.completed` | Import de Google Sheets concluido |

#### Formato do payload recebido

```json
{
  "event_type": "lead.assigned",
  "organization_id": "uuid",
  "data": {
    "lead_id": "uuid",
    "lead_name": "Joao Silva",
    "assigned_sdr_id": "uuid",
    "assigned_sdr_name": "Maria"
  },
  "timestamp": "2026-03-04T14:30:00Z"
}
```

#### Verificacao de assinatura

```python
import hmac, hashlib

received_signature = request.headers['X-Webhook-Signature']  # sha256=abc123...
expected = 'sha256=' + hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
assert hmac.compare_digest(received_signature, expected)
```

#### Disparar webhook manualmente (Edge Function)

```bash
curl -X POST '{SUPABASE_URL}/functions/v1/webhook-dispatcher' \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "event_type": "lead.created",
    "organization_id": "{ORG_UUID}",
    "data": { "lead_id": "uuid", "lead_name": "Teste" }
  }'
```

### 5.5 Webhooks (Entrada)

Para receber dados de servicos externos:
1. Criar lead via PostgREST (trigger de qualificacao executa automaticamente)
2. Usar Edge Function `import-leads-sheet` para importacao em batch
3. Para integracao customizada: criar nova Edge Function em `supabase/functions/`

### 5.6 Multi-Tenancy

Todas as operacoes sao automaticamente isoladas por organizacao:

```
Usuario autentica → profiles.organization_id → RLS filtra tudo
```

- **PostgREST**: RLS usa `my_org()` para filtrar automaticamente
- **Edge Functions**: Resolvem `organization_id` do perfil do usuario e escopam queries
- **Webhooks**: Isolados por organizacao (cada org tem suas subscriptions)

#### Criar organizacao (via service role)

```bash
curl -X POST '{SUPABASE_URL}/rest/v1/organizations' \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'apikey: {ANON_KEY}' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Empresa XYZ",
    "slug": "empresa-xyz",
    "settings": {
      "timezone": "America/Sao_Paulo",
      "locale": "pt-BR",
      "default_appointment_duration": 90,
      "max_leads_per_page": 50,
      "cleanup_retention_hours": 24
    }
  }'
```

---

## 6. Codigos de Erro

| HTTP | Significado | Causa Comum |
|---|---|---|
| 400 | Bad Request | Filtro com valor de enum invalido, campo obrigatorio faltando |
| 401 | Unauthorized | Token JWT expirado ou ausente |
| 403 | Forbidden | Role insuficiente (ex: SDR tentando acessar admin) ou organizacao errada |
| 404 | Not Found | Registro nao existe ou pertence a outra organizacao |
| 406 | Not Acceptable | Header `Accept` invalido no PostgREST |
| 409 | Conflict | Violacao de UNIQUE constraint |
| 500 | Internal Error | Erro na Edge Function ou trigger |

---

## 7. Limites e Consideracoes

| Aspecto | Limite | Nota |
|---|---|---|
| Paginacao de leads | 50/pagina (default) | Configuravel via `pageSize` ou `organizations.settings` |
| Import Google Sheets | 2000 linhas/request | Suporta paginacao automatica |
| Stats de leads | 5000 registros max | `.limit(5000)` no `useLeadsStats` |
| Retry de queries | 2 tentativas | Backoff exponencial (1s, 2s) |
| staleTime | 30 segundos | Dados considerados frescos por 30s |
| Appointment duration | 90 min (default) | Configuravel por org via `organizations.settings` |
| Retention cleanup | 24 horas (default) | Configuravel por org via `organizations.settings` |
| Webhook timeout | 10 segundos | Timeout por request de webhook |
| Webhook logs | Ultimos 1000 chars | Response body truncado |
