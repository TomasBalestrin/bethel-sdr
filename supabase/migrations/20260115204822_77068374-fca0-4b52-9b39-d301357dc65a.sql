-- Criar tabela de notificações
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to send notifications on lead assignment
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when assigned_sdr_id changes and is not null
  IF (TG_OP = 'UPDATE' AND NEW.assigned_sdr_id IS DISTINCT FROM OLD.assigned_sdr_id AND NEW.assigned_sdr_id IS NOT NULL) 
     OR (TG_OP = 'INSERT' AND NEW.assigned_sdr_id IS NOT NULL) THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.assigned_sdr_id,
      'Novo lead atribuído',
      'Um novo lead foi atribuído a você: ' || NEW.full_name,
      'info',
      jsonb_build_object('lead_id', NEW.id, 'lead_name', NEW.full_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for lead assignment
CREATE TRIGGER on_lead_assignment
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.notify_lead_assignment();

-- Create function to notify on appointment creation
CREATE OR REPLACE FUNCTION public.notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lead_name TEXT;
BEGIN
  SELECT full_name INTO lead_name FROM public.leads WHERE id = NEW.lead_id;
  
  -- Notify the closer
  IF NEW.closer_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, metadata)
    VALUES (
      NEW.closer_id,
      'Novo agendamento',
      'Você tem um novo agendamento com ' || COALESCE(lead_name, 'um lead') || ' às ' || to_char(NEW.scheduled_date AT TIME ZONE 'America/Sao_Paulo', 'DD/MM HH24:MI'),
      'success',
      jsonb_build_object('appointment_id', NEW.id, 'lead_name', lead_name)
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for appointment creation
CREATE TRIGGER on_appointment_created
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.notify_appointment_created();