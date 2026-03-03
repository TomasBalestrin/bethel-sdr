import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  action: "create" | "update" | "delete";
  appointmentId: string;
  closerEmail?: string;
  eventData?: {
    summary: string;
    description: string;
    start: string;
    end: string;
    attendees?: string[];
  };
}

async function createGoogleJWT(email: string, privateKey: string): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const claimB64 = btoa(JSON.stringify(claim)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signatureInput = `${headerB64}.${claimB64}`;

  const formattedKey = privateKey.replace(/\\n/g, "\n");
  const pemContent = formattedKey.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signatureInput}.${signatureB64}`;
}

async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = await createGoogleJWT(email, privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(data)}`);
  }

  return data.access_token;
}

async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventData: SyncRequest["eventData"]
): Promise<string> {
  if (!eventData) throw new Error("Event data is required");

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: eventData.summary,
        description: eventData.description,
        start: { dateTime: eventData.start, timeZone: "America/Sao_Paulo" },
        end: { dateTime: eventData.end, timeZone: "America/Sao_Paulo" },
        attendees: eventData.attendees?.map((email) => ({ email })) || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: "popup", minutes: 30 },
            { method: "popup", minutes: 10 },
          ],
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to create event: ${JSON.stringify(data)}`);
  }

  console.log("Created calendar event:", data.id);
  return data.id;
}

async function updateCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  eventData: SyncRequest["eventData"]
): Promise<void> {
  if (!eventData) throw new Error("Event data is required");

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: eventData.summary,
        description: eventData.description,
        start: { dateTime: eventData.start, timeZone: "America/Sao_Paulo" },
        end: { dateTime: eventData.end, timeZone: "America/Sao_Paulo" },
        attendees: eventData.attendees?.map((email) => ({ email })) || [],
      }),
    }
  );

  if (!response.ok) {
    const data = await response.json();
    throw new Error(`Failed to update event: ${JSON.stringify(data)}`);
  }

  console.log("Updated calendar event:", eventId);
}

async function deleteCalendarEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const data = await response.json();
    throw new Error(`Failed to delete event: ${JSON.stringify(data)}`);
  }

  console.log("Deleted calendar event:", eventId);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    const googlePrivateKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

    if (!googleEmail || !googlePrivateKey) {
      console.log("Google Calendar credentials not configured, skipping sync");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Google Calendar not configured, sync skipped" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: SyncRequest = await req.json();
    const { action, appointmentId, closerEmail, eventData } = body;

    console.log(`Processing ${action} for appointment ${appointmentId}`);

    // Get appointment details including google_calendar_event_id
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select(`
        *,
        closer:profiles!appointments_closer_profile_fkey(email),
        lead:leads(full_name, phone, email)
      `)
      .eq("id", appointmentId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch appointment: ${fetchError.message}`);
    }

    const calendarId = closerEmail || appointment.closer?.email || "primary";
    const accessToken = await getGoogleAccessToken(googleEmail, googlePrivateKey);

    let result: { eventId?: string } = {};

    switch (action) {
      case "create": {
        if (!eventData) {
          throw new Error("Event data required for create action");
        }
        const eventId = await createCalendarEvent(accessToken, calendarId, eventData);
        
        // Save event ID to database
        await supabase
          .from("appointments")
          .update({ google_calendar_event_id: eventId })
          .eq("id", appointmentId);

        result.eventId = eventId;
        break;
      }

      case "update": {
        const existingEventId = appointment.google_calendar_event_id;
        if (existingEventId && eventData) {
          await updateCalendarEvent(accessToken, calendarId, existingEventId, eventData);
          result.eventId = existingEventId;
        } else if (eventData) {
          // No existing event, create new one
          const eventId = await createCalendarEvent(accessToken, calendarId, eventData);
          await supabase
            .from("appointments")
            .update({ google_calendar_event_id: eventId })
            .eq("id", appointmentId);
          result.eventId = eventId;
        }
        break;
      }

      case "delete": {
        const eventIdToDelete = appointment.google_calendar_event_id;
        if (eventIdToDelete) {
          await deleteCalendarEvent(accessToken, calendarId, eventIdToDelete);
          
          // Clear event ID from database
          await supabase
            .from("appointments")
            .update({ google_calendar_event_id: null })
            .eq("id", appointmentId);
        }
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`Successfully processed ${action} for appointment ${appointmentId}`);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing with Google Calendar:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
