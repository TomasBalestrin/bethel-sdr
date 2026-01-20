import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAppointments } from '@/hooks/useAppointments';
import { useUsersByRole } from '@/hooks/useUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WeeklyCalendarGrid } from '@/components/calendar/WeeklyCalendarGrid';
import { MonthlyCalendarGrid } from '@/components/calendar/MonthlyCalendarGrid';
import { CalendarListView } from '@/components/calendar/CalendarListView';
import { CloserMultiSelect } from '@/components/calendar/CloserMultiSelect';
import { AppointmentDetailsModal } from '@/components/calendar/AppointmentDetailsModal';

type ViewMode = 'weekly' | 'monthly';

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCloserIds, setSelectedCloserIds] = useState<string[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');

  const { data: closers } = useUsersByRole('closer');

  // Initialize with all closers selected when data loads
  useEffect(() => {
    if (closers && closers.length > 0 && selectedCloserIds.length === 0) {
      setSelectedCloserIds(closers.map((c) => c.user_id));
    }
  }, [closers, selectedCloserIds.length]);

  // Determine if we should show list view (all closers selected)
  const allClosersSelected = closers && closers.length > 0 && selectedCloserIds.length === closers.length;
  const showListView = allClosersSelected;

  // Calculate date range based on view mode
  const startDate = viewMode === 'weekly' 
    ? startOfWeek(currentDate, { weekStartsOn: 1 })
    : startOfMonth(currentDate);
  const endDate = viewMode === 'weekly'
    ? endOfWeek(currentDate, { weekStartsOn: 1 })
    : endOfMonth(currentDate);

  const { data: appointments, isLoading } = useAppointments({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    closerIds: selectedCloserIds.length > 0 ? selectedCloserIds : undefined,
  });

  const handleAppointmentClick = (appointment: any) => {
    setSelectedAppointment(appointment);
    setModalOpen(true);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const navigatePrevious = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(subWeeks(currentDate, 1));
    } else {
      setCurrentDate(subMonths(currentDate, 1));
    }
  };

  const navigateNext = () => {
    if (viewMode === 'weekly') {
      setCurrentDate(addWeeks(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const getDateRangeLabel = () => {
    if (viewMode === 'weekly') {
      return `${format(startDate, "dd 'de' MMM", { locale: ptBR })} - ${format(endDate, "dd 'de' MMM", { locale: ptBR })}`;
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Calendário</h1>
            <p className="text-muted-foreground">
              {showListView ? 'Visualização em lista cronológica' : 'Visualização em agenda'}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* View mode toggle - only show when not all closers selected */}
            {!showListView && (
              <ToggleGroup 
                type="single" 
                value={viewMode} 
                onValueChange={(value) => value && setViewMode(value as ViewMode)}
                className="bg-muted rounded-lg p-1"
              >
                <ToggleGroupItem value="weekly" aria-label="Visão semanal" className="h-8 px-3 data-[state=on]:bg-background">
                  <List className="h-4 w-4 mr-1" />
                  <span className="text-xs">Semanal</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="monthly" aria-label="Visão mensal" className="h-8 px-3 data-[state=on]:bg-background">
                  <Grid3X3 className="h-4 w-4 mr-1" />
                  <span className="text-xs">Mensal</span>
                </ToggleGroupItem>
              </ToggleGroup>
            )}

            {/* Closer multi-select */}
            {closers && (
              <CloserMultiSelect
                closers={closers}
                selectedIds={selectedCloserIds}
                onSelectionChange={setSelectedCloserIds}
              />
            )}

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={navigatePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium min-w-[200px] text-center text-sm capitalize">
                {getDateRangeLabel()}
              </span>
              <Button variant="outline" size="icon" onClick={navigateNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-[600px] w-full" />
        ) : appointments && appointments.length > 0 ? (
          showListView ? (
            <CalendarListView
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
            />
          ) : viewMode === 'weekly' ? (
            <WeeklyCalendarGrid
              startDate={startDate}
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
            />
          ) : (
            <MonthlyCalendarGrid
              currentDate={currentDate}
              appointments={appointments}
              onAppointmentClick={handleAppointmentClick}
            />
          )
        ) : (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhum agendamento"
            description={selectedCloserIds.length === 0 
              ? "Selecione ao menos um closer para visualizar agendamentos."
              : "Não há agendamentos para este período."
            }
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
