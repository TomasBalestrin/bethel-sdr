# Análise Comparativa: PRD vs Sistema Atual — Bethel SDR

> Gerado em: 2026-03-12
> Versão do sistema: 3.0 (com multi-tenancy)

## 1. Banco de Dados — Tabelas & Schemas

| Entidade | PRD | Sistema Atual | Status |
|---|---|---|---|
| `leads` | 15 colunas base | 30 colunas (muito mais completo) | **Excede PRD** |
| `funnels` | `name`, `google_sheet_url`, `sheet_name`, `column_mapping`, `is_active`, `category` | Tem tudo exceto `category` e usa `active` em vez de `is_active` | **Parcial** |
| `crm_columns` (PRD: `funnel_columns`) | `funnel_id`, `name`, `position`, `color` | Sem `funnel_id` (colunas são globais), tem `editable` extra | **Diferente** |
| `appointments` | 12 colunas | 18 colunas (mais completo) | **Excede PRD** |
| `sdrs` | Tabela dedicada com `tipo` (SDR/Social Selling), `team_id` | **Não existe** — usa `profiles` + `user_roles` | **Faltante** |
| `sdr_metrics` | Tabela dedicada com `conversions`, `avg_response_time`, `nps` | **Não existe** — métricas calculadas via queries | **Faltante** |
| `goals` | Tabela com `target_value`, `current_value`, `period` | **Não existe** | **Faltante** |
| `profiles` | Não mencionado explicitamente | Existe com `name`, `email`, `timezone`, `active`, `organization_id` | **Extra** |
| `qualification_rules` | Não mencionado | Existe com condition builder (JSON rules) | **Extra** |
| `distribution_rules` | Não mencionado | Existe com prioridade e condições | **Extra** |
| `closer_availability` | Não mencionado | Existe com `day_of_week`, `start_time`, `end_time` | **Extra** |
| `niches` | Não mencionado | Existe | **Extra** |
| `sdr_capacities` | Não mencionado | Existe com `max_leads`, `percentage` por funil | **Extra** |
| `cleanup_logs` | Não mencionado | Existe (backup de leads para Google Sheets) | **Extra** |
| `organizations` | Não mencionado | Existe (multi-tenancy) | **Extra** |
| `webhook_subscriptions` | Não mencionado | Existe | **Extra** |
| `api_keys` | Não mencionado | Existe | **Extra** |

## 2. Enums

| Enum | PRD | Sistema Atual | Status |
|---|---|---|---|
| `app_role` | `admin`, `lider`, `sdr`, `closer` | Idêntico | **OK** |
| `lead_classification` | `diamante`, `ouro`, `prata`, `bronze` | Idêntico | **OK** |
| `lead_status` | `novo`, `em_atendimento`, `agendado`, `concluido` | Idêntico | **OK** |
| `appointment_status` | `agendado`, `reagendado`, `realizado`, `nao_compareceu`, **`cancelado`** | Falta `cancelado` | **Parcial** |
| `sdr_tipo` | `sdr`, `social_selling` | **Não existe** | **Faltante** |

## 3. Frontend — Arquitetura

| Aspecto | PRD | Sistema Atual | Status |
|---|---|---|---|
| Entry point | `module.tsx` como micro-frontend | `App.tsx` padrão React SPA | **Diferente** |
| Roteamento | `?module=X` via `useSearchParams` | React Router v6 com rotas | **Diferente** |
| Drag & Drop | HTML5 nativo | `@dnd-kit` (core + sortable) | **Diferente (melhor)** |
| Bottom Navigation | `BottomNavigation` (mobile) | `AppSidebar` (desktop sidebar) | **Diferente** |
| Pull to Refresh | `PullToRefresh` component | Não existe | **Faltante** |
| Tema | Não mencionado | `next-themes` (dark/light/system) | **Extra** |

## 4. Componentes — PRD vs Implementação

| Componente PRD | Existe? | Equivalente Atual |
|---|---|---|
| `SDRMetricsDialog` | **Não** | `SDRMetricsCards` + `SDRPerformanceChart` |
| `SDRWeeklyComparisonChart` | **Não** | `SDRPerformanceChart` (sem comparação semanal) |
| `MonthSelector` | **Não** | Filtros embutidos no `ReportFilters` |
| `WeekSelector` | **Não** | Filtros embutidos no `ReportFilters` |
| `GoalProgress` | **Não** | Não existe (sem tabela `goals`) |
| `PullToRefresh` | **Não** | Não existe |
| `BottomNavigation` | **Não** | `AppSidebar` (navigation lateral) |
| `KanbanBoard` | **Sim** | `src/components/crm/KanbanBoard.tsx` |
| `KanbanCard` | **Sim** | `src/components/crm/KanbanCard.tsx` |
| `KanbanColumn` | **Sim** | `src/components/crm/KanbanColumn.tsx` |
| `ScheduleAppointmentModal` | **Sim** | `src/components/crm/ScheduleAppointmentModal.tsx` |
| `LeadDetailsSheet` | **Sim** | `src/components/leads/LeadDetailsSheet.tsx` |

## 5. Páginas

| Página PRD | Existe? | Notas |
|---|---|---|
| Dashboard | **Sim** | Mais completo que PRD (3 gráficos) |
| Leads | **Sim** | Tabela paginada + filtros + detalhes |
| CRM (Kanban) | **Sim** | @dnd-kit em vez de HTML5 |
| Calendário | **Sim** | Grid semanal, mensal e list view |
| Relatórios | **Sim** | SDR, Closer, Funil, Classificação, Ranking |
| Admin | **Sim** | Muitas tabs extras |
| Perfil | **Sim** (extra) | Não mencionado no PRD |
| Gestão Leads (Leader) | **Sim** (extra) | Dashboard específico para líderes |

## 6. Hooks

| Hook PRD | Existe? | Equivalente |
|---|---|---|
| `useLeads` | **Sim** | Com paginação, filtros, stats |
| `useFunnels` | **Sim** | CRUD completo |
| `useAppointments` | **Sim** | 416 linhas, CRUD + reschedule |
| `useCRMColumns` | **Sim** | Query + mutations |
| `useGoals` | **Não** | Não implementado |
| `useSDRMetrics` | **Não** | Métricas via `useReportsStats` |

**Hooks extras (não no PRD):** `useDistributionRules`, `useQualificationRules`, `useCleanupLogs`, `useCloserAvailability`, `useSheetSync`, `useSDRCapacities`, `useNiches`, `useActivityLogs`, `useLeaderDashboard`, `useImportLeads`, `useMoveLeadColumn`, `useNotifications`

## 7. Edge Functions (Backend)

| Função PRD | Existe? | Notas |
|---|---|---|
| Importação de leads | **Sim** | `import-leads-sheet` |
| Distribuição de leads | **Sim** | `distribute-leads` |
| Criação de usuários | **Sim** | `admin-create-user` |
| Sync calendário | **Sim** | `sync-google-calendar` |
| Cleanup/limpeza | **Sim** (extra) | `cleanup-leads` |
| Webhook dispatcher | **Sim** (extra) | `webhook-dispatcher` |

## 8. Funcionalidades — Resumo

### Implementado e conforme o PRD
- Sistema de leads com classificação (diamante/ouro/prata/bronze)
- CRM Kanban com colunas arrastáveis
- Agendamento de reuniões com closers
- Calendário com múltiplas visualizações
- Dashboard com métricas
- Relatórios por SDR, Closer e Funil
- Sistema de roles (admin/lider/sdr/closer)
- Importação de Google Sheets
- Distribuição automática de leads
- Notificações realtime

### Previsto no PRD mas NÃO implementado
1. Tabela `sdrs` dedicada (usa profiles+user_roles)
2. Tipo SDR/Social Selling
3. Tabela `goals` e GoalProgress
4. Tabela `sdr_metrics` materializada
5. `SDRWeeklyComparisonChart`
6. `appointment_status = 'cancelado'`
7. `funnels.category`
8. `PullToRefresh` (mobile)
9. `BottomNavigation` (mobile)
10. `module.tsx` micro-frontend entry

### Implementado ALÉM do PRD
1. Multi-tenancy completo (organizations, RLS por org)
2. Webhook system (subscriptions + dispatcher + HMAC-SHA256)
3. API Keys (service-to-service auth)
4. Distribution Rules (regras configuráveis)
5. Qualification Rules (condition builder JSON)
6. Cleanup system (backup para Google Sheets)
7. Closer Availability (gestão de horários)
8. SDR Capacities (capacidade por funil)
9. Nichos (gerenciamento)
10. Activity Logs
11. PDF/Excel Export
12. Dark Mode
13. Error Boundary
14. Leader Dashboard dedicado
15. CSV Import

## 9. Diferenças Arquiteturais Críticas

| Aspecto | PRD | Sistema Atual | Impacto |
|---|---|---|---|
| Entidade SDR | Tabela dedicada `sdrs` | `profiles` + `user_roles` | **Médio** |
| Métricas SDR | Tabela materializada | Calculadas em tempo real | **Baixo** |
| Metas | Tabela `goals` | Inexistente | **Alto** |
| CRM columns | Vinculadas a funil | Globais | **Médio** |
| Micro-frontend | `module.tsx` + `?module=X` | SPA com React Router | **Baixo** |
| DnD | HTML5 nativo | @dnd-kit | **Nenhum** (atual é melhor) |

## 10. Recomendações

### Prioridade Alta
1. Criar tabela `goals` e componente `GoalProgress`
2. Adicionar `cancelado` ao enum `appointment_status`
3. Adicionar `category` em `funnels`

### Prioridade Média
4. Avaliar `sdr_metrics` como tabela materializada
5. Vincular `crm_columns` a `funnel_id`

### Prioridade Baixa (sistema atual é melhor)
6. **NÃO** migrar de @dnd-kit para HTML5
7. **NÃO** migrar para `?module=X`
8. `PullToRefresh` e `BottomNavigation` são nice-to-have

## Conclusão

O sistema atual implementa **~80% do PRD** e adiciona **15+ features extras** não previstas. As lacunas principais são: tabela de metas (`goals`), tipo SDR/Social Selling, e status `cancelado`. A arquitetura atual é mais robusta que a proposta no PRD em vários aspectos.
