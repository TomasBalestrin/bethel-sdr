import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupRequest {
  bronzeSheetName?: string
  nonfitSheetName?: string
  dryRun?: boolean
  retentionHours?: number
}

interface LeadData {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  state: string | null
  instagram: string | null
  niche: string | null
  business_name: string | null
  business_position: string | null
  revenue: number | null
  main_pain: string | null
  has_partner: boolean | null
  knows_specialist_since: string | null
  classification: string | null
  qualification: string | null
  created_at: string
  updated_at: string
  funnel_id: string | null
  assigned_sdr_id: string | null
  funnel?: { name: string } | null
  assigned_sdr?: { name: string } | null
}

// Generate JWT for Google API authentication
async function createGoogleJWT(email: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  
  const payload = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  }

  const encoder = new TextEncoder()
  
  const base64url = (data: Uint8Array | string): string => {
    const str = typeof data === 'string' ? data : String.fromCharCode(...data)
    return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const headerB64 = base64url(JSON.stringify(header))
  const payloadB64 = base64url(JSON.stringify(payload))
  const signatureInput = `${headerB64}.${payloadB64}`

  // Parse PEM private key
  const pemContents = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signatureInput)
  )

  const signatureB64 = base64url(new Uint8Array(signature))
  
  return `${signatureInput}.${signatureB64}`
}

// Exchange JWT for access token
async function getGoogleAccessToken(email: string, privateKey: string): Promise<string> {
  const jwt = await createGoogleJWT(email, privateKey)
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get Google access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Append rows to Google Sheet
async function appendToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string,
  values: (string | number | boolean | null)[][]
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to append to sheet "${sheetName}": ${error}`)
  }
}

// Format lead data for spreadsheet
function formatLeadForSheet(lead: LeadData): (string | number | boolean | null)[] {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  
  return [
    now, // Data Remoção
    lead.id,
    lead.full_name,
    lead.phone || '',
    lead.email || '',
    lead.state || '',
    lead.instagram || '',
    lead.niche || '',
    lead.business_name || '',
    lead.business_position || '',
    lead.revenue ? Number(lead.revenue) : '',
    lead.main_pain || '',
    lead.has_partner === null ? '' : (lead.has_partner ? 'Sim' : 'Não'),
    lead.knows_specialist_since || '',
    lead.funnel?.name || '',
    lead.assigned_sdr?.name || '',
    new Date(lead.created_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    lead.classification || '',
    lead.qualification || ''
  ]
}

// Determine which sheet the lead should go to
function getDestinationSheet(lead: LeadData, bronzeSheetName: string, nonfitSheetName: string): string {
  if (lead.qualification === 'nao_fit' || lead.classification === 'nao_fit') {
    return nonfitSheetName
  }
  return bronzeSheetName
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user is admin or lider
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (roleError || !roleData || !['admin', 'lider'].includes(roleData.role)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão negada: apenas admin ou líder' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const googleEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const googlePrivateKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
    const spreadsheetId = Deno.env.get('CLEANUP_SPREADSHEET_ID')

    // Validate required secrets
    if (!googleEmail || !googlePrivateKey || !spreadsheetId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing Google API credentials. Please configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and CLEANUP_SPREADSHEET_ID secrets.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    let body: CleanupRequest = {}
    try {
      if (req.method === 'POST') {
        const text = await req.text()
        if (text) {
          body = JSON.parse(text)
        }
      }
    } catch {
      // Empty body is fine, use defaults
    }

    const bronzeSheetName = body.bronzeSheetName || 'Bronze'
    const nonfitSheetName = body.nonfitSheetName || 'Não-Fit'
    const dryRun = body.dryRun || false
    const retentionHours = body.retentionHours || 24

    console.log(`Starting cleanup process - Dry run: ${dryRun}, Retention: ${retentionHours}h`)

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate retention cutoff
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - retentionHours)

    // Fetch eligible leads
    const { data: leads, error: fetchError } = await supabase
      .from('leads')
      .select(`
        *,
        funnel:funnels(name),
        assigned_sdr:profiles!leads_assigned_sdr_id_fkey(name)
      `)
      .or('classification.eq.bronze,qualification.eq.nao_fit,classification.eq.nao_fit')
      .lt('updated_at', cutoffDate.toISOString())

    if (fetchError) {
      console.error('Error fetching leads:', fetchError)
      throw new Error(`Failed to fetch leads: ${fetchError.message}`)
    }

    if (!leads || leads.length === 0) {
      console.log('No leads found for cleanup')
      return new Response(
        JSON.stringify({
          success: true,
          cleaned_count: 0,
          bronze_count: 0,
          nonfit_count: 0,
          sheet_rows_added: 0,
          dry_run: dryRun,
          message: 'No leads eligible for cleanup'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${leads.length} leads eligible for cleanup`)

    // Get Google access token
    let accessToken: string
    try {
      accessToken = await getGoogleAccessToken(googleEmail, googlePrivateKey)
      console.log('Successfully authenticated with Google API')
    } catch (authError) {
      console.error('Google auth error:', authError)
      throw new Error(`Google authentication failed: ${authError instanceof Error ? authError.message : String(authError)}`)
    }

    // Group leads by destination sheet
    const bronzeLeads: LeadData[] = []
    const nonfitLeads: LeadData[] = []

    for (const lead of leads) {
      const destination = getDestinationSheet(lead, bronzeSheetName, nonfitSheetName)
      if (destination === bronzeSheetName) {
        bronzeLeads.push(lead)
      } else {
        nonfitLeads.push(lead)
      }
    }

    console.log(`Bronze leads: ${bronzeLeads.length}, Non-Fit leads: ${nonfitLeads.length}`)

    const errors: string[] = []
    let sheetRowsAdded = 0

    // Process Bronze leads
    if (bronzeLeads.length > 0) {
      try {
        const rows = bronzeLeads.map(formatLeadForSheet)
        if (!dryRun) {
          await appendToSheet(accessToken, spreadsheetId, bronzeSheetName, rows)
        }
        sheetRowsAdded += bronzeLeads.length
        console.log(`Added ${bronzeLeads.length} rows to ${bronzeSheetName} sheet`)
      } catch (sheetError) {
        console.error(`Error adding to ${bronzeSheetName}:`, sheetError)
        errors.push(`Failed to add Bronze leads to sheet: ${sheetError instanceof Error ? sheetError.message : String(sheetError)}`)
      }
    }

    // Process Non-Fit leads
    if (nonfitLeads.length > 0) {
      try {
        const rows = nonfitLeads.map(formatLeadForSheet)
        if (!dryRun) {
          await appendToSheet(accessToken, spreadsheetId, nonfitSheetName, rows)
        }
        sheetRowsAdded += nonfitLeads.length
        console.log(`Added ${nonfitLeads.length} rows to ${nonfitSheetName} sheet`)
      } catch (sheetError) {
        console.error(`Error adding to ${nonfitSheetName}:`, sheetError)
        errors.push(`Failed to add Non-Fit leads to sheet: ${sheetError instanceof Error ? sheetError.message : String(sheetError)}`)
      }
    }

    // If dry run, skip database operations
    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          cleaned_count: leads.length,
          bronze_count: bronzeLeads.length,
          nonfit_count: nonfitLeads.length,
          sheet_rows_added: sheetRowsAdded,
          dry_run: true,
          errors,
          message: 'Dry run completed - no data was modified'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log cleanup and delete leads
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
    
    for (const lead of leads) {
      const sheetName = getDestinationSheet(lead, bronzeSheetName, nonfitSheetName)
      
      try {
        // Insert cleanup log
        const { error: logError } = await supabase
          .from('cleanup_logs')
          .insert({
            lead_id: lead.id,
            lead_data: lead,
            cleanup_reason: lead.qualification === 'nao_fit' || lead.classification === 'nao_fit' 
              ? 'Classificação Não-Fit' 
              : 'Classificação Bronze',
            google_sheet_url: sheetUrl,
            sheet_name: sheetName,
            exported_at: new Date().toISOString()
          })

        if (logError) {
          console.error(`Error logging cleanup for lead ${lead.id}:`, logError)
          errors.push(`Failed to log cleanup for ${lead.full_name}: ${logError.message}`)
          continue
        }

        // Delete lead
        const { error: deleteError } = await supabase
          .from('leads')
          .delete()
          .eq('id', lead.id)

        if (deleteError) {
          console.error(`Error deleting lead ${lead.id}:`, deleteError)
          errors.push(`Failed to delete ${lead.full_name}: ${deleteError.message}`)
        } else {
          console.log(`Successfully cleaned up lead: ${lead.full_name}`)
        }
      } catch (processError) {
        console.error(`Error processing lead ${lead.id}:`, processError)
        errors.push(`Error processing ${lead.full_name}: ${processError instanceof Error ? processError.message : String(processError)}`)
      }
    }

    const cleanedCount = leads.length - errors.filter(e => e.includes('Failed to delete')).length

    console.log(`Cleanup completed: ${cleanedCount} leads cleaned`)

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        cleaned_count: cleanedCount,
        bronze_count: bronzeLeads.length,
        nonfit_count: nonfitLeads.length,
        sheet_rows_added: sheetRowsAdded,
        sheet_url: sheetUrl,
        dry_run: false,
        errors
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Cleanup error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        cleaned_count: 0 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
