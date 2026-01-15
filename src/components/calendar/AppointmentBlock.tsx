import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  scheduled_date: string;
  duration: number;
  status: string;
  lead?: {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  closer?: {
    id: string;
    name: string;
  } | null;
}

interface AppointmentBlockProps {
  appointment: Appointment;
  style: { top: number; height: number };
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  agendado: 'bg-blue-500/90 hover:bg-blue-600/90 border-blue-600',
  reagendado: 'bg-amber-500/90 hover:bg-amber-600/90 border-amber-600',
  realizado: 'bg-green-500/90 hover:bg-green-600/90 border-green-600',
  nao_compareceu: 'bg-red-500/90 hover:bg-red-600/90 border-red-600',
};

export function AppointmentBlock({ appointment, style, onClick }: AppointmentBlockProps) {
  const date = parseISO(appointment.scheduled_date);
  const colorClass = statusColors[appointment.status] || statusColors.agendado;

  return (
    <button
      onClick={onClick}
      className={cn(
        'absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left cursor-pointer transition-colors',
        'text-white text-xs overflow-hidden border-l-2',
        colorClass
      )}
      style={{
        top: style.top,
        height: Math.max(style.height - 2, 24), // Minimum height
      }}
    >
      <div className="font-medium truncate">
        {appointment.lead?.full_name || 'Lead'}
      </div>
      {style.height >= 40 && (
        <div className="text-white/80 truncate">
          {format(date, 'HH:mm')}
        </div>
      )}
      {style.height >= 60 && appointment.closer && (
        <div className="text-white/70 truncate text-[10px]">
          {appointment.closer.name}
        </div>
      )}
    </button>
  );
}
