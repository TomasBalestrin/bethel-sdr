import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Phone, Mail, User, Clock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AppointmentStatusBadge } from '@/components/shared/StatusBadge';
import { useRescheduleAppointment, useRegisterCallResult, useUpdateAppointment } from '@/hooks/useAppointments';
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
  } | null;
  closer?: {
    id: string;
    name: string;
  } | null;
  sdr?: {
    id: string;
    name: string;
  } | null;
}

interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModalView = 'details' | 'reschedule' | 'result';

export function AppointmentDetailsModal({ appointment, open, onOpenChange }: AppointmentDetailsModalProps) {
  const [view, setView] = useState<ModalView>('details');
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [attended, setAttended] = useState(true);
  const [converted, setConverted] = useState(false);
  const [conversionValue, setConversionValue] = useState('');
  const [notes, setNotes] = useState('');

  const reschedule = useRescheduleAppointment();
  const registerResult = useRegisterCallResult();
  const updateAppointment = useUpdateAppointment();

  if (!appointment) return null;

  const date = parseISO(appointment.scheduled_date);
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

  const resetAndClose = () => {
    setView('details');
    setRescheduleDate(undefined);
    setRescheduleTime('10:00');
    setAttended(true);
    setConverted(false);
    setConversionValue('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {view === 'details' && 'Detalhes do Agendamento'}
            {view === 'reschedule' && 'Reagendar'}
            {view === 'result' && 'Registrar Resultado'}
          </DialogTitle>
        </DialogHeader>

        {view === 'details' && (
          <div className="space-y-4">
            {/* Lead Info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">{appointment.lead?.full_name || 'Lead'}</h3>
                <AppointmentStatusBadge status={appointment.status as any} />
              </div>
              
              {appointment.lead?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {appointment.lead.phone}
                </div>
              )}
              
              {appointment.lead?.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {appointment.lead.email}
                </div>
              )}
            </div>

            <Separator />

            {/* Appointment Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{format(date, 'HH:mm')} - {appointment.duration} minutos</span>
              </div>

              {appointment.closer && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>Closer: {appointment.closer.name}</span>
                </div>
              )}

              {appointment.sdr && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span>SDR: {appointment.sdr.name}</span>
                </div>
              )}
            </div>

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
      </DialogContent>
    </Dialog>
  );
}
