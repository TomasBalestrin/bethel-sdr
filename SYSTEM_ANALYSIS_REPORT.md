# Bethel SDR - Relatório Completo de Análise do Sistema

**Data:** 03 de Março de 2026
**Versão:** 1.0
**Autor:** Análise técnica automatizada com revisão especializada

---

## Sumário Executivo

O **Bethel SDR** é uma plataforma completa de gestão de pipeline de vendas B2B, desenvolvida em React + TypeScript com backend Supabase (PostgreSQL + Edge Functions). O sistema cobre desde a captação de leads via Google Sheets, qualificação automática, distribuição para SDRs, gestão via Kanban CRM, agendamento de calls com Closers, até relatórios de performance e exportação em múltiplos formatos.

**Estado geral:** O sistema possui uma base sólida com funcionalidades de negócio bem implementadas, design system consistente e arquitetura moderna. Entretanto, apresenta **vulnerabilidades de segurança críticas**, ausência total de testes automatizados, problemas de performance (N+1 queries), e funcionalidades incompletas que precisam ser endereçadas antes de um uso em produção confiável.

### Classificação por Área

| Área | Nota | Status |
|------|------|--------|
| Funcionalidades de Negócio | 8/10 | Bem implementado |
| Design / UX | 8/10 | Consistente e profissional |
| Arquitetura Frontend | 7/10 | Sólida, com melhorias possíveis |
| Arquitetura Backend | 6/10 | Funcional, mas com lacunas de segurança |
| Segurança | 3/10 | Crítico - requer ação imediata |
| Performance | 5/10 | Problemas sérios de N+1 queries |
| Qualidade de Código | 5/10 | TypeScript subutilizado, zero testes |
| DevOps / CI/CD | 1/10 | Inexistente |
| Acessibilidade | 3/10 | Quase nenhuma implementação ARIA |
| Documentação | 2/10 | README genérico, sem docs técnicos |

---

## 1. Arquitetura Atual

### 1.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (SPA)                        │
│  React 18 + TypeScript + Vite (porta 8080)              │
│  UI: shadcn/ui (Radix) + Tailwind CSS                   │
│  State: TanStack React Query v5                         │
│  Forms: react-hook-form + Zod                           │
│  Drag & Drop: @dnd-kit                                  │
│  Gráficos: Recharts                                     │
│  Export: @react-pdf/renderer + xlsx                      │
├─────────────────────────────────────────────────────────┤
│                   SUPABASE BACKEND                       │
│  Auth: Email/Password (JWT)                             │
│  Database: PostgreSQL + RLS                             │
│  Edge Functions: Deno (5 funções)                       │
│  Realtime: Canais para notificações                     │
├─────────────────────────────────────────────────────────┤
│               INTEGRAÇÕES EXTERNAS                       │
│  Google Sheets API v4 (import de leads)                 │
│  Google Calendar API v3 (sync de agendamentos)          │
│  WhatsApp (links diretos wa.me)                         │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Estrutura de Diretórios

```
bethel-sdr/
├── src/
│   ├── pages/           # 8 páginas (Auth, Dashboard, Leads, CRM, etc.)
│   ├── components/      # ~60 componentes organizados por domínio
│   │   ├── ui/          # shadcn/ui (30+ primitivos Radix)
│   │   ├── layout/      # AppLayout, AppSidebar, AppHeader
│   │   ├── auth/        # ProtectedRoute
│   │   ├── crm/         # Kanban (Board, Column, Card)
│   │   ├── calendar/    # Calendário (Weekly, Monthly, List)
│   │   ├── leads/       # ImportCSV, LeadDetails
│   │   ├── leader/      # LeadCard, LeadFilters
│   │   ├── reports/     # Métricas, Gráficos, Rankings, Export
│   │   ├── admin/       # 12 modais/painéis de administração
│   │   ├── notifications/
│   │   └── shared/      # StatsCard, StatusBadge, EmptyState
│   ├── hooks/           # 20+ hooks customizados (React Query)
│   ├── integrations/    # Cliente Supabase + tipos gerados
│   ├── lib/             # Utilitários (export, PDF, calendar sync)
│   ├── types/           # Tipos TypeScript do domínio
│   └── test/            # Apenas um teste placeholder
├── supabase/
│   ├── migrations/      # 13 migrações SQL
│   ├── functions/       # 5 Edge Functions (Deno)
│   └── config.toml      # Configuração Supabase
└── configurações raiz   # vite, tailwind, tsconfig, eslint, etc.
```

### 1.3 Modelo de Dados

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   profiles   │────▶│  user_roles  │     │     funnels       │
│  (usuários)  │     │ (app_role)   │     │ (google sheet     │
└──────┬───────┘     └──────────────┘     │  column mapping)  │
       │                                   └────────┬─────────┘
       │           ┌─────────────────────────────────┘
       │           │
       ▼           ▼
┌──────────────────────────────────────────────────────────┐
│                        leads                              │
│  full_name, phone, email, revenue, niche, state          │
│  classification (diamante/ouro/prata/bronze)             │
│  status (novo → em_atendimento → agendado → concluido)   │
│  assigned_sdr_id, crm_column_id, funnel_id               │
│  custom_fields (JSONB), sheet_row_id                     │
└───┬──────────────┬──────────────┬────────────────────────┘
    │              │              │
    ▼              ▼              ▼
┌──────────┐ ┌───────────┐ ┌─────────────────┐
│ lead_    │ │ crm_      │ │  appointments   │
│activities│ │ columns   │ │  (closer_id,    │
│ (audit)  │ │ (Kanban)  │ │   google_cal)   │
└──────────┘ └───────────┘ └─────────────────┘

Tabelas auxiliares:
├── qualification_rules   (regras de qualificação automática)
├── distribution_rules    (regras de distribuição de leads)
├── sdr_capacities        (limites por SDR/funil)
├── closer_availability   (disponibilidade semanal - SEM UI)
├── niches                (20+ nichos pré-cadastrados)
├── notifications         (realtime via Supabase)
├── activity_logs         (audit trail geral - SEM UI)
├── lead_distribution_logs
└── cleanup_logs
```

### 1.4 Papéis e Permissões

| Papel | Acesso | Rotas |
|-------|--------|-------|
| **admin** | Acesso total, gestão de usuários e roles | Todas |
| **lider** | Gestão de leads, funis, distribuição, relatórios | Todas exceto gestão de roles |
| **sdr** | Leads atribuídos, CRM, Calendário | `/leads`, `/crm`, `/calendario` |
| **closer** | Apenas calendário (seus agendamentos) | `/calendario` |

Segurança implementada em 3 camadas:
1. **Frontend:** `ProtectedRoute` com array de roles + menu da sidebar filtrado
2. **Banco de dados:** RLS (Row Level Security) em todas as tabelas
3. **Edge Functions:** Verificação manual de token (apenas `admin-create-user`)

---

## 2. O Que Está Funcionando Bem

### 2.1 Funcionalidades de Negócio Completas

- **Pipeline completo de vendas:** Lead → Qualificação → Distribuição → CRM → Agendamento → Conversão
- **Importação de leads** via Google Sheets com mapeamento de colunas, deduplicação e paginação
- **Motor de qualificação** automática com regras configuráveis (condições AND/OR, prioridade)
- **Distribuição inteligente** com round-robin, balanceamento de carga, limites por SDR
- **CRM Kanban** funcional com drag-and-drop suave e colunas customizáveis
- **Calendário multi-view** (semanal/mensal/lista) com filtro por closer
- **Relatórios robustos** com 4 perspectivas (SDR, Closer, Funil, Rankings) e exportação CSV/Excel/PDF
- **Notificações em tempo real** via Supabase Realtime
- **Sync com Google Calendar** para agendamentos
- **Limpeza automatizada** de leads bronze/não-fit com backup em Google Sheets
- **Dark/Light mode** completo com CSS custom properties

### 2.2 Design System e UX

- **shadcn/ui** bem implementado com design consistente
- **Sistema de cores classificatório** (Diamante/Ouro/Prata/Bronze) com identidade visual clara
- **Skeleton loading** em todas as seções que carregam dados
- **Feedback visual** adequado em mutações (botões com "Salvando...", "Agendando...")
- **Responsive design** com breakpoints Tailwind e sidebar colapsável
- **Efeitos visuais elegantes:** glassmorphism no header, glow effects, animações suaves
- **Integração WhatsApp** prática com links diretos

### 2.3 Arquitetura de Código

- **Separação clara de responsabilidades:** hooks (dados) / components (UI) / pages (composição)
- **TanStack React Query** bem utilizado com invalidação automática de cache em mutações
- **Validação de formulários** consistente com react-hook-form + Zod
- **Tipos TypeScript** definidos no domínio (`database.ts`) e gerados pelo Supabase
- **RLS no banco** como camada primária de autorização

---

## 3. Problemas Críticos (P0 - Ação Imediata)

### 3.1 SEGURANÇA: `.env` com credenciais commitado no repositório

**Arquivo:** `.env` (na raiz)

```
VITE_SUPABASE_PROJECT_ID="lxyqqlwbpygeilrriljc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIs..."
VITE_SUPABASE_URL="https://lxyqqlwbpygeilrriljc.supabase.co"
```

**Impacto:** Credenciais expostas no histórico do Git. O `.gitignore` não inclui `.env`.

**Ação necessária:**
1. Adicionar `.env` ao `.gitignore` imediatamente
2. Rotacionar as chaves do Supabase
3. Criar `.env.example` documentando as variáveis necessárias
4. Limpar o histórico do Git (git filter-branch ou BFG)

### 3.2 SEGURANÇA: Todas as Edge Functions com `verify_jwt = false`

**Arquivo:** `supabase/config.toml`

Todas as 5 Edge Functions desabilitam a verificação JWT no gateway:
- `admin-create-user` — implementa auth manual (ok, mas frágil)
- `distribute-leads` — **SEM auth**, operação destrutiva
- `cleanup-leads` — **SEM auth**, deleta leads do banco
- `import-leads-sheet` — **SEM auth**, insere dados
- `sync-google-calendar` — **SEM auth**, cria eventos

**Impacto:** Qualquer pessoa que conheça a URL da função e a anon key pode invocar operações destrutivas.

**Ação necessária:**
1. Habilitar `verify_jwt = true` em todas as funções
2. Implementar verificação de role em cada Edge Function
3. Usar `supabase.auth.getUser()` com o token do header

### 3.3 SEGURANÇA: Chamada direta com anon key para cleanup

**Arquivo:** `src/hooks/useCleanupLogs.ts` (linhas 115-121)

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/cleanup-leads`,
  { headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` } }
);
```

Usa a anon key diretamente em vez de `supabase.functions.invoke()`, combinado com `verify_jwt = false`.

**Ação:** Migrar para `supabase.functions.invoke('cleanup-leads', ...)` que envia o token da sessão do usuário.

---

## 4. Problemas Sérios (P1 - Curto Prazo)

### 4.1 PERFORMANCE: N+1 Queries nos Relatórios

**Arquivo:** `src/hooks/useReportsStats.ts`

```typescript
// Para cada SDR, 2 queries sequenciais ao banco
for (const profile of profiles || []) {
  const { data: leads } = await supabase.from('leads').select(...)
    .eq('assigned_sdr_id', profile.user_id);
  const { data: appointments } = await supabase.from('appointments').select(...)
    .in('lead_id', leadIds);
}
```

Com 10 SDRs = **20 round-trips sequenciais** antes da página renderizar.

**Mesma lógica duplicada em:**
- `useSDRRankings` (~linhas 249-291)
- `useAllSDRsPerformance` (~linhas 379-410)
- `useAllClosersPerformance`
- Edge Function `distribute-leads` (2 queries por SDR)

**Solução:** Criar views SQL ou funções RPC no Supabase com `GROUP BY` para consolidar em 1-2 queries.

### 4.2 PERFORMANCE: Zero Code Splitting

**Arquivo:** `src/App.tsx`

Todas as páginas importadas estaticamente no topo, incluindo bibliotecas pesadas:
- `@react-pdf/renderer` (~300KB)
- `xlsx` (~200KB)
- `recharts` (~150KB)
- Todos os componentes Radix UI

**Impacto:** Bundle inicial carrega TUDO, mesmo para um SDR que só acessa `/leads`.

**Solução:** Implementar `React.lazy()` + `Suspense` em todas as rotas.

### 4.3 PERFORMANCE: React Query sem staleTime

**Arquivo:** `src/App.tsx`

```typescript
const queryClient = new QueryClient(); // zero configuração
```

`staleTime: 0` (padrão) = toda navegação entre rotas refaz TODAS as queries.

**Solução:** Configurar `staleTime` global (ex: 30s para dados de lista, 5min para dados de configuração).

### 4.4 CÓDIGO: Dois Sistemas de Toast Misturados

O app usa **sonner** (`toast.success(...)`) na maioria dos hooks, mas `use-toast` (Radix Toast) em `useCleanupLogs.ts`. São dois sistemas de notificação concorrentes.

**Solução:** Padronizar em sonner e remover o sistema duplicado.

### 4.5 CÓDIGO: Erros Silenciosos nos Relatórios

**Arquivo:** `src/hooks/useReportsStats.ts`

```typescript
const { data: appointments } = await supabase.from('appointments').select(...)
// 'error' não é verificado - falhas retornam undefined silenciosamente
```

Queries que falham mostram zeros na UI sem nenhum feedback ao usuário.

**Solução:** Verificar `error` em todas as queries e lançar exceções para o React Query capturar.

### 4.6 CÓDIGO: Implementação de Distribuição Duplicada

Existem **duas implementações** de distribuição de leads:
1. `useLeads.ts` → `useDistributeLeads` — loop de `supabase.update()` no client-side
2. `useDistributionRules.ts` → `useExecuteDistribution` — chama a Edge Function

A versão client-side é inferior (sem balanceamento, sem logs).

**Solução:** Remover a implementação client-side e usar apenas a Edge Function.

---

## 5. Problemas Moderados (P2 - Médio Prazo)

### 5.1 TESTES: Zero Cobertura

- Vitest + Testing Library instalados e configurados
- Apenas 1 teste placeholder (`expect(true).toBe(true)`)
- Nenhum teste de componente, hook ou integração

**Impacto:** Qualquer refatoração ou nova feature pode quebrar funcionalidades existentes sem detecção.

**Prioridade de testes:**
1. Hooks de mutação (distribuição, qualificação, import)
2. Lógica de qualificação de leads (função SQL)
3. Componentes críticos (KanbanBoard, ImportCSVModal)
4. Fluxo de autenticação

### 5.2 TYPESCRIPT: 20+ usos de `any`

Locais críticos:
- `useReportsStats.ts` — `any[]` em dados de appointments
- `useCleanupLogs.ts` — `lead: any` no mapping
- `useAppointments.ts` — 4x `as any` para cast de relations
- `CRM.tsx` — `leads as any` passado ao KanbanBoard
- `QualificationRuleFormModal.tsx` — 3x `as any` em mutations
- `MonthlyCalendarGrid.tsx` — `appointments: any[]` na interface de props

ESLint com `@typescript-eslint/no-unused-vars: "off"` esconde código morto.

### 5.3 DEVOPS: Nenhum CI/CD

- Sem GitHub Actions
- Sem Dockerfile
- Sem pipeline de deploy
- Sem lint/test automático em PRs
- Migrações Supabase sem runner automatizado

### 5.4 ACESSIBILIDADE: Lacunas Significativas

- Zero atributos `aria-*` em elementos interativos customizados
- Kanban drag-and-drop sem ARIA roles nos droppables/draggables
- Indicadores de classificação por cor apenas (sem ícone/texto alternativo para daltonismo)
- Mensagens de erro não vinculadas a inputs via `aria-describedby`
- Sem `role="status"` ou `aria-live` para toasts
- Labels de formulário inconsistentes em modais do admin

### 5.5 CÓDIGO: Duplicação na Edge Function de Import

**Arquivo:** `supabase/functions/import-leads-sheet/index.ts`

A lógica de mapeamento e importação de linhas (~70 linhas) está duplicada:
- Uma vez para sync de funil único (~linhas 840-909)
- Novamente para `syncAll` (~linhas 990-1049)

**Solução:** Extrair para função `processSheetRows()` compartilhada.

---

## 6. Funcionalidades Incompletas

### 6.1 "Meu Perfil" — Menu sem ação

**Arquivo:** `src/components/layout/AppHeader.tsx` (linha 76)

O item "Meu Perfil" no dropdown do usuário não tem `onClick`, navegação ou página destino.

**Necessário:** Criar página `/perfil` com edição de nome, email, timezone, senha e foto.

### 6.2 Gestão de Disponibilidade do Closer

A tabela `closer_availability` está definida no schema com todos os campos (dia da semana, horários, pausa), mas **não existe UI** para gerenciar.

**Necessário:** Criar tab "Disponibilidade" no admin ou permitir que o closer gerencie sua própria agenda.

### 6.3 Visualizador de Activity Logs

A tabela `activity_logs` registra ações (quem, o quê, em qual entidade, IP) mas **não existe UI** para visualizar.

**Necessário:** Criar tab "Logs de Atividade" no painel admin.

### 6.4 Deleção Manual de Leads

Não há opção de deletar lead individual na UI. Leads só saem via cleanup automático (bronze/não-fit).

**Avaliar:** Se admin/lider precisa de ação de delete direta.

### 6.5 Gestão de Nichos

A tabela `niches` tem 20+ nichos pré-cadastrados, mas a UI só os lê (no filtro). Não há CRUD para admin.

**Necessário:** Permitir que admin crie/edite/desative nichos.

### 6.6 README e Documentação

O `README.md` é o boilerplate genérico do Lovable.dev com placeholders `REPLACE_WITH_PROJECT_ID`.

**Necessário:** Documentação técnica do projeto, setup local, variáveis de ambiente, arquitetura.

---

## 7. Propostas de Melhoria

### 7.1 Fase 1 — Segurança e Estabilidade (Urgente)

| # | Melhoria | Esforço | Impacto |
|---|----------|---------|---------|
| 1 | Adicionar `.env` ao `.gitignore` + criar `.env.example` | 30min | Crítico |
| 2 | Habilitar `verify_jwt = true` em todas as Edge Functions | 2h | Crítico |
| 3 | Implementar verificação de role nas Edge Functions | 4h | Crítico |
| 4 | Migrar `useCleanupLogs` para `supabase.functions.invoke()` | 1h | Alto |
| 5 | Remover `console.log` de produção | 30min | Baixo |

### 7.2 Fase 2 — Performance (Curto Prazo)

| # | Melhoria | Esforço | Impacto |
|---|----------|---------|---------|
| 6 | Criar views/RPCs SQL para relatórios (eliminar N+1) | 8h | Alto |
| 7 | Implementar `React.lazy()` em todas as rotas | 2h | Alto |
| 8 | Configurar `staleTime` no QueryClient | 1h | Médio |
| 9 | Otimizar query de workload no `distribute-leads` com `GROUP BY` | 2h | Médio |

### 7.3 Fase 3 — Qualidade de Código (Médio Prazo)

| # | Melhoria | Esforço | Impacto |
|---|----------|---------|---------|
| 10 | Remover todos os `any` e tipar corretamente | 4h | Médio |
| 11 | Unificar toast system (apenas sonner) | 1h | Baixo |
| 12 | Remover distribuição client-side duplicada | 1h | Baixo |
| 13 | Extrair lógica duplicada na Edge Function de import | 2h | Baixo |
| 14 | Re-habilitar `no-unused-vars` no ESLint | 1h | Baixo |
| 15 | Escrever testes para hooks críticos | 16h | Alto |

### 7.4 Fase 4 — Funcionalidades Pendentes

| # | Melhoria | Esforço | Impacto |
|---|----------|---------|---------|
| 16 | Implementar página "Meu Perfil" | 4h | Médio |
| 17 | UI de gestão de disponibilidade do Closer | 8h | Alto |
| 18 | Visualizador de Activity Logs no admin | 4h | Médio |
| 19 | CRUD de Nichos no admin | 3h | Baixo |
| 20 | Documentação técnica (README + ADRs) | 4h | Médio |

### 7.5 Fase 5 — DevOps e Qualidade Contínua

| # | Melhoria | Esforço | Impacto |
|---|----------|---------|---------|
| 21 | GitHub Actions: lint + test + build em PRs | 4h | Alto |
| 22 | Deploy automatizado (Vercel/Netlify + Supabase CLI) | 4h | Alto |
| 23 | Acessibilidade: ARIA attributes nos componentes interativos | 8h | Médio |
| 24 | Monitoramento de erros (Sentry/LogRocket) | 2h | Alto |
| 25 | Bundle analysis e otimização | 2h | Médio |

---

## 8. Fluxo de Dados Atual

```
Google Sheets ──────────────────────────────────────────┐
  │                                                      │
  ▼ (import-leads-sheet)                                 │
                                                         │
CSV Upload ─────┐                                        │
                ▼                                        │
         ┌─────────────┐    apply_qualification_rules()  │
         │   leads      │◄───── (trigger on INSERT)      │
         │  (status:    │                                 │
         │   novo)      │                                 │
         └──────┬───────┘                                │
                │                                        │
                ▼ (distribute-leads)                     │
         ┌─────────────┐                                 │
         │   leads      │──── notify_lead_assignment()   │
         │  (status:    │     → notification ao SDR      │
         │ em_atendim.) │                                │
         └──────┬───────┘                                │
                │                                        │
                ▼ CRM Kanban (drag & drop)               │
         ┌─────────────┐                                 │
         │  crm_columns │◄── lead_activities (audit)     │
         │  (pipeline)  │                                │
         └──────┬───────┘                                │
                │                                        │
                ▼ schedule appointment                   │
         ┌─────────────────┐                             │
         │  appointments   │──── notify_appointment()    │
         │ (status:        │     → notification ao Closer│
         │  agendado)      │──── sync-google-calendar    │
         └──────┬──────────┘     → Google Calendar       │
                │                                        │
                ▼ outcome tracking                       │
         ┌──────────────┐                                │
         │  relatórios   │──── CSV / Excel / PDF         │
         │  (analytics)  │                               │
         └──────────────┘                                │
                                                         │
         ┌──────────────┐                                │
         │ cleanup-leads │──── Export para Google Sheets ─┘
         │ (bronze/      │     antes de deletar
         │  não-fit)     │
         └──────────────┘
```

---

## 9. Métricas do Código

| Métrica | Valor |
|---------|-------|
| Páginas | 8 |
| Componentes React | ~60 |
| Hooks customizados | 20+ |
| Edge Functions (Deno) | 5 |
| Migrações SQL | 13 |
| Tabelas no banco | 14 |
| Testes automatizados | 0 (1 placeholder) |
| Uso de `any` | 20+ ocorrências |
| Dependências (prod) | ~40 |
| Dependências (dev) | ~15 |
| Linguagem da UI | Português (BR) - hardcoded |
| i18n | Nenhum |

---

## 10. Conclusão e Próximos Passos Recomendados

### Prioridade Imediata (esta semana)
1. **Corrigir vulnerabilidades de segurança** (`.env`, JWT verification, auth nas Edge Functions)
2. **Criar `.env.example`** e documentar variáveis de ambiente

### Curto Prazo (2-4 semanas)
3. **Eliminar N+1 queries** com views SQL para relatórios
4. **Implementar code splitting** com React.lazy()
5. **Configurar CI/CD básico** (GitHub Actions)
6. **Escrever primeiros testes** para fluxos críticos

### Médio Prazo (1-2 meses)
7. **Completar funcionalidades pendentes** (Perfil, Disponibilidade Closer, Activity Logs)
8. **Melhorar acessibilidade** (ARIA, keyboard navigation)
9. **Limpar dívida técnica** (remover `any`, unificar toast, eliminar duplicações)
10. **Implementar monitoramento** de erros em produção

---

> **Nota:** Este relatório serve como base para discussão e priorização. As estimativas de esforço são aproximadas e podem variar conforme complexidade real encontrada durante a implementação. Recomendo abordar os itens P0 (segurança) antes de continuar com qualquer novo desenvolvimento de funcionalidade.
