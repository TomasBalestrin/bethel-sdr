import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Phone, Mail, Instagram, Calendar, User, Clock, MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClassificationBadge, LeadStatusBadge } from '@/components/shared/StatusBadge';
import { useLeadActivities } from '@/hooks/useLeadActivities';
import { Skeleton } from '@/components/ui/skeleton';
import { Database } from '@/integrations/supabase/types';

type Lead = Database['public']['Tables']['leads']['Row'] & {
  funnel?: { name: string } | null;
  assigned_sdr?: { name: string } | null;
};

interface LeadDetailsSheetProps {
  lead: Lead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchedule?: () => void;
  onStartAttendance?: () => void;
}

export function LeadDetailsSheet({ 
  lead, 
  open, 
  onOpenChange, 
  onSchedule,
  onStartAttendance 
}: LeadDetailsSheetProps) {
  const { data: activities, isLoading: activitiesLoading } = useLeadActivities(lead?.id || '');

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <span>{lead.full_name}</span>
            {lead.classification && <ClassificationBadge classification={lead.classification} />}
          </SheetTitle>
          <SheetDescription>
            <LeadStatusBadge status={lead.status} />
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Contact Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">Contato</h4>
            {lead.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-primary hover:underline">
                  {lead.phone}
                </a>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                  {lead.email}
                </a>
              </div>
            )}
            {lead.instagram && (
              <div className="flex items-center gap-3 text-sm">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                <a href={`https://instagram.com/${lead.instagram.replace('@', '')}`} 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-primary hover:underline">
                  {lead.instagram}
                </a>
              </div>
            )}
          </div>

          <Separator />

          {/* Business Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">Informações</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {lead.niche && (
                <div>
                  <span className="text-muted-foreground">Nicho:</span>
                  <p className="font-medium">{lead.niche}</p>
                </div>
              )}
              {lead.revenue && (
                <div>
                  <span className="text-muted-foreground">Faturamento:</span>
                  <p className="font-medium">R$ {Number(lead.revenue).toLocaleString('pt-BR')}</p>
                </div>
              )}
              {lead.main_pain && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Principal dor:</span>
                  <p className="font-medium">{lead.main_pain}</p>
                </div>
              )}
              {lead.funnel && (
                <div>
                  <span className="text-muted-foreground">Funil:</span>
                  <p className="font-medium">{lead.funnel.name}</p>
                </div>
              )}
              {lead.assigned_sdr && (
                <div>
                  <span className="text-muted-foreground">SDR:</span>
                  <p className="font-medium">{lead.assigned_sdr.name}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2">
            {lead.status === 'novo' && onStartAttendance && (
              <Button onClick={onStartAttendance} className="flex-1">
                <MessageSquare className="mr-2 h-4 w-4" />
                Iniciar Atendimento
              </Button>
            )}
            {onSchedule && (
              <Button onClick={onSchedule} variant="outline" className="flex-1">
                <Calendar className="mr-2 h-4 w-4" />
                Agendar Call
              </Button>
            )}
          </div>

          <Separator />

          {/* Activity Timeline */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase">Histórico</h4>
            {activitiesLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : activities && activities.length > 0 ? (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <div className="w-px flex-1 bg-border" />
                    </div>
                    <div className="pb-4 flex-1">
                      <p className="text-sm font-medium">{activity.action_type}</p>
                      {activity.notes && (
                        <p className="text-sm text-muted-foreground">{activity.notes}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(activity.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade registrada
              </p>
            )}
          </div>

          <div className="pt-4 text-xs text-muted-foreground">
            Criado em {format(new Date(lead.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
