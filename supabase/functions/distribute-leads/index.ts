import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DistributeRequest {
  ruleId?: string;
  leadIds?: string[];
  sdrIds?: string[];
  funnelId?: string;
  classifications?: string[];
  limit?: number;
  considerWorkload?: boolean;
  dryRun?: boolean;
}

interface SDRWorkload {
  id: string;
  name: string;
  total: number;
  em_atendimento: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header for user context
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;

    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } }
      });
      const { data: { user } } = await userClient.auth.getUser();
      userId = user?.id || null;
    }

    const body: DistributeRequest = await req.json();
    console.log('Distribution request:', JSON.stringify(body));

    let sdrIds: string[] = [];
    let funnelId: string | null = null;
    let classifications: string[] = [];
    let maxLeadsPerSDR = 50;
    let ruleId: string | null = null;

    // If ruleId provided, load rule configuration
    if (body.ruleId) {
      const { data: rule, error: ruleError } = await supabase
        .from('distribution_rules')
        .select('*')
        .eq('id', body.ruleId)
        .single();

      if (ruleError || !rule) {
        throw new Error('Regra de distribuição não encontrada');
      }

      if (!rule.active) {
        throw new Error('Regra de distribuição está inativa');
      }

      ruleId = rule.id;
      sdrIds = rule.sdr_ids;
      funnelId = rule.funnel_id;
      classifications = rule.classifications || [];
      maxLeadsPerSDR = rule.max_leads_per_sdr || 50;
    } else {
      // Manual distribution
      sdrIds = body.sdrIds || [];
      funnelId = body.funnelId || null;
      classifications = body.classifications || [];
    }

    if (sdrIds.length === 0) {
      throw new Error('Nenhum SDR selecionado para distribuição');
    }

    // Fetch active SDRs with their profiles
    const { data: sdrs, error: sdrsError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .in('id', sdrIds)
      .eq('active', true);

    if (sdrsError) {
      console.error('Error fetching SDRs:', sdrsError);
      throw new Error('Erro ao buscar SDRs');
    }

    if (!sdrs || sdrs.length === 0) {
      throw new Error('Nenhum SDR ativo encontrado');
    }

    console.log(`Found ${sdrs.length} active SDRs`);

    // Get SDR workload (leads em_atendimento)
    const workloadMap: Record<string, SDRWorkload> = {};

    for (const sdr of sdrs) {
      const { count: totalCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_sdr_id', sdr.id);

      const { count: activeCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_sdr_id', sdr.id)
        .eq('status', 'em_atendimento');

      workloadMap[sdr.id] = {
        id: sdr.id,
        name: sdr.name,
        total: totalCount || 0,
        em_atendimento: activeCount || 0,
      };
    }

    console.log('SDR workload:', JSON.stringify(workloadMap));

    // Build query for leads to distribute
    let leadsQuery = supabase
      .from('leads')
      .select('id, full_name, funnel_id, classification')
      .eq('status', 'novo')
      .is('assigned_sdr_id', null);

    // If specific lead IDs provided
    if (body.leadIds && body.leadIds.length > 0) {
      leadsQuery = supabase
        .from('leads')
        .select('id, full_name, funnel_id, classification')
        .in('id', body.leadIds);
    } else {
      // Apply filters
      if (funnelId) {
        leadsQuery = leadsQuery.eq('funnel_id', funnelId);
      }

      if (classifications.length > 0) {
        leadsQuery = leadsQuery.in('classification', classifications);
      }

      if (body.limit) {
        leadsQuery = leadsQuery.limit(body.limit);
      }
    }

    leadsQuery = leadsQuery.order('created_at', { ascending: true });

    const { data: leads, error: leadsError } = await leadsQuery;

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw new Error('Erro ao buscar leads');
    }

    if (!leads || leads.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          distributed: 0,
          assignments: [],
          skipped: 0,
          message: 'Nenhum lead elegível para distribuição',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${leads.length} leads to distribute`);

    // Sort SDRs by workload (ascending - less loaded first)
    const considerWorkload = body.considerWorkload !== false;
    const sortedSDRs = [...sdrs].sort((a, b) => {
      if (!considerWorkload) return 0;
      return workloadMap[a.id].em_atendimento - workloadMap[b.id].em_atendimento;
    });

    // Round-robin distribution with workload balancing
    const assignments: Array<{
      leadId: string;
      leadName: string;
      sdrId: string;
      sdrName: string;
    }> = [];
    let skipped = 0;
    let sdrIndex = 0;

    for (const lead of leads) {
      let assigned = false;
      let attempts = 0;

      // Try each SDR until we find one that can accept the lead
      while (!assigned && attempts < sortedSDRs.length) {
        const sdr = sortedSDRs[sdrIndex];
        const workload = workloadMap[sdr.id];

        // Check if SDR can accept more leads
        if (workload.em_atendimento < maxLeadsPerSDR) {
          assignments.push({
            leadId: lead.id,
            leadName: lead.full_name,
            sdrId: sdr.id,
            sdrName: sdr.name,
          });

          // Update workload tracking
          workload.em_atendimento++;
          workload.total++;
          assigned = true;
        }

        // Move to next SDR (round-robin)
        sdrIndex = (sdrIndex + 1) % sortedSDRs.length;
        attempts++;
      }

      if (!assigned) {
        skipped++;
      }
    }

    console.log(`Assignments: ${assignments.length}, Skipped: ${skipped}`);

    // If dry run, don't actually update
    if (body.dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          distributed: assignments.length,
          assignments,
          skipped,
          dryRun: true,
          message: `Simulação: ${assignments.length} leads seriam distribuídos`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Execute updates
    for (const assignment of assignments) {
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          assigned_sdr_id: assignment.sdrId,
          status: 'em_atendimento',
        })
        .eq('id', assignment.leadId);

      if (updateError) {
        console.error(`Error updating lead ${assignment.leadId}:`, updateError);
      }
    }

    // Create distribution log
    const { data: log, error: logError } = await supabase
      .from('lead_distribution_logs')
      .insert({
        rule_id: ruleId,
        leads_count: assignments.length,
        sdr_ids: sdrIds,
        distribution_mode: ruleId ? 'automatic' : 'manual',
        distributed_by: userId,
        funnel_id: funnelId,
        classifications: classifications.length > 0 ? classifications : null,
        lead_ids: assignments.map(a => a.leadId),
        workload_snapshot: workloadMap,
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Error creating distribution log:', logError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        distributed: assignments.length,
        assignments,
        skipped,
        logId: log?.id,
        message: `${assignments.length} leads distribuídos com sucesso`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Distribution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno ao distribuir leads';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
