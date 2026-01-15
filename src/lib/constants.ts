// Classification colors mapping
export const CLASSIFICATION_COLORS = {
  diamante: 'bg-classification-diamante text-white',
  ouro: 'bg-classification-ouro text-white',
  prata: 'bg-classification-prata text-foreground',
  bronze: 'bg-classification-bronze text-white',
} as const;

// Status colors mapping
export const STATUS_COLORS = {
  novo: 'bg-primary/20 text-primary',
  em_atendimento: 'bg-warning/20 text-warning',
  agendado: 'bg-success/20 text-success',
  concluido: 'bg-muted text-muted-foreground',
} as const;

// Appointment status colors
export const APPOINTMENT_STATUS_COLORS = {
  agendado: 'bg-primary/20 text-primary',
  reagendado: 'bg-warning/20 text-warning',
  realizado: 'bg-success/20 text-success',
  nao_compareceu: 'bg-error/20 text-error',
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
