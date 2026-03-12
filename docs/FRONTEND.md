# Bethel SDR — Frontend

**Stack:** React 18 + TypeScript + Vite + shadcn/ui + TanStack Query v5

---

## 1. Rotas e Paginas

| Rota | Pagina | Roles Permitidos | Hooks Usados | Descricao |
|---|---|---|---|---|
| `/auth` | `Auth.tsx` | Publico | `useAuth` | Login e cadastro |
| `/` | `Dashboard.tsx` | admin, lider | `useLeadsStats`, `useAppointmentStats`, `useLeadsEvolution`, `useConversionFunnel`, `usePerformanceByFunnel` | KPIs e graficos |
| `/gestao-leads` | `LeaderDashboard.tsx` | admin, lider | `useLeaderDashboard`, `useLeaderDashboardStats` | Gestao avancada de leads com filtros |
| `/leads` | `Leads.tsx` | admin, lider, sdr | `useLeads`, `useFunnels`, `useUpdateLead` | Tabela de leads com paginacao (50/pg), import CSV, filtros |
| `/crm` | `CRM.tsx` | admin, lider, sdr | `useCRMColumns`, `useLeads` | Kanban board drag-and-drop |
| `/calendario` | `Calendario.tsx` | Todos autenticados | `useAppointments`, `useUsersByRole` | Calendario semanal/mensal/lista |
| `/relatorios` | `Relatorios.tsx` | admin, lider | `useSDRStats`, `useCloserStats`, `useFunnelStats`, `useSDRRankings`, `useCloserRankings`, `useAllSDRsPerformance`, `useAllClosersPerformance` | Relatorios com exportacao CSV/Excel/PDF |
| `/admin` | `Admin.tsx` | admin, lider | `useUsers`, `useFunnels`, `useCRMColumns`, `useDistributionRules`, `useQualificationRules`, `useSDRCapacities`, `useCloserAvailability`, `useNiches`, `useActivityLogs`, `useCleanupLogs`, `useSheetSync` | Painel de configuracao |
| `/perfil` | `Profile.tsx` | Todos autenticados | `useAuth` | Perfil do usuario e troca de senha |
| `*` | `NotFound.tsx` | Publico | - | 404 |

---

## 2. Arvore de Providers (App.tsx)

```
QueryClientProvider (staleTime: 30s, retry: 2, retryDelay: exponencial)
  └─ ThemeProvider (next-themes, system detection)
      └─ AuthProvider (contexto de auth global)
          └─ TooltipProvider
              ├─ Sonner (toasts)
              └─ BrowserRouter
                  └─ ErrorBoundary (catch global de erros)
                      └─ Suspense (fallback: PageLoader spinner)
                          └─ Routes (code-split com React.lazy)
```

### Configuracao do React Query

```typescript
{
  staleTime: 30_000,           // 30s antes de refetch
  refetchOnWindowFocus: false, // Nao refetch ao focar janela
  retry: 2,                   // 2 retentativas
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000)  // Backoff exponencial
}
```

---

## 3. Hooks — Catalogo Completo

### 3.1 Autenticacao

#### `useAuth()` — `src/hooks/useAuth.tsx`
Context provider global de autenticacao.

**Retorna:**
| Campo | Tipo | Descricao |
|---|---|---|
| `user` | `User \| null` | Usuario Supabase Auth |
| `session` | `Session \| null` | Sessao JWT |
| `profile` | `Profile \| null` | Dados do perfil (nome, email, timezone) |
| `role` | `AppRole \| null` | Role do usuario |
| `loading` | `boolean` | Carregando estado inicial |
| `signIn(email, password)` | `Promise` | Login |
| `signUp(email, password, name, role?)` | `Promise` | Cadastro |
| `signOut()` | `Promise` | Logout |
| `isAdmin`, `isLider`, `isSDR`, `isCloser` | `boolean` | Verificacoes de role |
| `isAdminOrLider` | `boolean` | Admin ou lider |

**Otimizacao:** Busca profile + role em paralelo via `Promise.all`.

---

### 3.2 Leads

#### `useLeads(filters?)` — `src/hooks/useLeads.ts`
Lista leads com filtros e paginacao opcional.

**Parametros (LeadsFilters):**
| Campo | Tipo | Descricao |
|---|---|---|
| `search` | `string?` | Busca em nome, telefone, email |
| `classification` | `LeadClassification[]?` | Filtro por classificacao |
| `status` | `LeadStatus[]?` | Filtro por status |
| `funnelId` | `string?` | Filtro por funil |
| `assignedSdrId` | `string?` | Filtro por SDR |
| `page` | `number?` | Pagina (ativa paginacao) |
| `pageSize` | `number?` | Itens por pagina (default: 50) |

**Retorno:**
- Sem `page`: `Lead[]` (array simples, retrocompativel)
- Com `page`: `{ data: Lead[], count: number, page: number, pageSize: number }`

**Query Key:** `['leads', filters]`

**Tabelas acessadas:** `leads` + JOIN `funnels` + JOIN `profiles`

#### `useLead(id)` — Busca lead individual
#### `useUpdateLead()` — Mutation para atualizar lead
#### `useLeadsStats()` — Stats agregados (total, por classificacao, por status) com `.limit(5000)`

---

### 3.3 Appointments

#### `useAppointments(filters?)` — `src/hooks/useAppointments.ts`

**Parametros (AppointmentsFilters):**
| Campo | Tipo |
|---|---|
| `closerId` | `string?` |
| `closerIds` | `string[]?` |
| `sdrId` | `string?` |
| `status` | `AppointmentStatus[]?` |
| `startDate` | `string?` |
| `endDate` | `string?` |

**Query Key:** `['appointments', filters]`

**Tabelas acessadas:** `appointments` + JOIN `leads`, `profiles` (sdr), `profiles` (closer), `funnels`

#### Mutations de Appointment:
| Hook | Descricao | Side Effects |
|---|---|---|
| `useCreateAppointment()` | Cria agendamento | Atualiza lead status para `agendado`, sync Google Calendar |
| `useUpdateAppointment()` | Atualiza dados | - |
| `useRescheduleAppointment()` | Reagenda + incrementa counter | Sync Google Calendar |
| `useRegisterCallResult()` | Registra resultado da call | Atualiza lead status para `concluido` |
| `useReassignAppointment()` | Reatribui closer | Delete/Create Google Calendar events |
| `useAppointmentStats()` | Stats agregados | - |

---

### 3.4 CRM

#### `useCRMColumns()` — `src/hooks/useCRMColumns.ts`
**Query Key:** `['crm-columns']`
**Retorna:** `CrmColumn[]` ordenados por `position`

#### Mutations:
- `useCreateCRMColumn()`, `useUpdateCRMColumn()`, `useDeleteCRMColumn()`, `useReorderCRMColumns()`

#### `useMoveLeadColumn()` — `src/hooks/useMoveLeadColumn.ts`
Move lead entre colunas do Kanban com registro de atividade.

---

### 3.5 Relatorios e Analytics

#### `useSDRStats(sdrId?, dateRange)` — `src/hooks/useReportsStats.ts`
Metricas de SDR: leads atribuidos, em atendimento, agendados, conversoes, valor gerado, classificacao.
**Otimizacao:** Busca leads + appointments em paralelo com `Promise.all`.

#### `useCloserStats(closerId?, dateRange)` — Metricas de Closer
#### `useFunnelStats(dateRange)` — Metricas por funil (3 queries paralelas)
#### `useSDRRankings(dateRange)` — Rankings de SDRs (4 queries paralelas)
#### `useCloserRankings(dateRange)` — Rankings de Closers (3 queries paralelas)
#### `useAllSDRsPerformance(dateRange)` — Performance de todos os SDRs
#### `useAllClosersPerformance(dateRange)` — Performance de todos os Closers

#### Dashboard Stats — `src/hooks/useDashboardStats.ts`
- `useLeadsEvolution()` — Evolucao diaria (30 dias)
- `useConversionFunnel()` — Funil de conversao
- `usePerformanceByFunnel()` — Performance por funil

---

### 3.6 Usuarios e Configuracao

#### `useUsers()` — `src/hooks/useUsers.ts`
**Otimizacao:** Busca profiles + roles em paralelo com `Promise.all`.
**Query Key:** `['users']`

#### Mutations: `useUpdateProfile()`, `useUpdateUserRole()`, `useToggleUserActive()`
#### `useUsersByRole(role)` — Filtra por role

---

### 3.7 Regras e Distribuicao

#### `useDistributionRules()` — `src/hooks/useDistributionRules.ts`
CRUD de regras de distribuicao. Inclui `useExecuteDistribution()` que chama a Edge Function `distribute-leads`.

#### `useQualificationRules(funnelId?)` — `src/hooks/useQualificationRules.ts`
CRUD de regras de qualificacao automatica.

#### `useSDRCapacities()` — `src/hooks/useSDRCapacities.ts`
Limites de workload por SDR/funil.

---

### 3.8 Integracoes

#### `useSheetSync()` — `src/hooks/useSheetSync.ts`
- `useTestSheetConnection()` — Testa conexao com Google Sheets
- `useFetchSheetHeaders()` — Busca cabecalhos da planilha
- `useSyncFunnel()` / `useSyncAllFunnels()` — Importa leads
- `useSyncFunnelWithProgress()` — Import com progresso

#### `useCleanupLogs()` — `src/hooks/useCleanupLogs.ts`
- `useCleanupStats()` — Stats de limpeza
- `useEligibleLeadsForCleanup()` — Leads elegiveis
- `useExecuteCleanup()` — Executa limpeza (chama Edge Function)

#### `useNotifications()` — `src/hooks/useNotifications.ts`
Notificacoes realtime com subscription Supabase.
**Realtime Channel:** `notifications-{userId}`

---

## 4. Componentes — Organizacao

### 4.1 Layout

| Componente | Arquivo | Descricao |
|---|---|---|
| `AppLayout` | `layout/AppLayout.tsx` | Wrapper principal com Sidebar + Header |
| `AppSidebar` | `layout/AppSidebar.tsx` | Menu lateral com navegacao filtrada por role |
| `AppHeader` | `layout/AppHeader.tsx` | Barra superior com notificacoes, tema, menu usuario |

### 4.2 Shared

| Componente | Arquivo | Descricao |
|---|---|---|
| `ErrorBoundary` | `shared/ErrorBoundary.tsx` | Catch de erros React com UI de fallback e botao retry |
| `QueryErrorState` | `shared/QueryErrorState.tsx` | Estado de erro para queries com botao retry |
| `StatusBadge` | `shared/StatusBadge.tsx` | Badges: `ClassificationBadge`, `LeadStatusBadge`, `RoleBadge`, `AppointmentStatusBadge` |
| `StatsCard` | `shared/StatsCard.tsx` | Card de KPI com icone e descricao |
| `EmptyState` | `shared/EmptyState.tsx` | Estado vazio com icone e mensagem |
| `ConfirmDialog` | `shared/ConfirmDialog.tsx` | Modal de confirmacao |
| `ThemeToggle` | `shared/ThemeToggle.tsx` | Toggle dark/light mode |

### 4.3 Auth

| Componente | Descricao |
|---|---|
| `ProtectedRoute` | Guard de rota com `allowedRoles`. Redireciona para `/auth` se nao autenticado |

### 4.4 CRM (Kanban)

| Componente | Descricao |
|---|---|
| `KanbanBoard` | Container principal do board (@dnd-kit) |
| `KanbanColumn` | Coluna com droppable zone |
| `KanbanCard` | Card de lead arrastavel |
| `KanbanScheduledCard` | Variante para leads agendados |
| `ScheduleAppointmentModal` | Modal para criar agendamento |

### 4.5 Reports

| Componente | Descricao |
|---|---|
| `ReportFilters` | Seletor de date range e usuario |
| `ExportButtons` | Botoes CSV, Excel, PDF |
| `SDRMetricsCards` / `CloserMetricsCards` / `FunnelMetricsCards` | Cards de metricas |
| `SDRPerformanceChart` / `CloserPerformanceChart` / `FunnelComparisonChart` | Graficos (Recharts) |
| `ClassificationPieChart` | Pie chart de classificacao |
| `RankingTable` | Tabela de top performers |
| `ReportPDFDocument` | Documento React-PDF para exportacao |

### 4.6 Admin

| Componente | Descricao |
|---|---|
| `UserFormModal` | CRUD de usuarios (chama Edge Function) |
| `FunnelFormModal` | CRUD de funis com config Google Sheets |
| `CRMColumnFormModal` | CRUD de colunas Kanban |
| `DistributionRulesTab` | Regras de distribuicao |
| `QualificationRulesTab` | Regras de qualificacao com condition builder |
| `SDRCapacityConfig` / `SDRCapacityFormModal` | Limites de workload |
| `CloserAvailabilityTab` | Horarios do closer |
| `NichesTab` | Gerenciamento de nichos |
| `ActivityLogsTab` | Visualizador de audit trail |
| `CleanupConfigTab` | Config e execucao de limpeza |
| `SyncStatusPanel` | Status de sync Google Sheets |
| `ManualDistributionModal` | Distribuicao manual |
| `SheetColumnMapper` | Mapeamento de colunas da planilha |

---

## 5. Types — Tipos do Dominio

**Arquivo:** `src/types/database.ts`

### 5.1 Enums

```typescript
type AppRole = 'admin' | 'lider' | 'sdr' | 'closer';
type LeadClassification = 'diamante' | 'ouro' | 'prata' | 'bronze';
type LeadStatus = 'novo' | 'em_atendimento' | 'agendado' | 'concluido';
type AppointmentStatus = 'agendado' | 'reagendado' | 'realizado' | 'nao_compareceu';
```

### 5.2 Interfaces Principais

| Interface | Campos-chave |
|---|---|
| `Profile` | user_id, name, email, timezone, active |
| `Lead` | full_name, phone, email, revenue, niche, classification, status, assigned_sdr_id, funnel_id, crm_column_id, custom_fields |
| `Appointment` | lead_id, sdr_id, closer_id, scheduled_date, duration, status, converted, conversion_value |
| `Funnel` | name, google_sheet_url, column_mapping, auto_sync_enabled |
| `QualificationRule` | conditions (JSON: field, operator, value, logic), classification, priority |
| `DistributionRule` | sdr_ids, funnel_id, classifications, max_leads_per_sdr, distribution_mode |
| `CrmColumn` | name, position, color, editable |

### 5.3 Tipos Compostos

```typescript
LeadWithRelations = Lead + { funnel?, assigned_sdr? }
AppointmentWithRelations = Appointment + { lead?, sdr?, closer?, funnel? }
ProfileWithRole = Profile + { role? }
```

---

## 6. Utilitarios (src/lib/)

| Arquivo | Exports | Descricao |
|---|---|---|
| `constants.ts` | `CLASSIFICATION_COLORS`, `STATUS_COLORS`, `STATUS_LABELS`, `ROLE_LABELS`, `BRAZILIAN_STATES`, `REVENUE_RANGES` | Constantes da UI |
| `exportUtils.ts` | `exportToCSV()`, `exportToExcel()`, `exportSDRData()`, `exportCloserData()`, `exportFunnelData()` | Exportacao de relatorios |
| `pdfExportUtils.ts` | `exportSDRToPDF()`, `exportCloserToPDF()`, `exportFunnelToPDF()` | Exportacao PDF (lazy-loaded) |
| `googleCalendarSync.ts` | `syncGoogleCalendar()`, `buildEventData()` | Sync com Google Calendar via Edge Function |
| `utils.ts` | `cn()` | Merge de classes Tailwind (clsx + tailwind-merge) |

---

## 7. Build e Otimizacoes

### 7.1 Vite Config

```typescript
build: {
  sourcemap: false,
  chunkSizeWarningLimit: 1000,
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-query': ['@tanstack/react-query'],
        'vendor-charts': ['recharts', ...d3],
        'vendor-export': ['@react-pdf/renderer', 'xlsx']
      }
    }
  }
}
```

### 7.2 Code Splitting

- **React.lazy()** em todas as 8 paginas protegidas
- **Dynamic import()** para PDF export (pdfExportUtils carregado sob demanda)
- **manualChunks** para bibliotecas grandes (React Query, Recharts, PDF/Excel)

### 7.3 Performance

- **Promise.all** em `useAuth`, `useUsers`, `useSDRStats` (queries paralelas)
- **Paginacao server-side** em `useLeads` (50 itens/pagina com `count: 'exact'`)
- **`.limit(5000)`** em `useLeadsStats` (safety net)
- **staleTime: 30s** evita refetch desnecessario entre navegacoes

---

## 8. Dependencias

### Producao

| Pacote | Versao | Funcao |
|---|---|---|
| `react` / `react-dom` | 18.x | Framework UI |
| `react-router-dom` | 6.x | Roteamento SPA |
| `@tanstack/react-query` | 5.x | Estado async / cache |
| `@supabase/supabase-js` | 2.90.1 | Cliente Supabase |
| `@radix-ui/*` | - | Primitivos de UI (17 pacotes) |
| `recharts` | - | Graficos |
| `@react-pdf/renderer` | - | Geracao de PDF |
| `xlsx` | - | Exportacao Excel |
| `@dnd-kit/*` | - | Drag-and-drop (Kanban) |
| `react-hook-form` + `zod` | - | Formularios + validacao |
| `date-fns` | - | Manipulacao de datas |
| `lucide-react` | - | Icones |
| `sonner` | - | Toast notifications |
| `next-themes` | - | Dark/Light mode |

### Desenvolvimento

| Pacote | Funcao |
|---|---|
| `vite` + `@vitejs/plugin-react-swc` | Build tool |
| `vitest` + `@testing-library/react` | Testes |
| `typescript` | Type checking |
| `eslint` + `typescript-eslint` | Linting |
| `tailwindcss` + `postcss` + `autoprefixer` | Estilizacao |
