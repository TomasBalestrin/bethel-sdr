
-- Function to apply qualification rules to a single lead
CREATE OR REPLACE FUNCTION public.apply_qualification_rules(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_rule RECORD;
  v_condition RECORD;
  v_lead RECORD;
  v_field_value TEXT;
  v_match BOOLEAN;
  v_condition_met BOOLEAN;
  v_conditions JSONB;
  v_first_logic TEXT;
BEGIN
  -- Get the lead data
  SELECT * INTO v_lead FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Loop through active rules ordered by priority
  FOR v_rule IN
    SELECT * FROM public.qualification_rules
    WHERE active = true
      AND (funnel_id IS NULL OR funnel_id = v_lead.funnel_id)
    ORDER BY priority ASC
  LOOP
    v_conditions := v_rule.conditions;
    
    -- Skip if no conditions
    IF v_conditions IS NULL OR jsonb_array_length(v_conditions) = 0 THEN
      CONTINUE;
    END IF;

    -- Determine the default logic mode from the first condition's logic field
    v_first_logic := COALESCE(v_conditions->0->>'logic', 'AND');
    v_match := CASE WHEN v_first_logic = 'OR' THEN false ELSE true END;

    -- Evaluate each condition
    FOR v_condition IN
      SELECT * FROM jsonb_array_elements(v_conditions) AS c
    LOOP
      -- Get the field value from the lead
      v_field_value := CASE (v_condition.value->>'field')
        WHEN 'revenue' THEN v_lead.revenue::TEXT
        WHEN 'niche' THEN v_lead.niche
        WHEN 'state' THEN v_lead.state
        WHEN 'business_position' THEN v_lead.business_position
        WHEN 'has_partner' THEN v_lead.has_partner::TEXT
        WHEN 'main_pain' THEN v_lead.main_pain
        WHEN 'difficulty' THEN v_lead.difficulty
        WHEN 'full_name' THEN v_lead.full_name
        WHEN 'email' THEN v_lead.email
        WHEN 'phone' THEN v_lead.phone
        WHEN 'business_name' THEN v_lead.business_name
        WHEN 'instagram' THEN v_lead.instagram
        WHEN 'knows_specialist_since' THEN v_lead.knows_specialist_since
        ELSE v_lead.custom_fields ->> (v_condition.value->>'field')
      END;

      -- Evaluate the operator
      v_condition_met := CASE (v_condition.value->>'operator')
        WHEN 'equals' THEN
          LOWER(COALESCE(v_field_value, '')) = LOWER(COALESCE(v_condition.value->>'value', ''))
        WHEN 'not_equals' THEN
          LOWER(COALESCE(v_field_value, '')) != LOWER(COALESCE(v_condition.value->>'value', ''))
        WHEN 'greater_than' THEN
          COALESCE(v_field_value, '0')::NUMERIC > COALESCE(v_condition.value->>'value', '0')::NUMERIC
        WHEN 'less_than' THEN
          COALESCE(v_field_value, '0')::NUMERIC < COALESCE(v_condition.value->>'value', '0')::NUMERIC
        WHEN 'contains' THEN
          COALESCE(v_field_value, '') ILIKE '%' || COALESCE(v_condition.value->>'value', '') || '%'
        WHEN 'not_contains' THEN
          COALESCE(v_field_value, '') NOT ILIKE '%' || COALESCE(v_condition.value->>'value', '') || '%'
        ELSE false
      END;

      -- Combine with logic (AND/OR)
      IF COALESCE(v_condition.value->>'logic', 'AND') = 'OR' THEN
        v_match := v_match OR v_condition_met;
      ELSE
        v_match := v_match AND v_condition_met;
      END IF;
    END LOOP;

    -- If rule matched, apply classification and stop
    IF v_match THEN
      UPDATE public.leads
      SET classification = v_rule.classification,
          qualification = v_rule.qualification_label
      WHERE id = p_lead_id;
      RETURN;
    END IF;
  END LOOP;

  -- No rule matched: default to bronze
  UPDATE public.leads
  SET classification = 'bronze',
      qualification = NULL
  WHERE id = p_lead_id
    AND (classification IS NULL);
END;
$function$;

-- Trigger function to auto-qualify leads on insert
CREATE OR REPLACE FUNCTION public.trigger_qualify_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.apply_qualification_rules(NEW.id);
  RETURN NEW;
END;
$function$;

-- Create trigger on leads table
CREATE TRIGGER trg_qualify_lead_after_insert
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_qualify_lead();
