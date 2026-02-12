
# Plano: Adicionar campo "Data de Preenchimento" ao Lead

## Problema

Atualmente o lead possui apenas `created_at` (data de criacao no sistema) e `imported_at` (data da importacao). Falta o dado mais importante para o negocio: **quando a pessoa preencheu o formulario**, que e a data registrada na planilha do Google Sheets.

## Solucao

Adicionar um campo `form_filled_at` (TIMESTAMPTZ) na tabela `leads`, preenche-lo automaticamente durante a importacao usando o valor da coluna de data mapeada, e exibi-lo na interface.

### Parte 1: Migracao do banco de dados

Adicionar coluna `form_filled_at` (TIMESTAMP WITH TIME ZONE, nullable) na tabela `leads`.

### Parte 2: Edge Function (`import-leads-sheet`)

Na funcao `mapRowToLead`, apos ja ter o mapeamento de `date_column`:
- Ler o valor da coluna de data da planilha
- Usar a funcao `parseLeadDate` ja existente para converter o valor
- Salvar o resultado em `form_filled_at` no objeto do lead

Isso reutiliza toda a logica de parsing de datas (DD/MM/YYYY, ISO, serial do Google) que ja foi implementada.

### Parte 3: Atualizar tipos TypeScript

Adicionar `form_filled_at` ao tipo `Lead` em `src/types/database.ts`. O arquivo `src/integrations/supabase/types.ts` sera atualizado automaticamente apos a migracao.

### Parte 4: Exibir na interface

- **Tabela de Leads** (`src/pages/Leads.tsx`): Adicionar coluna "Data Formulario" mostrando a data formatada
- **Detalhes do Lead** (`src/components/leads/LeadDetailsSheet.tsx`): Mostrar "Data de Preenchimento" na secao de informacoes

## Detalhes Tecnicos

Alteracao principal na Edge Function (dentro de `mapRowToLead`):

```text
// Apos o mapeamento existente, adicionar:
const dateColumnName = mapping.date_column;
const dateValue = getColumnValue(dateColumnName);
const parsedDate = dateValue ? parseLeadDate(dateValue) : null;

return {
  ...campos_existentes,
  form_filled_at: parsedDate ? parsedDate.toISOString() : null,
};
```

## Arquivos Alterados

1. **Nova migracao SQL** - Adicionar coluna `form_filled_at` na tabela `leads`
2. **`supabase/functions/import-leads-sheet/index.ts`** - Preencher `form_filled_at` no `mapRowToLead`
3. **`src/types/database.ts`** - Adicionar campo ao tipo `Lead`
4. **`src/pages/Leads.tsx`** - Adicionar coluna na tabela
5. **`src/components/leads/LeadDetailsSheet.tsx`** - Exibir data nos detalhes

## Resultado Esperado

- Leads importados terao a data original do formulario preservada
- A interface mostrara tanto "Data Formulario" (quando preencheu) quanto "Criado em" (quando entrou no sistema)
- Leads ja existentes terao `form_filled_at = null` (podem ser reimportados futuramente se necessario)
