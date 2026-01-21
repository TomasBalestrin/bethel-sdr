import { supabase } from '@/integrations/supabase/client';

interface EventData {
  summary: string;
  description: string;
  start: string;
  end: string;
  attendees?: string[];
}

interface SyncParams {
  action: 'create' | 'update' | 'delete';
  appointmentId: string;
  closerEmail?: string;
  eventData?: EventData;
}

export async function syncGoogleCalendar(params: SyncParams): Promise<void> {
  try {
    const { data, error } = await supabase.functions.invoke('sync-google-calendar', {
      body: params,
    });

    if (error) {
      console.warn('Google Calendar sync failed:', error.message);
      return;
    }

    if (!data?.success) {
      console.warn('Google Calendar sync returned error:', data?.error || 'Unknown error');
    } else {
      console.log(`Google Calendar sync ${params.action} successful for appointment ${params.appointmentId}`);
    }
  } catch (err) {
    console.warn('Google Calendar sync error:', err);
  }
}

export function buildEventData(params: {
  leadName: string;
  leadPhone?: string | null;
  leadEmail?: string | null;
  niche?: string | null;
  revenue?: string | number | null;
  challenge?: string | null;
  scheduledDate: string;
  duration: number;
  notes?: string | null;
}): EventData {
  const { leadName, leadPhone, leadEmail, niche, revenue, challenge, scheduledDate, duration, notes } = params;

  const startDate = new Date(scheduledDate);
  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  const descriptionParts = [
    `📞 Telefone: ${leadPhone || 'Não informado'}`,
    `📧 Email: ${leadEmail || 'Não informado'}`,
    niche ? `🏢 Nicho: ${niche}` : null,
    revenue ? `💰 Faturamento: ${revenue}` : null,
    challenge ? `🎯 Desafio: ${challenge}` : null,
    notes ? `\n📝 Observações: ${notes}` : null,
  ].filter(Boolean);

  return {
    summary: `Call - ${leadName}`,
    description: descriptionParts.join('\n'),
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    attendees: leadEmail ? [leadEmail] : [],
  };
}
