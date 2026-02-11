
# Plano: Redirecionar Clique no Telefone para WhatsApp

## Objetivo
Ao clicar no número de telefone de um lead em qualquer lugar do sistema, abrir o WhatsApp Web para iniciar conversa diretamente.

## Locais a Alterar

### 1. `src/pages/Leads.tsx` (Tabela de Leads) - Linha ~190
- Transformar o texto do telefone em um link clicável para WhatsApp
- Adicionar `stopPropagation` para não abrir o painel de detalhes ao clicar no telefone

### 2. `src/components/crm/KanbanCard.tsx` (Card do Kanban) - Linhas 86-91
- Transformar o telefone exibido em link clicável para WhatsApp
- Adicionar `stopPropagation` para não interferir no drag-and-drop

### 3. `src/components/leader/LeadCard.tsx` (Card do Líder) - Linhas 107-117
- Transformar o telefone dentro do Tooltip em link clicável para WhatsApp

### 4. `src/components/calendar/ScheduledLeadCard.tsx` (Detalhe do Lead) - Linhas 215-219
- Transformar o telefone na seção de detalhes em link clicável

### 5. `src/components/leads/LeadDetailsSheet.tsx` - Já está OK
- Este componente já redireciona para `wa.me` ao clicar no telefone (sem o prefixo 55)
- Corrigir para incluir o prefixo `55` no link, padronizando com o resto do sistema

## Detalhes Técnicos

Padrão de link usado em todos os locais:
```typescript
const cleanPhone = phone.replace(/\D/g, '');
window.open(`https://wa.me/55${cleanPhone}`, '_blank');
```

Cada link terá:
- Ícone do WhatsApp (MessageCircle) em verde ao lado do número
- `cursor-pointer` e `hover:underline` para indicar que é clicável
- `e.stopPropagation()` para não disparar o onClick do card pai

## Sem alterações no banco de dados
