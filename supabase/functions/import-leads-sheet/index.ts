import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ColumnMapping {
  full_name?: string;
  phone?: string;
  email?: string;
  state?: string;
  instagram?: string;
  niche?: string;
  business_name?: string;
  business_position?: string;
  revenue?: string;
  main_pain?: string;
  has_partner?: string;
  knows_specialist_since?: string;
}

interface FunnelData {
  id: string;
  name: string;
  google_sheet_url: string;
  sheet_name: string;
  column_mapping: ColumnMapping | null;
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
}

interface ImportRequest {
  funnelId?: string;
  syncAll?: boolean;
  action?: 'import' | 'fetch-headers' | 'test-connection';
  sheetUrl?: string;
  sheetName?: string;
}

// Base64 URL encoding
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create JWT for Google API authentication
async function createGoogleJWT(email: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claim));
  const signatureInput = `${encodedHeader}.${encodedClaim}`;

  const normalizeServiceAccountPrivateKey = (input: string): string => {
    let raw = (input ?? '').trim();
    // Strip wrapping quotes if the secret was saved as a quoted string
    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }

    // If user pasted the full service-account JSON, extract private_key
    if (raw.startsWith('{') && raw.includes('"private_key"')) {
      try {
        const obj = JSON.parse(raw);
        if (typeof obj?.private_key === 'string') raw = obj.private_key;
      } catch {
        // ignore JSON parse error, continue trying to treat as PEM
      }
    }

    // Turn escaped newlines ("\\n") into actual newlines
    raw = raw.replace(/\\n/g, '\n');

    // Remove any PEM header/footer lines (supports both PRIVATE KEY and RSA PRIVATE KEY)
    raw = raw.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '');

    // Remove all whitespace/newlines
    raw = raw.replace(/\s+/g, '');

    // If the content is base64url, convert to standard base64
    raw = raw.replace(/-/g, '+').replace(/_/g, '/');

    // Ensure correct padding for atob
    const pad = raw.length % 4;
    if (pad) raw += '='.repeat(4 - pad);

    return raw;
  };

  let binaryKey: Uint8Array;
  try {
    const keyBase64 = normalizeServiceAccountPrivateKey(privateKey);
    binaryKey = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  } catch (e) {
    throw new Error(
      `Failed to decode private key. Ensure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is a PEM string (including BEGIN/END lines) or a full service-account JSON. Details: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    (binaryKey.buffer as ArrayBuffer),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${encodedSignature}`;
}

function normalizeServiceAccountEmail(input: string | null | undefined): string {
  let raw = (input ?? '').trim();

  // Strip wrapping quotes if the secret was saved as a quoted string
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim();
  }

  // If user pasted the full service-account JSON here, extract client_email
  if (raw.startsWith('{') && raw.includes('"client_email"')) {
    try {
      const obj = JSON.parse(raw);
      if (typeof obj?.client_email === 'string') raw = obj.client_email;
    } catch {
      // ignore
    }
  }

  return raw;
}

// Get Google access token
async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = await createGoogleJWT(email, privateKey);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Extract spreadsheet ID from URL
function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Fetch sheet headers
async function fetchSheetHeaders(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[]> {
  const encodedSheetName = encodeURIComponent(sheetName);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}!1:1`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch headers: ${error}`);
  }

  const data = await response.json();
  return data.values?.[0] || [];
}

// Fetch all sheet data
async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<string[][]> {
  const encodedSheetName = encodeURIComponent(sheetName);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedSheetName}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch sheet data: ${error}`);
  }

  const data = await response.json();
  return data.values || [];
}

// Parse revenue string to number
function parseRevenue(value: string | undefined): number | null {
  if (!value) return null;
  
  // Remove currency symbols and spaces
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

// Parse boolean from string
function parseBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  
  const lower = value.toLowerCase().trim();
  if (['sim', 'yes', 'true', '1', 's'].includes(lower)) return true;
  if (['não', 'nao', 'no', 'false', '0', 'n'].includes(lower)) return false;
  
  return null;
}

// Map row data to lead object
function mapRowToLead(
  row: string[],
  headers: string[],
  mapping: ColumnMapping,
  funnelId: string,
  rowIndex: number,
  sheetUrl: string
): Record<string, unknown> | null {
  const getColumnValue = (columnName: string | undefined): string | undefined => {
    if (!columnName) return undefined;
    const index = headers.findIndex(h => h.toLowerCase().trim() === columnName.toLowerCase().trim());
    return index >= 0 ? row[index]?.trim() : undefined;
  };

  const fullName = getColumnValue(mapping.full_name);
  
  // full_name is required
  if (!fullName) return null;

  return {
    full_name: fullName,
    phone: getColumnValue(mapping.phone) || null,
    email: getColumnValue(mapping.email) || null,
    state: getColumnValue(mapping.state) || null,
    instagram: getColumnValue(mapping.instagram) || null,
    niche: getColumnValue(mapping.niche) || null,
    business_name: getColumnValue(mapping.business_name) || null,
    business_position: getColumnValue(mapping.business_position) || null,
    revenue: parseRevenue(getColumnValue(mapping.revenue)),
    main_pain: getColumnValue(mapping.main_pain) || null,
    has_partner: parseBoolean(getColumnValue(mapping.has_partner)),
    knows_specialist_since: getColumnValue(mapping.knows_specialist_since) || null,
    funnel_id: funnelId,
    sheet_row_id: `${funnelId}_row_${rowIndex}`,
    sheet_source_url: sheetUrl,
    status: 'novo',
    classification: 'bronze',
    imported_at: new Date().toISOString(),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const serviceEmailRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY');

    if (!serviceEmailRaw || !privateKey) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Google Service Account credentials not configured' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const serviceEmail = normalizeServiceAccountEmail(serviceEmailRaw);
    if (!serviceEmail || !serviceEmail.includes('@')) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Google Service Account email is invalid. Ensure GOOGLE_SERVICE_ACCOUNT_EMAIL is set to the client_email from the service-account JSON.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: ImportRequest = await req.json().catch(() => ({}));
    const { funnelId, syncAll, action, sheetUrl, sheetName } = body;

    console.log('Import leads request:', { funnelId, syncAll, action });

    // Handle test connection
    if (action === 'test-connection' && sheetUrl && sheetName) {
      const spreadsheetId = extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Google Sheets URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);
      await fetchSheetHeaders(accessToken, spreadsheetId, sheetName);

      return new Response(
        JSON.stringify({ success: true, message: 'Connection successful' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle fetch headers
    if (action === 'fetch-headers' && sheetUrl && sheetName) {
      const spreadsheetId = extractSpreadsheetId(sheetUrl);
      if (!spreadsheetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Google Sheets URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);
      const headers = await fetchSheetHeaders(accessToken, spreadsheetId, sheetName);

      return new Response(
        JSON.stringify({ success: true, headers }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch funnels to sync
    let funnelsQuery = supabase
      .from('funnels')
      .select('*')
      .not('google_sheet_url', 'is', null)
      .not('sheet_name', 'is', null)
      .eq('active', true);

    if (funnelId) {
      funnelsQuery = funnelsQuery.eq('id', funnelId);
    } else if (syncAll) {
      funnelsQuery = funnelsQuery.eq('auto_sync_enabled', true);
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'funnelId or syncAll required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: funnels, error: funnelsError } = await funnelsQuery;

    if (funnelsError) {
      throw new Error(`Failed to fetch funnels: ${funnelsError.message}`);
    }

    if (!funnels || funnels.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No funnels to sync', imported: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);
    
    const results: { funnelId: string; funnelName: string; imported: number; skipped: number; errors: string[] }[] = [];

    for (const funnel of funnels as FunnelData[]) {
      const funnelResult = { 
        funnelId: funnel.id, 
        funnelName: funnel.name, 
        imported: 0, 
        skipped: 0, 
        errors: [] as string[] 
      };

      try {
        const spreadsheetId = extractSpreadsheetId(funnel.google_sheet_url);
        if (!spreadsheetId) {
          funnelResult.errors.push('Invalid Google Sheets URL');
          results.push(funnelResult);
          continue;
        }

        if (!funnel.column_mapping) {
          funnelResult.errors.push('Column mapping not configured');
          results.push(funnelResult);
          continue;
        }

        console.log(`Processing funnel: ${funnel.name} (${funnel.id})`);

        const sheetData = await fetchSheetData(accessToken, spreadsheetId, funnel.sheet_name);
        
        if (sheetData.length < 2) {
          funnelResult.errors.push('No data rows found in sheet');
          results.push(funnelResult);
          continue;
        }

        const headers = sheetData[0];
        const dataRows = sheetData.slice(1);

        console.log(`Found ${dataRows.length} rows to process`);

        // Get existing sheet_row_ids for this funnel to check duplicates
        const { data: existingLeads } = await supabase
          .from('leads')
          .select('sheet_row_id')
          .eq('funnel_id', funnel.id)
          .not('sheet_row_id', 'is', null);

        const existingRowIds = new Set(existingLeads?.map(l => l.sheet_row_id) || []);

        const leadsToInsert: Record<string, unknown>[] = [];

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowIndex = i + 2; // Account for header row and 0-indexing
          const sheetRowId = `${funnel.id}_row_${rowIndex}`;

          // Skip if already imported
          if (existingRowIds.has(sheetRowId)) {
            funnelResult.skipped++;
            continue;
          }

          const lead = mapRowToLead(
            row,
            headers,
            funnel.column_mapping,
            funnel.id,
            rowIndex,
            funnel.google_sheet_url
          );

          if (lead) {
            // Additional duplicate check by email or phone
            const phone = lead.phone as string | null;
            const email = lead.email as string | null;
            
            if (phone || email) {
              let duplicateQuery = supabase
                .from('leads')
                .select('id')
                .eq('funnel_id', funnel.id);
              
              if (phone && email) {
                duplicateQuery = duplicateQuery.or(`phone.eq.${phone},email.eq.${email}`);
              } else if (phone) {
                duplicateQuery = duplicateQuery.eq('phone', phone);
              } else if (email) {
                duplicateQuery = duplicateQuery.eq('email', email);
              }

              const { data: duplicates } = await duplicateQuery.limit(1);
              
              if (duplicates && duplicates.length > 0) {
                funnelResult.skipped++;
                continue;
              }
            }

            leadsToInsert.push(lead);
          }
        }

        // Insert leads in batches
        if (leadsToInsert.length > 0) {
          const batchSize = 100;
          for (let i = 0; i < leadsToInsert.length; i += batchSize) {
            const batch = leadsToInsert.slice(i, i + batchSize);
            const { error: insertError } = await supabase
              .from('leads')
              .insert(batch);

            if (insertError) {
              funnelResult.errors.push(`Insert error: ${insertError.message}`);
            } else {
              funnelResult.imported += batch.length;
            }
          }
        }

        // Update last_sync_at
        await supabase
          .from('funnels')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', funnel.id);

        console.log(`Funnel ${funnel.name}: imported ${funnelResult.imported}, skipped ${funnelResult.skipped}`);

      } catch (error) {
        funnelResult.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }

      results.push(funnelResult);
    }

    const totalImported = results.reduce((sum, r) => sum + r.imported, 0);
    const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);

    console.log(`Import complete: ${totalImported} imported, ${totalSkipped} skipped`);

    return new Response(
      JSON.stringify({
        success: true,
        totalImported,
        totalSkipped,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
