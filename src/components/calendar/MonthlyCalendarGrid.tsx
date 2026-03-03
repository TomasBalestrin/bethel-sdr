import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { AppointmentWithRelations } from '@/types/database';
import { ClassificationBadge } from '@/components/shared/StatusBadge';

interface MonthlyCalendarGridProps {
  currentDate: Date;
  appointments: AppointmentWithRelations[];
  onDayClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: AppointmentWithRelations) => void;
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export function MonthlyCalendarGrid({
  currentDate,
  appointments,
  onDayClick,
  onAppointmentClick,
}: MonthlyCalendarGridProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduled_date);
      return isSameDay(aptDate, date);
    });
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden" role="grid" aria-label="Calendário mensal de agendamentos">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 bg-muted/50" role="row">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            role="columnheader"
            className="px-2 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider border-b"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7" role="rowgroup">
        {days.map((day, index) => {
          const dayAppointments = getAppointmentsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isCurrentDay = isToday(day);

          return (
            <div
              key={day.toISOString()}
              role="gridcell"
              aria-label={`${format(day, "dd 'de' MMMM", { locale: ptBR })}${dayAppointments.length > 0 ? `, ${dayAppointments.length} agendamentos` : ''}`}
              onClick={() => onDayClick?.(day)}
              className={cn(
                'min-h-[100px] p-1 border-b border-r cursor-pointer transition-colors hover:bg-muted/30',
                !isCurrentMonth && 'bg-muted/20 text-muted-foreground',
                index % 7 === 6 && 'border-r-0'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full',
                    isCurrentDay && 'bg-primary text-primary-foreground',
                    !isCurrentDay && isCurrentMonth && 'text-foreground',
                    !isCurrentMonth && 'text-muted-foreground'
                  )}
                >
                  {format(day, 'd')}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {dayAppointments.length} {dayAppointments.length === 1 ? 'agend.' : 'agends.'}
                  </span>
                )}
              </div>

              {/* Appointment previews */}
              <div className="space-y-0.5">
                {dayAppointments.slice(0, 3).map((apt) => (
                  <button
                    key={apt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(apt);
                    }}
                    className={cn(
                      'w-full text-left px-1.5 py-0.5 rounded text-[10px] truncate transition-colors',
                      'bg-primary/10 text-primary hover:bg-primary/20'
                    )}
                  >
                    <span className="font-medium">{format(new Date(apt.scheduled_date), 'HH:mm')}</span>
                    {' - '}
                    <span>{apt.lead?.full_name || 'Lead'}</span>
                  </button>
                ))}
                {dayAppointments.length > 3 && (
                  <p className="text-[10px] text-muted-foreground px-1">
                    +{dayAppointments.length - 3} mais
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
