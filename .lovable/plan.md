

# Plano: Implementar Qualificação Automática de Leads

## Problema Atual

- Linha 433 de `import-leads-sheet/index.ts`: todo lead importado recebe `classification: 'bronze'` fixo
- A tabela `qualification_rules` está vazia (nenhuma regra cadastrada)
- Mesmo que houvesse regras, nao existe codigo que as aplique -- a UI existe, mas a logica de execucao nao

## Solucao em 3 Partes

### Parte 1: Criar funcao no banco de dados para aplicar regras

Criar uma funcao PostgreSQL `apply_qualification_rules` que:
- Recebe um lead_id (ou roda para todos os leads sem qualificacao)
- Busca as regras ativas ordenadas por prioridade
- Avalia as condicoes de cada regra contra os dados do lead
- Atualiza `classification` e `qualification` do lead com a primeira regra que corresponder
- Se nenhuma regra corresponder, mantem `bronze` como padrao

### Parte 2: Criar trigger automatico

Criar um trigger `after insert` na tabela `leads` que executa a funcao de qualificacao automaticamente para cada lead inserido. Assim, qualquer lead (importado via planilha, CSV ou criado manualmente) sera qualificado.

### Parte 3: Alterar a Edge Function de importacao

Em `supabase/functions/import-leads-sheet/index.ts`:
- Mudar `classification: 'bronze'` para `classification: null` (linha 433)
- A qualificacao sera feita automaticamente pelo trigger apos a insercao

## Detalhes Tecnicos da Funcao de Qualificacao

A funcao PostgreSQL avaliara as condicoes das regras:

```text
Para cada regra (ordenada por prioridade):
  Para cada condicao na regra:
    - equals: campo = valor
    - not_equals: campo != valor
    - greater_than: campo::numeric > valor::numeric
    - less_than: campo::numeric < valor::numeric
    - contains: campo ILIKE '%valor%'
    - not_contains: campo NOT ILIKE '%valor%'
  Se todas as condicoes (AND) ou alguma (OR) corresponder:
    - Atualizar classification e qualification do lead
    - Parar (primeira regra vence)
  Se nenhuma regra corresponder:
    - Classificar como 'bronze' (padrao)
```

Campos avaliados: `revenue`, `niche`, `state`, `business_position`, `has_partner`, `main_pain`, `difficulty`, e campos customizados.

## Impacto

- Leads importados serao classificados automaticamente com base nas regras cadastradas
- O admin pode criar regras na aba "Qualificacao" do painel Admin (UI ja existe)
- Leads existentes podem ser reclassificados rodando a funcao manualmente
- Se nenhuma regra estiver cadastrada, o comportamento padrao continua sendo `bronze`

## Arquivos Alterados

1. **Nova migracao SQL**: Criar funcao `apply_qualification_rules` + trigger
2. **`supabase/functions/import-leads-sheet/index.ts`**: Mudar classification padrao de `'bronze'` para `null`

