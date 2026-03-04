# Bethel SDR — Documentacao do Sistema

**Versao:** 3.0 (Multi-Tenant)
**Ultima atualizacao:** 2026-03-04
**Tipo:** Microsservico multi-tenant de gestao de pipeline de vendas B2B

---

## 1. Visao Geral

O **Bethel SDR** e um microsservico completo de gestao de pipeline de vendas B2B. Cobre desde a captacao de leads via Google Sheets, qualificacao automatica, distribuicao para SDRs, gestao via Kanban CRM, agendamento de calls com Closers, ate relatorios de performance e exportacao em multiplos formatos.

### 1.1 Responsabilidades do Microsservico

| Responsabilidade | Descricao |
|---|---|
| **Captacao de Leads** | Import via Google Sheets ou CSV com deduplicacao e mapeamento de colunas |
| **Qualificacao Automatica** | Motor de regras configuravel (AND/OR) que classifica leads em diamante/ouro/prata/bronze |
| **Distribuicao Inteligente** | Round-robin com balanceamento de carga, limites por SDR e agendamento |
| **CRM Kanban** | Pipeline visual com drag-and-drop e colunas customizaveis |
| **Agendamento** | Calendario multi-view com sync Google Calendar |
| **Analytics** | Relatorios por SDR, Closer, Funil e Rankings com exportacao CSV/Excel/PDF |
| **Limpeza Automatizada** | Archiving de leads bronze/nao-fit com backup em Google Sheets |
| **Notificacoes Real-time** | Via Supabase Realtime para atribuicoes e agendamentos |
| **Multi-Tenancy** | Isolamento completo por organizacao em todas as 16 tabelas via RLS |
| **Webhooks** | Notificacoes HTTP para servicos externos com HMAC-SHA256 |
| **API Keys** | Chaves de acesso para integracao service-to-service |

### 1.2 Stack Tecnologico

```
┌──────────────────────────────────────────────────────┐
│                  FRONTEND (SPA)                       │
│  React 18 + TypeScript + Vite                        │
│  UI: shadcn/ui (Radix) + Tailwind CSS               │
│  State: TanStack React Query v5                      │
│  Forms: react-hook-form + Zod                        │
│  Drag & Drop: @dnd-kit                               │
│  Graficos: Recharts                                  │
│  Export: @react-pdf/renderer + xlsx                   │
├──────────────────────────────────────────────────────┤
│                SUPABASE BACKEND                       │
│  Auth: Email/Password (JWT)                          │
│  Database: PostgreSQL 15 + RLS                       │
│  Edge Functions: Deno (6 funcoes)                    │
│  Realtime: Canais para notificacoes                  │
│  PostgREST: v14.1 (API automatica)                   │
├──────────────────────────────────────────────────────┤
│             INTEGRACOES EXTERNAS                      │
│  Google Sheets API v4 (import de leads)              │
│  Google Calendar API v3 (sync agendamentos)          │
│  WhatsApp (links diretos wa.me)                      │
└──────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura

### 2.1 Diagrama de Componentes

```
                    ┌─────────────┐
                    │   Browser    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Frontend   │  React SPA (porta 8080)
                    │   (Vite)    │  Code-split por rota
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────────┐
       │  PostgREST  │ │  Auth   │ │    Edge      │
       │  (REST API) │ │  (JWT)  │ │  Functions   │
       └──────┬──────┘ └────┬────┘ └──────┬───────┘
              │             │             │
       ┌──────▼─────────────▼─────────────▼───────┐
       │              PostgreSQL                    │
       │     (RLS + Triggers + Functions)           │
       └──────────────────────────────────────────┘
```

### 2.2 Estrutura de Diretorios

```
bethel-sdr/
├── docs/                    # Documentacao (este diretorio)
│   ├── README.md            # Visao geral (este arquivo)
│   ├── FRONTEND.md          # Documentacao do frontend
│   ├── BACKEND.md           # Documentacao do backend
│   └── API_CONTRACT.md      # Contrato de integracao
├── src/                     # Codigo-fonte do frontend
│   ├── pages/               # 10 paginas (rotas)
│   ├── components/          # ~60 componentes React
│   │   ├── ui/              # shadcn/ui (30+ primitivos)
│   │   ├── layout/          # AppLayout, Sidebar, Header
│   │   ├── shared/          # ErrorBoundary, StatusBadge, etc.
│   │   ├── auth/            # ProtectedRoute
│   │   ├── crm/             # Kanban (Board, Column, Card)
│   │   ├── calendar/        # Calendario (Weekly, Monthly, List)
│   │   ├── leads/           # ImportCSV, LeadDetails
│   │   ├── leader/          # LeadCard, LeadFilters
│   │   ├── reports/         # Metricas, Graficos, Rankings
│   │   ├── admin/           # 13 paineis de administracao
│   │   ├── dashboard/       # Graficos do dashboard
│   │   └── notifications/   # Bell, NotificationItem
│   ├── hooks/               # 20+ hooks (React Query)
│   ├── integrations/        # Cliente Supabase + tipos gerados
│   ├── lib/                 # Utilitarios (export, PDF, calendar)
│   ├── types/               # Tipos TypeScript do dominio
│   └── test/                # Testes (Vitest)
├── supabase/
│   ├── migrations/          # 15 migracoes SQL
│   ├── functions/           # 6 Edge Functions (Deno)
│   │   ├── admin-create-user/
│   │   ├── distribute-leads/
│   │   ├── cleanup-leads/
│   │   ├── import-leads-sheet/
│   │   ├── sync-google-calendar/
│   │   └── webhook-dispatcher/
│   └── config.toml          # Configuracao (project_id, JWT)
├── .env.example             # Template de variaveis de ambiente
├── package.json             # Dependencias
├── vite.config.ts           # Build config + chunks
├── tailwind.config.ts       # Design system
└── tsconfig.json            # TypeScript config
```

---

## 3. Modelo de Dados

### 3.1 Diagrama Entidade-Relacionamento

```
organizations
    │
    ├──1:N──► profiles
    ├──1:N──► funnels
    ├──1:N──► leads
    ├──1:N──► appointments
    ├──1:N──► (todas as 15 tabelas de dados)
    ├──1:N──► webhook_subscriptions
    ├──1:N──► webhook_logs
    └──1:N──► api_keys

auth.users (Supabase Auth)
    │
    ├──1:1──► profiles (nome, email, timezone, active, organization_id)
    │              │
    ├──1:1──► user_roles (app_role: admin|lider|sdr|closer)
    │
    ├──1:N──► leads (assigned_sdr_id)
    │            │
    │            ├──► funnels (funnel_id)
    │            ├──► crm_columns (crm_column_id)
    │            ├──N:1──► lead_activities (audit trail)
    │            └──1:N──► appointments
    │                         │
    │                         ├──► profiles (sdr_id)
    │                         ├──► profiles (closer_id)
    │                         └──► funnels (funnel_id)
    │
    ├──1:N──► closer_availability (dia/hora)
    ├──1:N──► notifications (realtime)
    └──1:N──► activity_logs (audit geral)

Tabelas auxiliares (sem FK para auth.users):
    ├── qualification_rules (motor de regras)
    ├── distribution_rules (distribuicao automatica)
    ├── lead_distribution_logs (historico)
    ├── sdr_capacities (limites por SDR/funil)
    ├── niches (20+ nichos pre-cadastrados)
    ├── cleanup_logs (historico de limpeza)
    ├── webhook_subscriptions (webhooks de saida)
    ├── webhook_logs (historico de entregas)
    └── api_keys (chaves de integracao)
```

### 3.2 Enums

| Enum | Valores |
|---|---|
| `app_role` | `admin`, `lider`, `sdr`, `closer` |
| `lead_classification` | `diamante`, `ouro`, `prata`, `bronze` |
| `lead_status` | `novo`, `em_atendimento`, `agendado`, `concluido` |
| `appointment_status` | `agendado`, `reagendado`, `realizado`, `nao_compareceu` |

### 3.3 Fluxo de Status do Lead

```
novo ──► em_atendimento ──► agendado ──► concluido
  │                                         │
  └──── (cleanup bronze/nao_fit) ──► deletado + backup em Google Sheets
```

---

## 4. Papeis e Permissoes

| Papel | Pode ver | Pode gerenciar | Rotas |
|---|---|---|---|
| **admin** | Tudo | Tudo + usuarios/roles | Todas |
| **lider** | Tudo | Leads, funis, distribuicao, regras | Todas exceto roles |
| **sdr** | Leads atribuidos, appointments | Seus leads, criar appointments | `/leads`, `/crm`, `/calendario`, `/perfil` |
| **closer** | Seus appointments | Registrar resultado de calls | `/calendario`, `/perfil` |

**Seguranca em 4 camadas:**
1. **Frontend:** `ProtectedRoute` com `allowedRoles` por rota
2. **Banco:** RLS (Row Level Security) em todas as 19 tabelas com escopo por `organization_id`
3. **Edge Functions:** Verificacao de token JWT + role check + resolucao de `organization_id`
4. **Multi-Tenancy:** Funcao `my_org()` em todas as policies garante isolamento entre organizacoes

---

## 5. Variaveis de Ambiente

### 5.1 Frontend (.env)

| Variavel | Descricao | Exemplo |
|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | ID do projeto Supabase | `zlijqelcmweqwkivmnag` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave anon (publica) | `eyJhbG...` |
| `VITE_SUPABASE_URL` | URL do Supabase | `https://xxx.supabase.co` |

### 5.2 Edge Functions (Supabase Secrets)

| Variavel | Descricao | Usado por |
|---|---|---|
| `SUPABASE_URL` | URL do projeto (automatico) | Todas |
| `SUPABASE_ANON_KEY` | Chave anon (automatico) | Todas |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service role (automatico) | Todas |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email da service account Google | sync-google-calendar, cleanup-leads, import-leads-sheet |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Chave privada RSA (PEM) | sync-google-calendar, cleanup-leads, import-leads-sheet |
| `CLEANUP_SPREADSHEET_ID` | ID da planilha de backup | cleanup-leads |

---

## 6. Como Rodar Localmente

```bash
# 1. Clonar o repositorio
git clone <URL_DO_REPO>
cd bethel-sdr

# 2. Instalar dependencias
npm install

# 3. Configurar variaveis de ambiente
cp .env.example .env
# Editar .env com as credenciais do Supabase

# 4. Iniciar o servidor de desenvolvimento
npm run dev
# Acesse http://localhost:8080

# 5. Build para producao
npm run build
# Output em dist/
```

---

## 7. Integracao como Microsservico

### 7.1 Pontos de Integracao

O Bethel SDR pode ser integrado a um servico maior atraves de:

| Metodo | Descricao | Documentacao |
|---|---|---|
| **PostgREST API** | CRUD completo via REST (auto-gerado pelo Supabase) | `API_CONTRACT.md` |
| **Edge Functions** | Operacoes complexas (distribuicao, cleanup, import, calendar, webhooks) | `API_CONTRACT.md` |
| **Supabase Realtime** | WebSocket para notificacoes em tempo real | `BACKEND.md` |
| **Webhooks HTTP** | POST para URLs externas com HMAC-SHA256 signature | `API_CONTRACT.md` |
| **Auth JWT** | Tokens JWT padrao para autenticacao cross-service | `API_CONTRACT.md` |
| **API Keys** | Chaves de integracao com permissoes granulares | `API_CONTRACT.md` |

### 7.2 Dependencias Externas

| Servico | Funcao | Obrigatorio? |
|---|---|---|
| **Supabase** | Banco, auth, edge functions, realtime | Sim |
| **Google Sheets API** | Import de leads e backup de cleanup | Nao (funciona sem) |
| **Google Calendar API** | Sync de agendamentos | Nao (funciona sem) |

---

## 8. Referencias

| Documento | Conteudo |
|---|---|
| [`docs/FRONTEND.md`](./FRONTEND.md) | Arquitetura do frontend: pages, hooks, components, types, build |
| [`docs/BACKEND.md`](./BACKEND.md) | Arquitetura do backend: tabelas, RLS, triggers, Edge Functions |
| [`docs/API_CONTRACT.md`](./API_CONTRACT.md) | Contrato de integracao: endpoints, schemas, autenticacao |
