import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Constants for pagination
const BATCH_SIZE = 2000; // Process 2000 rows per execution
const INSERT_BATCH_SIZE = 100;

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
  date_column?: string;
}

interface FunnelData {
  id: string;
  name: string;
  google_sheet_url: string;
  sheet_name: string;
  column_mapping: ColumnMapping | null;
  auto_sync_enabled: boolean;
  last_sync_at: string | null;
  import_from_date: string | null;
}

interface ImportRequest {
  funnelId?: string;
  syncAll?: boolean;
  action?: 'import' | 'fetch-headers' | 'test-connection' | 'update-dates';
  sheetUrl?: string;
  sheetName?: string;
  startRow?: number; // For pagination
}

interface ImportResponse {
  success: boolean;
  totalImported?: number;
  totalSkipped?: number;
  hasMore?: boolean;
  nextRow?: number;
  totalRows?: number;
  processedRows?: number;
  results?: Array<{
    funnelId: string;
    funnelName: string;
    imported: number;
    skipped: number;
    errors: string[];
  }>;
  error?: string;
  headers?: string[];
  message?: string;
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

  const normalizeAndParsePrivateKey = (input: string): Uint8Array => {
    let raw = (input ?? '').trim();

    if (
      (raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))
    ) {
      raw = raw.slice(1, -1);
    }

    if (raw.startsWith('{') && raw.includes('private_key')) {
      try {
        const obj = JSON.parse(raw);
        if (typeof obj?.private_key === 'string') raw = obj.private_key;
      } catch {
        const m = raw.match(/"private_key"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (m?.[1]) raw = m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    }

    raw = raw.replace(/\\n/g, '\n');

    const isPKCS1 = raw.includes('-----BEGIN RSA PRIVATE KEY-----');
    const isPKCS8 = raw.includes('-----BEGIN PRIVATE KEY-----');

    raw = raw.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '');
    raw = raw.replace(/\s+/g, '');
    raw = raw.replace(/-/g, '+').replace(/_/g, '/');

    const pad = raw.length % 4;
    if (pad) raw += '='.repeat(4 - pad);

    let binaryKey: Uint8Array;
    try {
      binaryKey = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    } catch (e) {
      throw new Error(`Base64 decode failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    console.log('Private key parsing:', {
      detectedFormat: isPKCS1 ? 'PKCS#1' : isPKCS8 ? 'PKCS#8' : 'unknown/raw',
      base64Length: raw.length,
      binaryLength: binaryKey.length,
    });

    if (isPKCS1 || (!isPKCS8 && !isPKCS1 && binaryKey.length > 0)) {
      if (binaryKey.length > 10) {
        const byte7 = binaryKey[6];
        const byte8 = binaryKey[7];
        
        const looksLikePKCS8 = byte7 === 0x30 && byte8 === 0x0D;
        const looksLikePKCS1 = byte7 === 0x02 && (byte8 === 0x82 || byte8 === 0x81);

        if (looksLikePKCS1 || (isPKCS1 && !looksLikePKCS8)) {
          const pkcs1Length = binaryKey.length;
          const totalLength = 3 + 15 + 4 + pkcs1Length;

          const pkcs8Key = new Uint8Array(4 + totalLength);
          pkcs8Key[0] = 0x30;
          pkcs8Key[1] = 0x82;
          pkcs8Key[2] = (totalLength >> 8) & 0xFF;
          pkcs8Key[3] = totalLength & 0xFF;
          pkcs8Key[4] = 0x02;
          pkcs8Key[5] = 0x01;
          pkcs8Key[6] = 0x00;
          pkcs8Key[7] = 0x30;
          pkcs8Key[8] = 0x0D;
          pkcs8Key.set([0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01], 9);
          pkcs8Key[20] = 0x05;
          pkcs8Key[21] = 0x00;
          pkcs8Key[22] = 0x04;
          pkcs8Key[23] = 0x82;
          pkcs8Key[24] = (pkcs1Length >> 8) & 0xFF;
          pkcs8Key[25] = pkcs1Length & 0xFF;
          pkcs8Key.set(binaryKey, 26);

          return pkcs8Key;
        }
      }
    }

    return binaryKey;
  };

  let binaryKey: Uint8Array;
  try {
    binaryKey = normalizeAndParsePrivateKey(privateKey);
  } catch (e) {
    throw new Error(
      `Failed to decode private key. Ensure GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is the full service-account JSON or the PEM private_key value. Details: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey.buffer as ArrayBuffer,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['sign']
    );
  } catch (e) {
    console.error('Key import failed:', {
      binaryKeyLength: binaryKey.length,
      firstBytes: Array.from(binaryKey.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' '),
      error: e instanceof Error ? e.message : String(e),
    });
    throw new Error(
      `Failed to import private key. The key format may be incorrect. Please ensure you're using the full service-account JSON file content. Error: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)));
  return `${signatureInput}.${encodedSignature}`;
}

function normalizeServiceAccountEmail(input: string | null | undefined): string {
  const stripQuotes = (s: string) => {
    let out = s.trim();
    if (
      (out.startsWith('"') && out.endsWith('"')) ||
      (out.startsWith("'") && out.endsWith("'"))
    ) {
      out = out.slice(1, -1).trim();
    }
    return out;
  };

  const extractClientEmail = (s: string): string | null => {
    const candidate = stripQuotes(s);

    if (candidate.startsWith('{') && candidate.includes('client_email')) {
      try {
        const obj = JSON.parse(candidate);
        if (typeof obj?.client_email === 'string') return obj.client_email.trim();
      } catch {
        // fallthrough to regex extraction
      }

      const m1 = candidate.match(/client_email\s*"?\s*:\s*"([^"]+)"/);
      if (m1?.[1]) return m1[1].trim();
      const m2 = candidate.match(/client_email\s*'?\s*:\s*'([^']+)'/);
      if (m2?.[1]) return m2[1].trim();
    }

    return null;
  };

  let raw = stripQuotes(input ?? '');

  const extracted = extractClientEmail(raw);
  if (extracted) return extracted;

  if (!raw.includes('@') && /^[A-Za-z0-9+/=_-]+$/.test(raw) && raw.length > 80) {
    try {
      let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      const decoded = atob(b64);
      const extractedFromDecoded = extractClientEmail(decoded);
      if (extractedFromDecoded) return extractedFromDecoded;
      if (decoded.includes('@')) return stripQuotes(decoded);
    } catch {
      // ignore
    }
  }

  return raw;
}

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

function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

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

// Fetch sheet data with optional range for pagination
async function fetchSheetData(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  startRow?: number,
  endRow?: number
): Promise<{ rows: string[][]; totalRows: number }> {
  const encodedSheetName = encodeURIComponent(sheetName);
  
  // First, get the total row count
  const metadataResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,gridProperties(rowCount)))`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!metadataResponse.ok) {
    const error = await metadataResponse.text();
    throw new Error(`Failed to fetch sheet metadata: ${error}`);
  }

  const metadata = await metadataResponse.json();
  const sheet = metadata.sheets?.find((s: { properties: { title: string } }) => 
    s.properties.title === sheetName
  );
  const totalRows = sheet?.properties?.gridProperties?.rowCount || 0;

  // Build range for data fetch
  let range = encodedSheetName;
  if (startRow !== undefined && endRow !== undefined) {
    range = `${encodedSheetName}!A${startRow}:ZZ${endRow}`;
  }

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch sheet data: ${error}`);
  }

  const data = await response.json();
  return { rows: data.values || [], totalRows };
}

function parseRevenue(value: string | undefined): number | null {
  if (!value) return null;
  const cleaned = value.replace(/[R$\s.]/g, '').replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

function parseBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  if (['sim', 'yes', 'true', '1', 's'].includes(lower)) return true;
  if (['não', 'nao', 'no', 'false', '0', 'n'].includes(lower)) return false;
  return null;
}

// Parse date from various formats
function parseLeadDate(value: string | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Google Sheets serial number (days since 1899-12-30)
  const serial = Number(trimmed);
  if (!isNaN(serial) && serial > 1000 && serial < 100000) {
    const epoch = new Date(1899, 11, 30);
    epoch.setDate(epoch.getDate() + serial);
    return epoch;
  }

  // DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // MM/DD/YYYY
  const usMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    if (month > 12) return null; // already handled as DD/MM above
    const d = new Date(Number(usMatch[3]), month - 1, Number(usMatch[2]));
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback: native Date parse
  const fallback = new Date(trimmed);
  if (!isNaN(fallback.getTime())) return fallback;

  return null;
}

// Normalize business_position to match database constraint ('dono' or 'nao_dono')
function normalizeBusinessPosition(value: string | undefined): string | null {
  if (!value) return null;
  const lower = value.toLowerCase().trim();
  
  // Variations of "dono" (owner)
  if (lower.includes('dono') && !lower.includes('não') && !lower.includes('nao')) {
    return 'dono';
  }
  
  // Variations of "não dono" (not owner)
  if (lower.includes('não dono') || lower.includes('nao dono') || 
      lower === 'não' || lower === 'nao' || lower === 'n') {
    return 'nao_dono';
  }
  
  // Affirmative responses = owner
  if (['sim', 'yes', 's', 'true', '1'].includes(lower)) {
    return 'dono';
  }
  
  // If unidentified, return null (accepted by database)
  return null;
}

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
  if (!fullName) return null;

  return {
    full_name: fullName,
    phone: getColumnValue(mapping.phone) || null,
    email: getColumnValue(mapping.email) || null,
    state: getColumnValue(mapping.state) || null,
    instagram: getColumnValue(mapping.instagram) || null,
    niche: getColumnValue(mapping.niche) || null,
    business_name: getColumnValue(mapping.business_name) || null,
    business_position: normalizeBusinessPosition(getColumnValue(mapping.business_position)),
    revenue: parseRevenue(getColumnValue(mapping.revenue)),
    main_pain: getColumnValue(mapping.main_pain) || null,
    has_partner: parseBoolean(getColumnValue(mapping.has_partner)),
    knows_specialist_since: getColumnValue(mapping.knows_specialist_since) || null,
    funnel_id: funnelId,
    sheet_row_id: `${funnelId}_row_${rowIndex}`,
    sheet_source_url: sheetUrl,
    status: 'novo',
    classification: null,
    imported_at: new Date().toISOString(),
    form_filled_at: (() => {
      const dateVal = getColumnValue(mapping.date_column);
      const parsed = dateVal ? parseLeadDate(dateVal) : null;
      return parsed ? parsed.toISOString() : null;
    })(),
  };
}

// Fetch existing duplicates in batch (optimized)
// deno-lint-ignore no-explicit-any
async function fetchExistingDuplicates(
  supabase: any,
  funnelId: string
): Promise<{ sheetRowIds: Set<string>; emails: Set<string>; phones: Set<string> }> {
  console.log('Fetching existing leads for deduplication...');
  
  // Fetch all in parallel
  const [sheetRowResult, emailResult, phoneResult] = await Promise.all([
    supabase
      .from('leads')
      .select('sheet_row_id')
      .eq('funnel_id', funnelId)
      .not('sheet_row_id', 'is', null),
    supabase
      .from('leads')
      .select('email')
      .eq('funnel_id', funnelId)
      .not('email', 'is', null),
    supabase
      .from('leads')
      .select('phone')
      .eq('funnel_id', funnelId)
      .not('phone', 'is', null),
  ]);

  const sheetRowIds = new Set<string>(
    ((sheetRowResult.data || []) as Array<{ sheet_row_id: string | null }>)
      .map(l => l.sheet_row_id)
      .filter((v): v is string => Boolean(v))
  );
  const emails = new Set<string>(
    ((emailResult.data || []) as Array<{ email: string | null }>)
      .map(l => l.email?.toLowerCase())
      .filter((v): v is string => Boolean(v))
  );
  const phones = new Set<string>(
    ((phoneResult.data || []) as Array<{ phone: string | null }>)
      .map(l => l.phone)
      .filter((v): v is string => Boolean(v))
  );

  console.log(`Found ${sheetRowIds.size} sheet_row_ids, ${emails.size} emails, ${phones.size} phones`);
  
  return { sheetRowIds, emails, phones };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin or lider
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData || !['admin', 'lider'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão negada: apenas admin ou líder' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
          error: 'Google Service Account email is invalid.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body: ImportRequest = await req.json().catch(() => ({}));
    const { funnelId, syncAll, action, sheetUrl, sheetName, startRow = 2 } = body;

    console.log('Import leads request:', { funnelId, syncAll, action, startRow });

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

    // Handle update-dates action (backfill form_filled_at for existing leads)
    if (action === 'update-dates' && funnelId) {
      // Fetch the funnel
      const { data: funnelData, error: funnelError } = await supabase
        .from('funnels')
        .select('*')
        .eq('id', funnelId)
        .single();

      if (funnelError || !funnelData) {
        return new Response(
          JSON.stringify({ success: false, error: 'Funnel not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        );
      }

      const funnel = funnelData as FunnelData;
      if (!funnel.google_sheet_url || !funnel.sheet_name || !funnel.column_mapping) {
        return new Response(
          JSON.stringify({ success: false, error: 'Funnel not fully configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const dateColumnName = funnel.column_mapping.date_column;
      if (!dateColumnName) {
        return new Response(
          JSON.stringify({ success: false, error: 'No date column mapped for this funnel' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const spreadsheetId = extractSpreadsheetId(funnel.google_sheet_url);
      if (!spreadsheetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Google Sheets URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const accessTokenForUpdate = await getGoogleAccessToken(serviceEmail, privateKey);
      const headers = await fetchSheetHeaders(accessTokenForUpdate, spreadsheetId, funnel.sheet_name);
      
      const endRow = startRow + BATCH_SIZE - 1;
      const { rows: dataRows, totalRows } = await fetchSheetData(
        accessTokenForUpdate, spreadsheetId, funnel.sheet_name, startRow, endRow
      );

      console.log(`[update-dates] Funnel ${funnel.name}: fetched ${dataRows.length} rows (${startRow}-${endRow}), total: ${totalRows}`);

      if (dataRows.length === 0) {
        return new Response(
          JSON.stringify({ success: true, totalUpdated: 0, hasMore: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const dateColIndex = headers.findIndex(h => h.toLowerCase().trim() === dateColumnName.toLowerCase().trim());
      if (dateColIndex < 0) {
        return new Response(
          JSON.stringify({ success: false, error: `Date column "${dateColumnName}" not found in sheet headers` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Build updates: collect sheet_row_id -> parsed date
      const updates: { sheetRowId: string; formFilledAt: string }[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const absoluteRowIndex = startRow + i;
        const sheetRowId = `${funnel.id}_row_${absoluteRowIndex}`;
        const dateValue = row[dateColIndex]?.trim();
        const parsedDate = dateValue ? parseLeadDate(dateValue) : null;
        if (parsedDate) {
          updates.push({ sheetRowId, formFilledAt: parsedDate.toISOString() });
        }
      }

      console.log(`[update-dates] ${updates.length} rows have valid dates out of ${dataRows.length}`);

      // Batch update: process in chunks
      let totalUpdated = 0;
      const UPDATE_CHUNK = 100;
      for (let i = 0; i < updates.length; i += UPDATE_CHUNK) {
        const chunk = updates.slice(i, i + UPDATE_CHUNK);
        const sheetRowIds = chunk.map(u => u.sheetRowId);

        // Fetch leads that need updating (form_filled_at IS NULL)
        const { data: existingLeads } = await supabase
          .from('leads')
          .select('id, sheet_row_id')
          .in('sheet_row_id', sheetRowIds)
          .is('form_filled_at', null);

        if (existingLeads && existingLeads.length > 0) {
          const leadMap = new Map(existingLeads.map((l: { id: string; sheet_row_id: string }) => [l.sheet_row_id, l.id]));
          
          for (const update of chunk) {
            const leadId = leadMap.get(update.sheetRowId);
            if (leadId) {
              const { error: updateError } = await supabase
                .from('leads')
                .update({ form_filled_at: update.formFilledAt })
                .eq('id', leadId);
              
              if (!updateError) totalUpdated++;
            }
          }
        }
      }

      const processedUpTo = startRow + dataRows.length - 1;
      const hasMore = processedUpTo < totalRows - 1;
      const nextRow = hasMore ? processedUpTo + 1 : undefined;

      console.log(`[update-dates] Updated ${totalUpdated} leads, hasMore: ${hasMore}`);

      return new Response(
        JSON.stringify({
          success: true,
          totalUpdated,
          hasMore,
          nextRow,
          totalRows: totalRows - 1,
          processedRows: processedUpTo - 1,
        }),
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
        JSON.stringify({ success: true, message: 'No funnels to sync', totalImported: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getGoogleAccessToken(serviceEmail, privateKey);
    
    // For single funnel sync with pagination
    if (funnelId && funnels.length === 1) {
      const funnel = funnels[0] as FunnelData;
      
      const spreadsheetId = extractSpreadsheetId(funnel.google_sheet_url);
      if (!spreadsheetId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid Google Sheets URL' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      if (!funnel.column_mapping) {
        return new Response(
          JSON.stringify({ success: false, error: 'Column mapping not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log(`Processing funnel: ${funnel.name} (${funnel.id}) starting from row ${startRow}`);

      // Fetch headers (row 1)
      const headers = await fetchSheetHeaders(accessToken, spreadsheetId, funnel.sheet_name);
      
      // Calculate end row for this batch
      const endRow = startRow + BATCH_SIZE - 1;
      
      // Fetch data for this batch
      const { rows: dataRows, totalRows } = await fetchSheetData(
        accessToken, 
        spreadsheetId, 
        funnel.sheet_name,
        startRow,
        endRow
      );

      console.log(`Fetched ${dataRows.length} rows (${startRow}-${endRow}), total rows in sheet: ${totalRows}`);

      if (dataRows.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            totalImported: 0, 
            totalSkipped: 0,
            hasMore: false,
            message: 'No more rows to process'
          } as ImportResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch all existing duplicates in batch (3 queries instead of N)
      const { sheetRowIds, emails, phones } = await fetchExistingDuplicates(supabase, funnel.id);

      let imported = 0;
      let skipped = 0;
      const leadsToInsert: Record<string, unknown>[] = [];

      // Parse import_from_date for date filtering
      const importFromDate = funnel.import_from_date ? new Date(funnel.import_from_date + 'T00:00:00') : null;
      const dateColumnName = funnel.column_mapping.date_column;
      let dateFiltered = 0;

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const absoluteRowIndex = startRow + i; // Actual row number in sheet
        const sheetRowId = `${funnel.id}_row_${absoluteRowIndex}`;

        // Skip if already imported by sheet_row_id (O(1) lookup)
        if (sheetRowIds.has(sheetRowId)) {
          skipped++;
          continue;
        }

        // Date filter: skip rows older than import_from_date
        if (importFromDate && dateColumnName) {
          const dateColIndex = headers.findIndex(h => h.toLowerCase().trim() === dateColumnName.toLowerCase().trim());
          if (dateColIndex >= 0) {
            const rowDate = parseLeadDate(row[dateColIndex]);
            if (rowDate && rowDate < importFromDate) {
              dateFiltered++;
              skipped++;
              continue;
            }
          }
        }

        const lead = mapRowToLead(
          row,
          headers,
          funnel.column_mapping,
          funnel.id,
          absoluteRowIndex,
          funnel.google_sheet_url
        );

        if (lead) {
          const email = (lead.email as string)?.toLowerCase();
          const phone = lead.phone as string;

          // Check duplicates by email or phone (O(1) lookup)
          if ((email && emails.has(email)) || (phone && phones.has(phone))) {
            skipped++;
            continue;
          }

          // Add to pending insert and update local sets
          leadsToInsert.push(lead);
          if (email) emails.add(email);
          if (phone) phones.add(phone);
          sheetRowIds.add(sheetRowId);
        }
      }

      console.log(`Date filtered: ${dateFiltered} rows skipped by date filter`);

      // Insert leads in batches
      if (leadsToInsert.length > 0) {
        console.log(`Inserting ${leadsToInsert.length} leads in batches of ${INSERT_BATCH_SIZE}`);
        
        for (let i = 0; i < leadsToInsert.length; i += INSERT_BATCH_SIZE) {
          const batch = leadsToInsert.slice(i, i + INSERT_BATCH_SIZE);
          const { error: insertError } = await supabase
            .from('leads')
            .insert(batch);

          if (insertError) {
            console.error(`Insert error for batch ${i / INSERT_BATCH_SIZE + 1}:`, insertError.message);
          } else {
            imported += batch.length;
          }
        }
      }

      // Check if there are more rows to process
      const processedUpTo = startRow + dataRows.length - 1;
      const hasMore = processedUpTo < totalRows - 1; // -1 because row 1 is header
      const nextRow = hasMore ? processedUpTo + 1 : undefined;

      // Update last_sync_at only when complete
      if (!hasMore) {
        await supabase
          .from('funnels')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', funnel.id);
      }

      console.log(`Batch complete: imported ${imported}, skipped ${skipped}, hasMore: ${hasMore}`);

      const response: ImportResponse = {
        success: true,
        totalImported: imported,
        totalSkipped: skipped,
        hasMore,
        nextRow,
        totalRows: totalRows - 1, // Exclude header row
        processedRows: processedUpTo - 1, // Rows processed so far (excluding header)
      };

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For syncAll - process each funnel (simplified, no pagination for syncAll)
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

        const headers = await fetchSheetHeaders(accessToken, spreadsheetId, funnel.sheet_name);
        const { rows: allRows } = await fetchSheetData(accessToken, spreadsheetId, funnel.sheet_name);
        
        if (allRows.length < 2) {
          funnelResult.errors.push('No data rows found in sheet');
          results.push(funnelResult);
          continue;
        }

        const dataRows = allRows.slice(1); // Skip header

        // Fetch duplicates in batch
        const { sheetRowIds, emails, phones } = await fetchExistingDuplicates(supabase, funnel.id);

        const leadsToInsert: Record<string, unknown>[] = [];

        // Parse import_from_date for date filtering
        const importFromDate = funnel.import_from_date ? new Date(funnel.import_from_date + 'T00:00:00') : null;
        const dateColumnName = funnel.column_mapping.date_column;

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i];
          const rowIndex = i + 2;
          const sheetRowId = `${funnel.id}_row_${rowIndex}`;

          if (sheetRowIds.has(sheetRowId)) {
            funnelResult.skipped++;
            continue;
          }

          // Date filter
          if (importFromDate && dateColumnName) {
            const dateColIndex = headers.findIndex(h => h.toLowerCase().trim() === dateColumnName.toLowerCase().trim());
            if (dateColIndex >= 0) {
              const rowDate = parseLeadDate(row[dateColIndex]);
              if (rowDate && rowDate < importFromDate) {
                funnelResult.skipped++;
                continue;
              }
            }
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
            const email = (lead.email as string)?.toLowerCase();
            const phone = lead.phone as string;

            if ((email && emails.has(email)) || (phone && phones.has(phone))) {
              funnelResult.skipped++;
              continue;
            }

            leadsToInsert.push(lead);
            if (email) emails.add(email);
            if (phone) phones.add(phone);
            sheetRowIds.add(sheetRowId);
          }
        }

        // Insert in batches
        for (let i = 0; i < leadsToInsert.length; i += INSERT_BATCH_SIZE) {
          const batch = leadsToInsert.slice(i, i + INSERT_BATCH_SIZE);
          const { error: insertError } = await supabase
            .from('leads')
            .insert(batch);

          if (insertError) {
            funnelResult.errors.push(`Insert error: ${insertError.message}`);
          } else {
            funnelResult.imported += batch.length;
          }
        }

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
