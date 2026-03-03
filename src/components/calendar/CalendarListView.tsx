import { useMemo } from 'react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock, User, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppointmentStatusBadge } from '@/components/shared/StatusBadge';
import { cn } from '@/lib/utils';
import type { AppointmentStatus } from '@/types/database';

interface Appointment {
  id: string;
  scheduled_date: string;
  duration: number;
  status: AppointmentStatus;
  lead?: {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    classification?: string | null;
    niche?: string | null;
    revenue?: number | null;
    state?: string | null;
  } | null;
  closer?: {
    id: string;
    name: string;
  } | null;
  sdr?: {
    id: string;
    name: string;
  } | null;
  funnel?: {
    id: string;
    name: string;
  } | null;
}

interface CalendarListViewProps {
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const classificationColors: Record<string, string> = {
  diamante: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
  ouro: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
  prata: 'bg-slate-400/20 text-slate-300 border-slate-400/50',
  bronze: 'bg-amber-700/20 text-amber-500 border-amber-700/50',
};

export function CalendarListView({ appointments, onAppointmentClick }: CalendarListViewProps) {
  // Group appointments by date
  const groupedAppointments = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    
    appointments.forEach((apt) => {
      const dateKey = format(parseISO(apt.scheduled_date), 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(apt);
    });

    // Sort appointments within each group by time
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      );
    });

    // Return sorted array of [date, appointments]
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [appointments]);

  const formatRevenue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const isToday = (dateStr: string) => {
    return isSameDay(parseISO(dateStr), new Date());
  };

  if (appointments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {groupedAppointments.map(([dateKey, dayAppointments]) => (
        <div key={dateKey}>
          {/* Date Header */}
          <div className={cn(
            'flex items-center gap-2 mb-3 pb-2 border-b',
            isToday(dateKey) && 'border-primary'
          )}>
            <CalendarIcon className={cn(
              'h-5 w-5',
              isToday(dateKey) ? 'text-primary' : 'text-muted-foreground'
            )} />
            <h3 className={cn(
              'font-semibold capitalize',
              isToday(dateKey) && 'text-primary'
            )}>
              {format(parseISO(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
            </h3>
            {isToday(dateKey) && (
              <Badge variant="default" className="ml-2">Hoje</Badge>
            )}
            <Badge variant="secondary" className="ml-auto">
              {dayAppointments.length} agendamento{dayAppointments.length !== 1 ? 's' : ''}
            </Badge>
          </div>

          {/* Appointments List */}
          <div className="space-y-2">
            {dayAppointments.map((appointment) => {
              const time = format(parseISO(appointment.scheduled_date), 'HH:mm');
              const classification = appointment.lead?.classification;
              
              return (
                <Card 
                  key={appointment.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors group"
                  onClick={() => onAppointmentClick(appointment)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-4">
                      {/* Time */}
                      <div className="flex items-center gap-2 w-20 shrink-0">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold">{time}</span>
                      </div>

                      {/* Lead Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {appointment.lead?.full_name || 'Lead'}
                          </span>
                          {classification && (
                            <Badge 
                              variant="outline" 
                              className={cn('text-xs shrink-0', classificationColors[classification])}
                            >
                              {classification.charAt(0).toUpperCase() + classification.slice(1)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          {appointment.lead?.niche && (
                            <span>{appointment.lead.niche}</span>
                          )}
                          {appointment.lead?.revenue && (
                            <span>{formatRevenue(appointment.lead.revenue)}</span>
                          )}
                          {appointment.lead?.state && (
                            <span>{appointment.lead.state}</span>
                          )}
                        </div>
                      </div>

                      {/* Closer */}
                      {appointment.closer && (
                        <div className="flex items-center gap-1.5 text-sm shrink-0">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{appointment.closer.name}</span>
                        </div>
                      )}

                      {/* Status */}
                      <AppointmentStatusBadge status={appointment.status} />

                      {/* Arrow */}
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
