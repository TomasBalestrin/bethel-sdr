// Classification colors mapping - Using semantic Tailwind classes
export const CLASSIFICATION_COLORS = {
  diamante: 'bg-diamante text-diamante-foreground',
  ouro: 'bg-ouro text-ouro-foreground',
  prata: 'bg-prata text-prata-foreground',
  bronze: 'bg-bronze text-bronze-foreground',
} as const;

// Status colors mapping
export const STATUS_COLORS = {
  novo: 'bg-primary/15 text-primary',
  em_atendimento: 'bg-warning/15 text-warning',
  agendado: 'bg-success/15 text-success',
  concluido: 'bg-muted text-muted-foreground',
} as const;

// Appointment status colors
export const APPOINTMENT_STATUS_COLORS = {
  agendado: 'bg-primary/15 text-primary',
  reagendado: 'bg-warning/15 text-warning',
  realizado: 'bg-success/15 text-success',
  nao_compareceu: 'bg-destructive/15 text-destructive',
  cancelado: 'bg-muted text-muted-foreground',
} as const;

// Role labels
export const ROLE_LABELS = {
  admin: 'Administrador',
  lider: 'Líder',
  sdr: 'SDR',
  closer: 'Closer',
} as const;

// Classification labels
export const CLASSIFICATION_LABELS = {
  diamante: 'Diamante',
  ouro: 'Ouro',
  prata: 'Prata',
  bronze: 'Bronze',
} as const;

// Status labels
export const STATUS_LABELS = {
  novo: 'Novo',
  em_atendimento: 'Em Atendimento',
  agendado: 'Agendado',
  concluido: 'Concluído',
} as const;

// Appointment status labels
export const APPOINTMENT_STATUS_LABELS = {
  agendado: 'Agendado',
  reagendado: 'Reagendado',
  realizado: 'Realizado',
  nao_compareceu: 'Não Compareceu',
  cancelado: 'Cancelado',
} as const;

// SDR type labels
export const SDR_TYPE_LABELS = {
  sdr: 'SDR',
  social_selling: 'Social Selling',
} as const;

// Days of week
export const DAYS_OF_WEEK = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
] as const;