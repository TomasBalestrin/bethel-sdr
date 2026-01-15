import { useMemo } from 'react';
import { format, addDays, isSameDay, parseISO, getHours, getMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentBlock } from './AppointmentBlock';

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

interface WeeklyCalendarGridProps {
  startDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
}

const HOUR_HEIGHT = 60; // pixels per hour
const START_HOUR = 8;
const END_HOUR = 20;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export function WeeklyCalendarGrid({ startDate, appointments, onAppointmentClick }: WeeklyCalendarGridProps) {
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  }, [startDate]);

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter((apt) => {
      const aptDate = parseISO(apt.scheduled_date);
      return isSameDay(aptDate, day);
    });
  };

  const getAppointmentPosition = (appointment: Appointment) => {
    const date = parseISO(appointment.scheduled_date);
    const hour = getHours(date);
    const minutes = getMinutes(date);
    
    const top = (hour - START_HOUR) * HOUR_HEIGHT + (minutes / 60) * HOUR_HEIGHT;
    const height = (appointment.duration / 60) * HOUR_HEIGHT;
    
    return { top, height };
  };

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header with day names */}
      <div className="grid grid-cols-8 border-b bg-muted/50">
        <div className="p-2 text-center text-xs font-medium text-muted-foreground border-r">
          Horário
        </div>
        {weekDays.map((day, index) => (
          <div key={index} className="p-2 text-center border-r last:border-r-0">
            <div className="text-xs text-muted-foreground">
              {format(day, 'EEE', { locale: ptBR })}
            </div>
            <div className="text-sm font-semibold">
              {format(day, 'dd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="relative overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="grid grid-cols-8">
          {/* Hours column */}
          <div className="border-r">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-b text-xs text-muted-foreground flex items-start justify-center pt-1"
                style={{ height: HOUR_HEIGHT }}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dayAppointments = getAppointmentsForDay(day);
            
            return (
              <div 
                key={dayIndex} 
                className="relative border-r last:border-r-0"
                style={{ height: HOURS.length * HOUR_HEIGHT }}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b absolute w-full"
                    style={{ top: (hour - START_HOUR) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  />
                ))}

                {/* Appointments */}
                {dayAppointments.map((appointment) => {
                  const { top, height } = getAppointmentPosition(appointment);
                  
                  // Only show if within visible hours
                  if (top < 0 || top >= HOURS.length * HOUR_HEIGHT) return null;
                  
                  return (
                    <AppointmentBlock
                      key={appointment.id}
                      appointment={appointment}
                      style={{ top, height: Math.min(height, HOURS.length * HOUR_HEIGHT - top) }}
                      onClick={() => onAppointmentClick(appointment)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
