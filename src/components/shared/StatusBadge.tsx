import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  CLASSIFICATION_COLORS, 
  CLASSIFICATION_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  APPOINTMENT_STATUS_COLORS,
  APPOINTMENT_STATUS_LABELS,
  ROLE_LABELS
} from '@/lib/constants';
import type { AppRole, LeadClassification, LeadStatus, AppointmentStatus } from '@/types/database';

interface ClassificationBadgeProps {
  classification: LeadClassification;
  className?: string;
}

export function ClassificationBadge({ classification, className }: ClassificationBadgeProps) {
  return (
    <Badge className={cn(CLASSIFICATION_COLORS[classification], 'font-medium', className)}>
      {CLASSIFICATION_LABELS[classification]}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: LeadStatus;
  className?: string;
}

export function LeadStatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(STATUS_COLORS[status], 'border-0 font-medium', className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

interface AppointmentStatusBadgeProps {
  status: AppointmentStatus;
  className?: string;
}

export function AppointmentStatusBadge({ status, className }: AppointmentStatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(APPOINTMENT_STATUS_COLORS[status], 'border-0 font-medium', className)}>
      {APPOINTMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

interface RoleBadgeProps {
  role: AppRole;
  className?: string;
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const roleColors = {
    admin: 'bg-error/20 text-error',
    lider: 'bg-warning/20 text-warning',
    sdr: 'bg-primary/20 text-primary',
    closer: 'bg-success/20 text-success',
  };

  return (
    <Badge variant="outline" className={cn(roleColors[role], 'border-0 font-medium', className)}>
      {ROLE_LABELS[role]}
    </Badge>
  );
}
