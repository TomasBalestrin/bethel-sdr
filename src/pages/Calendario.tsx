import { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppointments } from '@/hooks/useAppointments';
import { useUsersByRole } from '@/hooks/useUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeeklyCalendarGrid } from '@/components/calendar/WeeklyCalendarGrid';
import { AppointmentDetailsModal } from '@/components/calendar/AppointmentDetailsModal';

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCloserId, setSelectedCloserId] = useState<string>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
  const endDate = endOfWeek(currentDate, { weekStartsOn: 1 });

  const { data: closers } = useUsersByRole('closer');

  const { data: appointments, isLoading } = useAppointments({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    closerId: selectedCloserId !== 'all' ? selectedCloserId : undefined,
  });

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
            <p className="text-muted-foreground">Visualize seus agendamentos</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Closer filter */}
            <Select value={selectedCloserId} onValueChange={setSelectedCloserId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por closer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os closers</SelectItem>
                {closers?.map((closer) => (
                  <SelectItem key={closer.user_id} value={closer.user_id}>
                    {closer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[200px] text-center text-sm">
                {format(startDate, "dd 'de' MMM", { locale: ptBR })} - {format(endDate, "dd 'de' MMM", { locale: ptBR })}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : appointments && appointments.length > 0 ? (
          <WeeklyCalendarGrid
            startDate={startDate}
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
          />
        ) : (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhum agendamento"
            description="Não há agendamentos para este período."
          />
        )}
      </div>

      <AppointmentDetailsModal
        appointment={selectedAppointment}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </AppLayout>
  );
}
