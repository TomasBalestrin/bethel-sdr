

# Plano: Filtro de Data na Importacao de Leads

## Problema

As planilhas do Google Sheets contam **22.000+ linhas** com leads historicos. Importar todos gera volume desnecessario. Ambas as planilhas possuem uma coluna de data na primeira posicao:
- **"teste dos arquetipos"**: coluna "Date"
- **"50 Scripts"**: coluna "Data"

Porem, essa coluna nao esta mapeada e nao existe filtro de data no processo de importacao.

## Solucao

Adicionar um campo `date_column` ao mapeamento de colunas e um campo `import_from_date` na tabela de funis, para filtrar leads por data durante a importacao.

### Parte 1: Alterar a tabela `funnels`

Adicionar coluna `import_from_date` (tipo DATE) na tabela `funnels`:
- Valor padrao: `2026-01-01` (inicio deste ano)
- Permite ao admin definir a data minima de importacao por funil

### Parte 2: Adicionar `date_column` ao mapeamento

Adicionar o campo `date_column` na interface `ColumnMapping` da Edge Function. Esse campo indica qual coluna da planilha contem a data do lead.

### Parte 3: Filtrar linhas na Edge Function

Na funcao `import-leads-sheet/index.ts`, no loop de processamento de linhas (linha ~654):
- Ler o valor da coluna de data mapeada
- Fazer parsing da data (suportando formatos comuns: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY)
- Comparar com `import_from_date` do funil
- Pular (skip) linhas com data anterior ao filtro

### Parte 4: Atualizar a UI do Funil (FunnelFormModal)

No formulario de configuracao de funil:
- Adicionar campo "Coluna de Data" no mapeamento de colunas
- Adicionar campo "Importar a partir de" com date picker (padrao: 01/01/2026)

## Detalhes Tecnicos

```text
Fluxo de importacao atualizado:

Para cada linha da planilha:
  1. Verificar duplicata (sheet_row_id, email, phone) -> skip
  2. [NOVO] Ler coluna de data mapeada
  3. [NOVO] Se data < import_from_date -> skip (contabilizar como filtrado)
  4. Mapear campos e inserir lead
```

Formatos de data suportados no parsing:
- `DD/MM/YYYY` (formato BR, mais comum)
- `YYYY-MM-DD` (formato ISO)
- `MM/DD/YYYY` (formato US)
- Timestamps do Google Sheets (numero serial)

## Arquivos Alterados

1. **Nova migracao SQL**: Adicionar coluna `import_from_date` na tabela `funnels`
2. **`supabase/functions/import-leads-sheet/index.ts`**: Adicionar `date_column` ao ColumnMapping, logica de filtro por data
3. **`src/components/admin/FunnelFormModal.tsx`**: Adicionar campos de coluna de data e data minima
4. **`src/components/admin/SheetColumnMapper.tsx`**: Adicionar mapeamento da coluna de data

## Resultado Esperado

- Ao sincronizar o funil "50 Scripts" (22.874 linhas), somente os leads de 2026 serao importados
- Reducao significativa no volume de dados (estimativa: ~2.000-5.000 leads relevantes vs 22.000+ total)
- O admin pode ajustar a data de corte por funil conforme necessidade
