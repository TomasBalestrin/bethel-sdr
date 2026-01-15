import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { useAppointments } from '@/hooks/useAppointments';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppointmentStatusBadge } from '@/components/shared/StatusBadge';

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: appointments, isLoading } = useAppointments({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
            <p className="text-muted-foreground">Visualize seus agendamentos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium min-w-[200px] text-center">
              {format(startDate, "dd 'de' MMMM", { locale: ptBR })} - {format(endDate, "dd 'de' MMMM", { locale: ptBR })}
            </span>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-96 w-full" />
        ) : appointments && appointments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{appointment.lead?.full_name}</span>
                  <AppointmentStatusBadge status={appointment.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(appointment.scheduled_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-sm">Closer: {appointment.closer?.name || 'Não definido'}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhum agendamento"
            description="Não há agendamentos para este período."
          />
        )}
      </div>
    </AppLayout>
  );
}
