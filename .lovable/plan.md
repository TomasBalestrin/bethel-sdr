

# Plano: Modo de Atualização para Preencher Data de Formulário em Leads Existentes

## Problema

Os 3.330 leads já importados no sistema não possuem o campo `form_filled_at` preenchido, pois foram importados antes dessa funcionalidade existir. A importação atual pula leads duplicados, então rodar uma nova sincronização não resolve.

## Solução

Adicionar um modo "update" na Edge Function de importação que, em vez de pular leads já existentes, atualiza o campo `form_filled_at` com a data da planilha.

### Parte 1: Edge Function - Novo modo "update"

Na função `import-leads-sheet/index.ts`, adicionar suporte a um parâmetro `action: 'update-dates'`:

```text
Fluxo do modo update-dates:

Para cada linha da planilha:
  1. Identificar o lead existente pelo sheet_row_id
  2. Se encontrado E form_filled_at está vazio:
     - Ler a coluna de data mapeada
     - Fazer parsing da data
     - UPDATE no lead com o form_filled_at
     - Contabilizar como "atualizado"
  3. Se não encontrado -> pular
```

- Reutiliza a mesma lógica de paginação (2.000 linhas por batch)
- Reutiliza a função `parseLeadDate` já existente
- Não altera nenhum outro campo do lead, apenas `form_filled_at`

### Parte 2: Frontend - Botão de atualização

No painel de sincronização do Admin (`SyncStatusPanel.tsx` ou na página de funis):
- Adicionar um botão "Atualizar Datas" que dispara o modo `update-dates`
- Mostrar progresso da atualização (similar ao sync normal)
- Após concluído, invalidar cache dos leads

### Parte 3: Hook para atualização

Criar a lógica no hook `useSheetSync.ts` para chamar a Edge Function com `action: 'update-dates'`, reutilizando a mesma estrutura de progresso.

## Detalhes Técnicos

**Nova action na Edge Function:**

```text
// Recebe: { funnelId, action: 'update-dates', startRow }
// Para cada linha do batch:
//   1. Montar sheet_row_id = funnelId_row_N
//   2. Buscar lead existente com esse sheet_row_id
//   3. Ler coluna de data da planilha + parseLeadDate
//   4. UPDATE leads SET form_filled_at = parsedDate WHERE sheet_row_id = sheetRowId AND form_filled_at IS NULL
// Retorna: { success, totalUpdated, hasMore, nextRow }
```

**Otimização:** Em vez de fazer um UPDATE por lead, acumular os updates em um batch e executar com upsert ou múltiplos updates agrupados.

## Arquivos Alterados

1. **`supabase/functions/import-leads-sheet/index.ts`** - Adicionar handler para `action: 'update-dates'`
2. **`src/hooks/useSheetSync.ts`** - Adicionar hook/função para disparar atualização
3. **`src/components/admin/SyncStatusPanel.tsx`** - Adicionar botão "Atualizar Datas dos Formulários"

## Resultado Esperado

- Ao clicar em "Atualizar Datas", o sistema percorre a planilha e preenche `form_filled_at` nos leads existentes
- Apenas leads com `form_filled_at = NULL` são atualizados (não sobrescreve dados já preenchidos)
- O processo usa a mesma paginação segura de 2.000 linhas por batch
- Após a atualização, a coluna "Data Formulário" na tabela de leads mostrará as datas corretas
