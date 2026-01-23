
# Plano: Corrigir Importação de Leads do Google Sheets

## Diagnóstico

A importação de leads não está funcionando por um **problema de performance e timeout**:

- A autenticação com Google está correta
- A planilha está sendo acessada com sucesso
- **O problema:** A planilha tem **48.107 linhas** e a função está fazendo uma query individual de verificação de duplicação para cada linha
- Isso causa **timeout** da Edge Function (limite de ~25 segundos)

## Solução Técnica

### 1. Otimizar a Verificação de Duplicatas

**Problema atual (linha por linha):**
```text
Para cada linha da planilha:
  → 1 query para verificar duplicata por sheet_row_id
  → 1 query para verificar duplicata por email/phone
  = ~96.000 queries para 48.000 linhas
```

**Solução proposta (em lote):**
```text
1 query para buscar todos os sheet_row_ids existentes
1 query para buscar todos os emails existentes
1 query para buscar todos os phones existentes
= 3 queries total
```

### 2. Implementar Paginação da Planilha

Para planilhas grandes, processar em lotes de 1000-2000 linhas por execução.

### 3. Alterações no Código

**Arquivo:** `supabase/functions/import-leads-sheet/index.ts`

**Mudanças principais:**

1. **Pré-carregar todas as duplicatas em memória:**
   - Buscar todos os `sheet_row_id` do funil de uma vez
   - Buscar todos os `email` do funil de uma vez
   - Buscar todos os `phone` do funil de uma vez

2. **Usar Sets para verificação O(1):**
   - Verificar duplicatas usando JavaScript Sets (instantâneo) ao invés de queries SQL

3. **Limitar quantidade por execução:**
   - Processar no máximo 2000 linhas por chamada
   - Permitir parâmetro `startRow` para continuar de onde parou
   - Retornar `hasMore: true` quando houver mais linhas

4. **Exemplo do novo fluxo:**
```text
Fetch planilha (linhas 2-2001)
Buscar existentes: sheet_row_ids, emails, phones (3 queries)
Loop 2000 linhas verificando em memória
Insert em lotes de 100 (20 queries)
Retornar { imported: X, hasMore: true, nextRow: 2002 }
```

### 4. Atualizar Frontend

**Arquivo:** `src/hooks/useSheetSync.ts`

Adicionar lógica para chamadas repetidas quando `hasMore: true`, com feedback de progresso.

**Arquivo:** `src/components/admin/SyncStatusPanel.tsx`

Mostrar barra de progresso durante sincronizações longas.

## Benefícios

- Reduz de ~96.000 queries para ~25 queries
- Completa em menos de 10 segundos (vs timeout atual)
- Suporta planilhas de qualquer tamanho
- Feedback visual do progresso

## Sequência de Implementação

1. Modificar Edge Function com otimizações
2. Adicionar suporte a paginação
3. Atualizar hook `useSheetSync` para chamadas em loop
4. Atualizar UI com indicador de progresso
5. Testar com o funil "teste dos arquetipos"
