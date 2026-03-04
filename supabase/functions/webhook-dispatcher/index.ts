import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event_type: string;
  organization_id: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Generate HMAC-SHA256 signature for webhook payload
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function deliverWebhook(
  subscription: { id: string; target_url: string; secret: string; headers: Record<string, string> },
  payload: WebhookPayload,
  supabase: ReturnType<typeof createClient>
): Promise<{ delivered: boolean; status?: number; body?: string }> {
  const payloadStr = JSON.stringify(payload);
  const signature = await generateSignature(payloadStr, subscription.secret);

  try {
    const response = await fetch(subscription.target_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': payload.event_type,
        'X-Webhook-Timestamp': payload.timestamp,
        ...(subscription.headers || {}),
      },
      body: payloadStr,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const responseBody = await response.text().catch(() => '');

    // Log the delivery
    await supabase.from('webhook_logs').insert({
      subscription_id: subscription.id,
      organization_id: payload.organization_id,
      event_type: payload.event_type,
      payload: payload,
      response_status: response.status,
      response_body: responseBody.slice(0, 1000),
      delivered: response.ok,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    });

    return { delivered: response.ok, status: response.status, body: responseBody };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    await supabase.from('webhook_logs').insert({
      subscription_id: subscription.id,
      organization_id: payload.organization_id,
      event_type: payload.event_type,
      payload: payload,
      response_status: 0,
      response_body: errorMsg,
      delivered: false,
      attempts: 1,
      last_attempt_at: new Date().toISOString(),
    });

    return { delivered: false, body: errorMsg };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // This function can be called:
    // 1. Internally by other Edge Functions (with service key)
    // 2. By authenticated admin users to test webhooks

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { event_type, organization_id, data } = body;

    if (!event_type || !organization_id || !data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: event_type, organization_id, data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch active subscriptions for this org + event
    const { data: subscriptions, error: subError } = await supabase
      .from('webhook_subscriptions')
      .select('id, target_url, secret, headers')
      .eq('organization_id', organization_id)
      .eq('event_type', event_type)
      .eq('active', true);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      throw new Error('Failed to fetch webhook subscriptions');
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, dispatched: 0, message: 'No active subscriptions for this event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload: WebhookPayload = {
      event_type,
      organization_id,
      data,
      timestamp: new Date().toISOString(),
    };

    // Deliver to all subscriptions in parallel
    const results = await Promise.allSettled(
      subscriptions.map(sub => deliverWebhook(sub, payload, supabase))
    );

    const delivered = results.filter(
      r => r.status === 'fulfilled' && r.value.delivered
    ).length;

    const failed = results.length - delivered;

    console.log(`Webhook dispatch: ${delivered} delivered, ${failed} failed for event ${event_type}`);

    return new Response(
      JSON.stringify({
        success: true,
        dispatched: subscriptions.length,
        delivered,
        failed,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook dispatcher error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
