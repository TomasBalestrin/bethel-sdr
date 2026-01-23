
# Plano: Corrigir Importação de Leads - Normalização do Campo business_position

## Diagnóstico

A sincronização do Google Sheets está funcionando tecnicamente, mas **nenhum lead está sendo salvo** porque:

- O banco de dados tem uma constraint `leads_business_position_check` que só aceita: `'dono'` ou `'nao_dono'`
- A planilha contém valores como "Dono", "Não Dono", "DONO", "Sou o dono", etc.
- Todos os lotes estão falhando com o erro: `violates check constraint "leads_business_position_check"`

## Solução

Normalizar o valor de `business_position` antes de inserir no banco de dados, convertendo qualquer variação para os valores aceitos.

## Alterações Necessárias

### Arquivo: `supabase/functions/import-leads-sheet/index.ts`

**1. Criar função de normalização:**

```typescript
function normalizeBusinessPosition(value: string | undefined): string | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  
  // Variações de "dono"
  if (lower.includes('dono') && !lower.includes('não') && !lower.includes('nao')) {
    return 'dono';
  }
  
  // Variações de "não dono"
  if (lower.includes('não dono') || lower.includes('nao dono') || 
      lower === 'não' || lower === 'nao' || lower === 'n') {
    return 'nao_dono';
  }
  
  // Respostas afirmativas = dono
  if (['sim', 'yes', 's', 'true', '1'].includes(lower)) {
    return 'dono';
  }
  
  // Se não identificar, retorna null (evita o erro)
  return null;
}
```

**2. Usar a função no mapeamento (linha ~399):**

Alterar de:
```typescript
business_position: getColumnValue(mapping.business_position) || null,
```

Para:
```typescript
business_position: normalizeBusinessPosition(getColumnValue(mapping.business_position)),
```

## Resultado Esperado

- Valores como "Dono", "DONO", "Sou o dono" → `'dono'`
- Valores como "Não Dono", "NAO DONO", "Não" → `'nao_dono'`
- Valores não identificáveis → `null` (aceito pelo banco)

## Impacto

- Os ~48.000 leads da planilha serão importados corretamente
- Leads aparecerão na página **Leads** e no **CRM**
- Sem necessidade de alterar o banco de dados
