import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, UserCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScheduledLeadCard } from './ScheduledLeadCard';
import { useRescheduleAppointment, useRegisterCallResult, useUpdateAppointment, useReassignAppointment } from '@/hooks/useAppointments';
import { useUsersByRole } from '@/hooks/useUsers';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  scheduled_date: string;
  duration: number;
  status: string;
  notes?: string | null;
  attended?: boolean | null;
  converted?: boolean | null;
  conversion_value?: number | null;
  lead?: {
    id: string;
    full_name: string;
    phone?: string | null;
    email?: string | null;
    state?: string | null;
    instagram?: string | null;
    business_name?: string | null;
    business_position?: string | null;
    niche?: string | null;
    revenue?: number | null;
    main_pain?: string | null;
    has_partner?: boolean | null;
    knows_specialist_since?: string | null;
    classification?: string | null;
    qualification?: string | null;
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

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = 'details' | 'reschedule' | 'result' | 'reassign';

export function AppointmentDetailsModal({ appointment, open, onOpenChange }: AppointmentDetailsModalProps) {
  const [view, setView] = useState<ModalView>('details');
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [attended, setAttended] = useState(true);
  const [converted, setConverted] = useState(false);
  const [conversionValue, setConversionValue] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedCloserId, setSelectedCloserId] = useState('');

  const reschedule = useRescheduleAppointment();
  const registerResult = useRegisterCallResult();
  const updateAppointment = useUpdateAppointment();
  const reassignAppointment = useReassignAppointment();
  const { data: closers } = useUsersByRole('closer');

  if (!appointment) return null;

  const isCompleted = appointment.status === 'realizado' || appointment.status === 'nao_compareceu';

  const handleReschedule = () => {
    if (!rescheduleDate) return;

    const [hours, minutes] = rescheduleTime.split(':').map(Number);
    const newDate = new Date(rescheduleDate);
    newDate.setHours(hours, minutes, 0, 0);

    reschedule.mutate(
      { id: appointment.id, scheduled_date: newDate.toISOString() },
      {
        onSuccess: () => {
          setView('details');
          onOpenChange(false);
        },
      }
    );
  };

  const handleRegisterResult = () => {
    registerResult.mutate(
      {
        id: appointment.id,
        attended,
        converted: attended ? converted : false,
        conversion_value: attended && converted ? parseFloat(conversionValue) || undefined : undefined,
        notes: notes || undefined,
      },
      {
        onSuccess: () => {
          setView('details');
          onOpenChange(false);
        },
      }
    );
  };

  const handleCancel = () => {
    updateAppointment.mutate(
      { id: appointment.id, status: 'nao_compareceu' as const },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleReassign = () => {
    if (!selectedCloserId) return;

    reassignAppointment.mutate(
      { appointmentId: appointment.id, closerId: selectedCloserId },
      {
        onSuccess: () => {
          setView('details');
          onOpenChange(false);
        },
      }
    );
  };

  const resetAndClose = () => {
    setView('details');
    setRescheduleDate(undefined);
    setRescheduleTime('10:00');
    setAttended(true);
    setConverted(false);
    setConversionValue('');
    setNotes('');
    setSelectedCloserId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === 'details' && 'Detalhes do Agendamento'}
            {view === 'reschedule' && 'Reagendar'}
            {view === 'result' && 'Registrar Resultado'}
            {view === 'reassign' && 'Reatribuir Closer'}
          </DialogTitle>
        </DialogHeader>

        {view === 'details' && (
          <div className="space-y-4">
            {/* ScheduledLeadCard with full lead info */}
            {appointment.lead && (
              <ScheduledLeadCard
                lead={appointment.lead}
                appointment={{
                  id: appointment.id,
                  scheduled_date: appointment.scheduled_date,
                  duration: appointment.duration,
                  status: appointment.status,
                  closer: appointment.closer,
                  sdr: appointment.sdr,
                }}
              />
            )}

            {/* Fallback if no lead data */}
            {!appointment.lead && (
              <div className="text-center text-muted-foreground py-4">
                Dados do lead não disponíveis
              </div>
            )}

            {appointment.notes && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="text-sm mt-1">{appointment.notes}</p>
                </div>
              </>
            )}

            {/* Actions */}
            {!isCompleted && (
              <>
                <Separator />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => setView('reschedule')}
                  >
                    Reagendar
                  </Button>
                  <Button 
                    variant="default" 
                    className="flex-1"
                    onClick={() => setView('result')}
                  >
                    Registrar Resultado
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedCloserId(appointment.closer?.id || '');
                      setView('reassign');
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    Alterar Closer
                  </Button>
                </div>
                <Button 
                  variant="destructive" 
                  className="w-full"
                  onClick={handleCancel}
                  disabled={updateAppointment.isPending}
                >
                  Cancelar Agendamento
                </Button>
              </>
            )}
          </div>
        )}

        {view === 'reschedule' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nova Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !rescheduleDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rescheduleDate ? format(rescheduleDate, 'PPP', { locale: ptBR }) : 'Selecione a data'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={rescheduleDate}
                    onSelect={setRescheduleDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Horário</Label>
              <Input
                type="time"
                value={rescheduleTime}
                onChange={(e) => setRescheduleTime(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView('details')} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleReschedule} 
                disabled={!rescheduleDate || reschedule.isPending}
                className="flex-1"
              >
                Confirmar
              </Button>
            </div>
          </div>
        )}

        {view === 'result' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Lead compareceu?</Label>
              <Switch checked={attended} onCheckedChange={setAttended} />
            </div>

            {attended && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Converteu?</Label>
                  <Switch checked={converted} onCheckedChange={setConverted} />
                </div>

                {converted && (
                  <div className="space-y-2">
                    <Label>Valor da conversão (R$)</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={conversionValue}
                      onChange={(e) => setConversionValue(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione observações sobre a call..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView('details')} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleRegisterResult}
                disabled={registerResult.isPending}
                className="flex-1"
              >
                Salvar
              </Button>
            </div>
          </div>
        )}

        {view === 'reassign' && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Closer atual: <span className="font-medium text-foreground">{appointment.closer?.name || 'Não atribuído'}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label>Novo Closer</Label>
              <Select value={selectedCloserId} onValueChange={setSelectedCloserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um closer" />
                </SelectTrigger>
                <SelectContent>
                  {closers?.map((closer) => (
                    <SelectItem key={closer.user_id} value={closer.user_id}>
                      {closer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView('details')} className="flex-1">
                Voltar
              </Button>
              <Button 
                onClick={handleReassign}
                disabled={!selectedCloserId || selectedCloserId === appointment.closer?.id || reassignAppointment.isPending}
                className="flex-1"
              >
                {reassignAppointment.isPending ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
