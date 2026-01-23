
# Plano: Adicionar Painel de Sincronização à Página Admin

## Objetivo
Integrar o componente `SyncStatusPanel` à página Admin para que os botões de sincronização de leads do Google Sheets fiquem visíveis e acessíveis.

## Mudanças Necessárias

### Arquivo: `src/pages/Admin.tsx`

**1. Adicionar import do componente:**
```typescript
import { SyncStatusPanel } from '@/components/admin/SyncStatusPanel';
```

**2. Adicionar o SyncStatusPanel na aba "Funis":**
O painel será adicionado logo após a tabela de funis, dentro do `TabsContent` de "funnels". Isso mantém a sincronização contextualizada com os funis configurados.

### Estrutura Final da Aba Funis

```text
┌─────────────────────────────────────────────┐
│ [+ Novo Funil]                              │
├─────────────────────────────────────────────┤
│ Tabela de Funis                             │
│ - Nome | Google Sheets | Status | Ações     │
├─────────────────────────────────────────────┤
│ Sincronização de Leads (SyncStatusPanel)    │
│ - Botão "Sincronizar Todos"                 │
│ - Barra de progresso (quando ativo)         │
│ - Tabela com status de cada funil           │
└─────────────────────────────────────────────┘
```

## Funcionalidades Disponíveis Após Integração

1. **Botão "Sincronizar Todos"** - Importa leads de todas as planilhas configuradas
2. **Botão individual por funil** - Ícone ↻ para sincronizar um funil específico
3. **Barra de progresso** - Mostra o andamento da importação em tempo real
4. **Contadores** - Exibe quantidade de leads importados vs. duplicados pulados
5. **Status por funil** - Indica se está configurado, manual ou automático

## Detalhes Técnicos

- **Linhas afetadas:** ~202-265 em `Admin.tsx`
- **Sem dependências adicionais** - O componente já está pronto
- **Sem alterações no banco de dados**
