import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  User, Phone, Mail, MapPin, Instagram, Building2, Briefcase, 
  DollarSign, AlertCircle, Users, Clock, Calendar, MessageCircle, 
  UserCheck, Diamond, Award
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface LeadData {
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
}

interface AppointmentData {
  id: string;
  scheduled_date: string;
  duration: number;
  status: string;
  closer?: { name: string } | null;
  sdr?: { name: string } | null;
  funnel?: { name: string } | null;
}

interface ScheduledLeadCardProps {
  lead: LeadData;
  appointment?: AppointmentData;
  compact?: boolean;
  className?: string;
}

const classificationConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  diamante: { label: 'Diamante', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50', icon: <Diamond className="h-3.5 w-3.5" /> },
  ouro: { label: 'Ouro', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', icon: <Award className="h-3.5 w-3.5" /> },
  prata: { label: 'Prata', color: 'bg-slate-400/20 text-slate-300 border-slate-400/50', icon: <Award className="h-3.5 w-3.5" /> },
  bronze: { label: 'Bronze', color: 'bg-amber-700/20 text-amber-500 border-amber-700/50', icon: <Award className="h-3.5 w-3.5" /> },
};

export function ScheduledLeadCard({ lead, appointment, compact = false, className }: ScheduledLeadCardProps) {
  const classification = lead.classification ? classificationConfig[lead.classification] : null;

  const formatRevenue = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const handleWhatsApp = () => {
    if (lead.phone) {
      const cleanPhone = lead.phone.replace(/\D/g, '');
      window.open(`https://wa.me/55${cleanPhone}`, '_blank');
    }
  };

  const handleEmail = () => {
    if (lead.email) {
      window.open(`mailto:${lead.email}`, '_blank');
    }
  };

  const handleCall = () => {
    if (lead.phone) {
      window.open(`tel:${lead.phone}`, '_blank');
    }
  };

  if (compact) {
    return (
      <Card className={cn('border-primary/20 bg-gradient-to-br from-card to-primary/5', className)}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{lead.full_name}</h3>
                {classification && (
                  <Badge variant="outline" className={cn('text-xs shrink-0', classification.color)}>
                    {classification.icon}
                    <span className="ml-1">{classification.label}</span>
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                {lead.niche && <span>{lead.niche}</span>}
                {lead.revenue && <span>{formatRevenue(lead.revenue)}</span>}
                {lead.state && <span>{lead.state}</span>}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              {lead.phone && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleWhatsApp}>
                  <MessageCircle className="h-4 w-4 text-green-500" />
                </Button>
              )}
              {lead.phone && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCall}>
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-primary/30 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden', className)}>
      {/* Premium Header */}
      <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/10 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{lead.full_name}</h2>
              {classification && (
                <Badge variant="outline" className={cn('shrink-0', classification.color)}>
                  {classification.icon}
                  <span className="ml-1">{classification.label}</span>
                </Badge>
              )}
            </div>
            {lead.qualification && (
              <p className="text-sm text-muted-foreground">{lead.qualification}</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mt-3">
          {lead.phone && (
            <Button size="sm" variant="secondary" onClick={handleWhatsApp} className="gap-1.5">
              <MessageCircle className="h-4 w-4 text-green-500" />
              WhatsApp
            </Button>
          )}
          {lead.email && (
            <Button size="sm" variant="secondary" onClick={handleEmail} className="gap-1.5">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          )}
          {lead.phone && (
            <Button size="sm" variant="secondary" onClick={handleCall} className="gap-1.5">
              <Phone className="h-4 w-4" />
              Ligar
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Appointment Info */}
        {appointment && (
          <>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Agendamento
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>
                    {format(parseISO(appointment.scheduled_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {format(parseISO(appointment.scheduled_date), "HH:mm", { locale: ptBR })} ({appointment.duration}min)
                  </span>
                </div>
                {appointment.closer && (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    <span>Closer: {appointment.closer.name}</span>
                  </div>
                )}
                {appointment.sdr && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>SDR: {appointment.sdr.name}</span>
                  </div>
                )}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Personal Data */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dados Pessoais
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="truncate">{lead.email}</span>
              </div>
            )}
            {lead.state && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{lead.state}</span>
              </div>
            )}
            {lead.instagram && (
              <div className="flex items-center gap-2">
                <Instagram className="h-4 w-4 text-muted-foreground" />
                <span>@{lead.instagram.replace('@', '')}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Business Data */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Dados do Negócio
          </h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.niche && (
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{lead.niche}</span>
              </div>
            )}
            {lead.business_name && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{lead.business_name}</span>
              </div>
            )}
            {lead.business_position && (
              <div className="flex items-center gap-2 col-span-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Posição: {lead.business_position}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Qualification Data */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Qualificação
          </h4>
          <div className="space-y-2 text-sm">
            {lead.revenue && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>Faturamento: {formatRevenue(lead.revenue)}</span>
              </div>
            )}
            {lead.main_pain && (
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                <span className="flex-1">Principal desafio: {lead.main_pain}</span>
              </div>
            )}
            {lead.has_partner !== null && lead.has_partner !== undefined && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Tem sócio: {lead.has_partner ? 'Sim' : 'Não'}</span>
              </div>
            )}
            {lead.knows_specialist_since && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Conhece o especialista: {lead.knows_specialist_since}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
