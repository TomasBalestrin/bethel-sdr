import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Phone, 
  Mail, 
  Instagram, 
  Building2,
  MapPin,
  Calendar,
  User,
  Share2,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ClassificationBadge } from '@/components/shared/StatusBadge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { LeadWithDetails } from '@/hooks/useLeaderDashboard';

interface LeadCardProps {
  lead: LeadWithDetails;
  onClick?: () => void;
}

export function LeadCard({ lead, onClick }: LeadCardProps) {
  const initials = lead.full_name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const isDistributed = !!lead.assigned_sdr_id;

  const formatRevenue = (value: number | null) => {
    if (!value) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card 
      className={`
        card-elevated cursor-pointer group
        transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5
        ${isDistributed ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-orange-400'}
      `}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-foreground truncate">{lead.full_name}</h3>
              {lead.business_name && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {lead.business_name}
                </p>
              )}
            </div>
          </div>
          
          <Badge
            variant={isDistributed ? 'default' : 'secondary'}
            className={`shrink-0 ${isDistributed 
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
            }`}
          >
            <Share2 className="h-3 w-3 mr-1" />
            {isDistributed ? 'Distribuído' : 'Não Distribuído'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Classification and Status */}
        <div className="flex items-center gap-2 flex-wrap">
          {lead.classification && (
            <ClassificationBadge classification={lead.classification as any} />
          )}
          {lead.niche && (
            <Badge variant="outline" className="text-xs">
              {lead.niche}
            </Badge>
          )}
          {lead.business_position && (
            <Badge variant="outline" className="text-xs capitalize">
              {lead.business_position === 'dono' ? 'Dono' : 'Não Dono'}
            </Badge>
          )}
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {lead.phone && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 truncate">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span className="truncate">{lead.phone}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{lead.phone}</TooltipContent>
            </Tooltip>
          )}
          {lead.email && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{lead.email}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{lead.email}</TooltipContent>
            </Tooltip>
          )}
          {lead.instagram && (
            <div className="flex items-center gap-1 truncate">
              <Instagram className="h-3 w-3 shrink-0" />
              <span className="truncate">{lead.instagram}</span>
            </div>
          )}
          {lead.state && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span>{lead.state}</span>
            </div>
          )}
        </div>

        {/* Revenue */}
        {lead.revenue && (
          <div className="flex items-center gap-1 text-sm font-medium text-foreground">
            <DollarSign className="h-4 w-4 text-green-600" />
            <span>{formatRevenue(lead.revenue)}</span>
          </div>
        )}

        {/* SDR Assignment */}
        {lead.assigned_sdr && (
          <div className="flex items-center gap-2 pt-2 border-t text-xs">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">SDR:</span>
            <span className="font-medium">{lead.assigned_sdr.name}</span>
          </div>
        )}

        {/* Funnel */}
        {lead.funnel && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Funil:</span>
            <Badge variant="outline" className="text-xs">{lead.funnel.name}</Badge>
          </div>
        )}

        {/* Timeline - Facebook style */}
        <div className="flex items-center gap-1 pt-2 border-t text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>Entrou {formatDistanceToNow(new Date(lead.created_at), { 
            addSuffix: true, 
            locale: ptBR 
          })}</span>
          {lead.distributed_at && (
            <>
              <span className="mx-1">•</span>
              <span>Distribuído {formatDistanceToNow(new Date(lead.distributed_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
