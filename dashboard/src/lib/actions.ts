'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@clerk/nextjs/server'
import { getSupabaseWithRLS } from '@/lib/supabase-server'
import { encrypt, decrypt } from '@/lib/encryption'
import { Database } from '@/types/supabase'

type UserSettings = Database['public']['Tables']['user_settings']['Row']

export interface ActionResponse {
  success: boolean
  message: string
  runId?: string
  error?: string
}

export interface RiskItem {
  url: string
  risk_score: number
  status: 'CRITICAL' | 'BRITTLE' | 'STABLE'
  recommendation: string
}

export interface CrawlRecord {
  id: string
  url: string
  report_path: string
  timestamp: string
}

export interface AutomationStep {
  action: 'click' | 'input' | 'navigate' | 'wait' | 'scrape' | 'hover'
  selector?: string
  value?: string
  url?: string
  description?: string
}

interface TestContext {
  baseUrl: string
  testData?: Record<string, unknown>
}

interface ProviderRequestBody {
  model?: string
  messages?: Array<{ role: string; content: string }>
  max_tokens?: number
  [key: string]: unknown
}

const PROVIDER_STRATEGIES: Record<
  string,
  {
    url: string
    method: 'GET' | 'POST'
    headers: (key: string) => Record<string, string>
    body?: ProviderRequestBody
  }
> = {
  openai: {
    url: 'https://api.openai.com/v1/models',
    method: 'GET',
    headers: key => ({ Authorization: `Bearer ${key}` }),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/models',
    method: 'GET',
    headers: key => ({ Authorization: `Bearer ${key}` }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    method: 'POST',
    headers: key => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'dangerously-allow-browser': 'true',
    }),
    body: {
      messages: [{ role: 'user', content: 'Hi' }],
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
    },
  },
  sonar: {
    url: 'https://api.perplexity.ai/chat/completions',
    method: 'POST',
    headers: key => ({
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    }),
    body: {
      model: 'sonar',
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 1,
    },
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models',
    method: 'GET',
    headers: () => ({}),
  },
}

async function getUserSettings(
  supabase: Awaited<ReturnType<typeof getSupabaseWithRLS>>['supabase'],
  userId: string
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error('SETTINGS_NOT_FOUND')
  return data
}

function getProviderKey(settings: UserSettings, provider: string): string | null {
  const keyMap: Record<string, string | null> = {
    openai: settings.encrypted_openai_key,
    gemini: settings.encrypted_gemini_key,
    groq: settings.encrypted_groq_key,
    anthropic: settings.encrypted_anthropic_key,
    sonar: settings.encrypted_perplexity_key,
  }
  return keyMap[provider] ?? null
}

type WorkerPayloadBase = {
  run_id: string
  user_id: string
  api_key: string
  provider: string
  model?: string
  telemetry_enabled: boolean
}

type SniperPayload = WorkerPayloadBase & {
  mode: 'sniper' | 'chaos'
  instructions: string
  context: {
    baseUrl: string
    testData?: Record<string, unknown>
  }
}

type ScoutPayload = WorkerPayloadBase & {
  mode: 'scout'
  url: string
  credentials?: {
    username?: string
    password?: string
  }
}

type ReplayPayload = WorkerPayloadBase & {
  mode: 'replay'
  steps: AutomationStep[]
  context: TestContext
}

type WorkerPayload = SniperPayload | ScoutPayload | ReplayPayload

async function dispatchToWorker(payload: WorkerPayload): Promise<void> {
  try {
    const workerUrl = process.env.AI_WORKER_URL
    if (!workerUrl) {
      throw new Error('AI_WORKER_URL environment variable not configured')
    }

    const jsonString = JSON.stringify(payload)
    const base64Payload = Buffer.from(jsonString).toString('base64')

    const response = await fetch(`${workerUrl}/mission`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [base64Payload] }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Worker dispatch failed: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    console.log('✅ Worker dispatched:', result)
  } catch (error) {
    console.error('❌ Failed to dispatch to worker:', error)
    throw error
  }
}

function createErrorResponse(err: unknown, defaultMessage: string): ActionResponse {
  const errMsg = err instanceof Error ? err.message : String(err)
  console.error(`[Action Error] ${defaultMessage}:`, err)
  return { success: false, message: defaultMessage, error: errMsg }
}

async function createTestRun(
  supabase: Awaited<ReturnType<typeof getSupabaseWithRLS>>['supabase'],
  userId: string,
  url: string,
  intent: string,
  mode: string
) {
  const { data, error } = await supabase
    .from('test_runs')
    .insert({ user_id: userId, url, intent, status: 'QUEUED', mode })
    .select('id')
    .single()

  if (error) {
    // THIS IS THE SMOKING GUN:
    console.error('❌ SUPABASE DB ERROR:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    })
    throw new Error(`Test run registration failed: ${error.message}`)
  }

  if (!data) throw new Error('Test run registration failed: No data returned')
  return data.id
}

export async function saveVault(formData: FormData): Promise<ActionResponse> {
  try {
    const { supabase, userId } = await getSupabaseWithRLS()

    const { data: existing, error: fetchError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (fetchError) throw fetchError

    const resolveKey = (fieldName: string, existingKey?: string | null): string | null => {
      const newValue = formData.get(fieldName)?.toString().trim()
      return newValue ? encrypt(newValue) : (existingKey ?? null)
    }

    const settingsData = {
      user_id: userId,
      encrypted_openai_key: resolveKey('openai_key', existing?.encrypted_openai_key),
      encrypted_gemini_key: resolveKey('gemini_key', existing?.encrypted_gemini_key),
      encrypted_groq_key: resolveKey('groq_key', existing?.encrypted_groq_key),
      encrypted_anthropic_key: resolveKey('anthropic_key', existing?.encrypted_anthropic_key),
      encrypted_perplexity_key: resolveKey('perplexity_key', existing?.encrypted_perplexity_key),
      preferred_provider:
        (formData.get('preferred_provider') as string) || existing?.preferred_provider || 'openai',
      telemetry_enabled: existing?.telemetry_enabled ?? true,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error } = await supabase
        .from('user_settings')
        .update(settingsData)
        .eq('user_id', userId)

      if (error) throw error
    } else {
      const { error } = await supabase.from('user_settings').insert(settingsData)

      if (error) throw error
    }

    revalidatePath('/settings')
    return { success: true, message: 'Vault secured successfully.' }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Error saving vault')
  }
}

export async function getVaultStatus() {
  const { userId } = await auth()
  if (!userId) {
    return {
      keys: { openai: false, gemini: false, groq: false, anthropic: false, sonar: false },
      preferred: 'gemini',
      telemetry_enabled: true,
    }
  }

  try {
    const { supabase } = await getSupabaseWithRLS()
    const { data: settings } = await supabase.from('user_settings').select('*').maybeSingle()

    return {
      keys: {
        openai: !!settings?.encrypted_openai_key,
        gemini: !!settings?.encrypted_gemini_key,
        groq: !!settings?.encrypted_groq_key,
        anthropic: !!settings?.encrypted_anthropic_key,
        sonar: !!settings?.encrypted_perplexity_key,
      },
      preferred: settings?.preferred_provider || 'gemini',
      telemetry_enabled: settings?.telemetry_enabled ?? true,
    }
  } catch (error) {
    console.error('Failed to get vault status:', error)
    return {
      keys: { openai: false, gemini: false, groq: false, anthropic: false, sonar: false },
      preferred: 'gemini',
      telemetry_enabled: true,
    }
  }
}

export async function runTest(formData: FormData): Promise<ActionResponse> {
  try {
    const { supabase, userId } = await getSupabaseWithRLS()
    const settings = await getUserSettings(supabase, userId)
    const url = formData.get('url') as string
    const isChaos = formData.get('is_chaos') === 'on'
    const provider = (formData.get('provider') as string) || 'groq'
    const model = (formData.get('model') as string) || 'llama-3.1-70b-versatile'
    const testDataRaw = (formData.get('test_data') as string) || '{}'
    const rawIntent = formData.get('intent') as string

    let testDataObject = {}
    try {
      testDataObject = JSON.parse(testDataRaw)
    } catch {
      console.error('Invalid test data JSON, using empty object')
    }

    const intent = `
      <mission_context>
      - BASE_URL: "${url}"
      - INJECTION_DATA: ${testDataRaw || '{}'}
      </mission_context>

      <user_intent>
      ${rawIntent}
      </user_intent>
      `.trim()

    const encryptedKey = getProviderKey(settings, provider)
    if (!encryptedKey) {
      return {
        success: false,
        message: `Access Denied: No encrypted key found for ${provider.toUpperCase()}.`,
      }
    }

    const runId = await createTestRun(supabase, userId, url, intent, isChaos ? 'chaos' : 'sniper')

    await dispatchToWorker({
      user_id: userId,
      run_id: runId,
      api_key: encryptedKey,
      provider,
      model,
      mode: isChaos ? 'chaos' : 'sniper',
      instructions: intent,
      context: { baseUrl: url, testData: testDataObject },
      telemetry_enabled: settings.telemetry_enabled ?? true,
    })

    revalidatePath('/')
    return { success: true, message: 'Mission Launched', runId }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Launch Failed')
  }
}

export async function runScoutMission(
  url: string,
  username?: string,
  password?: string
): Promise<ActionResponse> {
  try {
    const { supabase, userId } = await getSupabaseWithRLS()
    const settings = await getUserSettings(supabase, userId)

    const runId = await createTestRun(
      supabase,
      userId,
      url,
      'AUTONOMOUS SCOUT: Discovering site structure.',
      'scout'
    )

    const provider = settings.preferred_provider || 'gemini'
    const encryptedKey = getProviderKey(settings, provider) || settings.encrypted_gemini_key

    if (!encryptedKey) {
      return {
        success: false,
        message: 'Access Denied: No API key configured for scout mode.',
      }
    }

    const model =
      provider === 'groq'
        ? 'llama-3.1-70b-versatile'
        : provider === 'openai'
          ? 'gpt-4o-mini'
          : 'gemini-1.5-flash'

    await dispatchToWorker({
      user_id: userId,
      run_id: runId,
      api_key: encryptedKey,
      provider,
      model,
      mode: 'scout',
      url,
      credentials: { username, password },
      telemetry_enabled: settings.telemetry_enabled ?? true,
    })

    revalidatePath('/crawler')
    return { success: true, message: 'Scout drone launched.', runId }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Scout Launch Failed')
  }
}

export async function getRiskHeatmap(): Promise<RiskItem[]> {
  try {
    const { supabase } = await getSupabaseWithRLS()

    const { data, error } = await supabase
      .from('execution_logs')
      .select('status, test_runs!inner(url)')
      .limit(100)

    if (error || !data) return []

    const stats: Record<string, { total: number; weight: number }> = {}

    data.forEach(log => {
      const testRun = Array.isArray(log.test_runs) ? log.test_runs[0] : log.test_runs
      const url = testRun?.url

      if (!url) return

      if (!stats[url]) stats[url] = { total: 0, weight: 0 }
      stats[url].total += 1
      if (log.status === 'FAILED') stats[url].weight += 70
      if (log.status === 'HEALED') stats[url].weight += 30
    })

    return Object.entries(stats)
      .map(([url, val]): RiskItem => {
        const score = Math.min(Math.round(val.weight / val.total), 100)
        const status = (
          score > 60 ? 'CRITICAL' : score > 25 ? 'BRITTLE' : 'STABLE'
        ) as RiskItem['status']

        return {
          url,
          risk_score: score,
          status,
          recommendation: score > 60 ? 'Immediate Logic Audit' : 'Selector Optimization',
        }
      })
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 5)
  } catch (error) {
    console.error('Failed to get risk heatmap:', error)
    return []
  }
}

export async function saveRunToRegistry(runId: string, testName: string): Promise<ActionResponse> {
  try {
    const { supabase } = await getSupabaseWithRLS()

    const { data: run, error: runError } = await supabase
      .from('test_runs')
      .select('*')
      .eq('id', runId)
      .single()

    if (runError || !run) {
      return { success: false, message: 'Run not found', error: runError?.message }
    }

    const { error: insertError } = await supabase.from('saved_tests').insert({
      user_id: run.user_id,
      name: testName,
      intent: run.intent,
      url: run.url,
      run_id: run.id,
      steps_json: {},
    })

    if (insertError) throw insertError

    revalidatePath('/registry')
    return { success: true, message: 'Promoted to Golden Path.' }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Registry Save Failed')
  }
}

export async function runSavedTest(testId: string): Promise<ActionResponse> {
  try {
    const { supabase, userId } = await getSupabaseWithRLS()
    const settings = await getUserSettings(supabase, userId)

    const { data: blueprint, error: blueprintError } = await supabase
      .from('saved_tests')
      .select('*')
      .eq('id', Number(testId))
      .single()

    if (blueprintError || !blueprint) {
      return { success: false, message: 'Blueprint not found.' }
    }

    if (!blueprint.url) {
      return {
        success: false,
        message: 'Blueprint missing target URL. Cannot replay.',
      }
    }

    const provider = settings.preferred_provider || 'gemini'
    const encryptedKey = getProviderKey(settings, provider)
    if (!encryptedKey) {
      return {
        success: false,
        message: `Access Denied: No encrypted key found for ${provider.toUpperCase()}.`,
      }
    }

    const model =
      provider === 'groq'
        ? 'llama-3.1-70b-versatile'
        : provider === 'openai'
          ? 'gpt-4o-mini'
          : 'gemini-1.5-flash'

    const runId = await createTestRun(
      supabase,
      userId,
      blueprint.url,
      `REPLAY: ${blueprint.name}`,
      'replay'
    )

    await dispatchToWorker({
      user_id: userId,
      run_id: runId,
      api_key: encryptedKey,
      provider,
      model,
      mode: 'replay',
      context: {
        baseUrl: blueprint.url,
      },
      steps:
        typeof blueprint.steps_json === 'string'
          ? JSON.parse(blueprint.steps_json)
          : blueprint.steps_json,
      telemetry_enabled: settings.telemetry_enabled ?? true,
    })

    revalidatePath('/')
    return { success: true, message: 'Regression Replay Initiated', runId }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Replay Failed')
  }
}

export async function getReportContent(runId: string) {
  try {
    const { supabase } = await getSupabaseWithRLS()

    const { data, error } = await supabase
      .from('test_runs')
      .select('*, execution_logs(*)')
      .eq('id', runId)
      .maybeSingle()

    if (error) {
      console.error('Fetch error:', error)
      return null
    }

    return data
  } catch (err) {
    console.error('Report route error:', err)
    return null
  }
}

export async function getCrawlHistory() {
  try {
    const { supabase } = await getSupabaseWithRLS()

    const { data, error } = await supabase
      .from('test_runs')
      .select('id, url, created_at')
      .eq('mode', 'scout')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error || !data) throw error

    const history: CrawlRecord[] = data.map(item => ({
      id: item.id,
      url: item.url,
      timestamp: item.created_at ?? new Date().toISOString(),
      report_path: `QA_REPORT_${item.id}.md`,
    }))

    return { success: true, history }
  } catch {
    return { success: false, history: [] }
  }
}

export async function testProviderKey(
  provider: string,
  manualKey?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { supabase, userId } = await getSupabaseWithRLS()

    let apiKey: string | null = null

    const trimmedKey = manualKey?.trim()
    if (trimmedKey) {
      apiKey = trimmedKey
    } else {
      const settings = await getUserSettings(supabase, userId)
      const encryptedKey = getProviderKey(settings, provider)
      if (!encryptedKey) throw new Error('KEY_NOT_STORED')
      apiKey = decrypt(encryptedKey)
    }

    if (!apiKey) throw new Error('KEY_NOT_FOUND')

    const strategy = PROVIDER_STRATEGIES[provider]
    if (!strategy) throw new Error('UNSUPPORTED_PROVIDER')

    const finalUrl = provider === 'gemini' ? `${strategy.url}?key=${apiKey}` : strategy.url
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(finalUrl, {
      method: strategy.method,
      headers: strategy.headers(apiKey),
      body: strategy.body ? JSON.stringify(strategy.body) : undefined,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'Invalid API Key' }
    }

    if (!response.ok) return { success: false, message: `Invalid Key (${response.status})` }

    return { success: true, message: 'Connection Successful' }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorName = err instanceof Error ? err.name : 'UnknownError'

    const errorMap: Record<string, string> = {
      UNAUTHORIZED: 'Session expired. Please re-login.',
      SETTINGS_NOT_FOUND: 'No settings found. Save your keys first.',
      KEY_NOT_STORED: 'Key not found in vault. Store it first.',
      DECRYPTION_FAILED: 'Vault master key mismatch. Re-save your keys.',
      AbortError: 'Connection timed out. API may be down.',
    }

    return {
      success: false,
      message: errorMap[errorMessage] || errorMap[errorName] || 'System Network Error',
    }
  }
}

export async function testHFConnection(): Promise<ActionResponse> {
  const workerUrl = process.env.AI_WORKER_URL
  if (!workerUrl) return { success: false, message: 'Missing AI_WORKER_URL' }

  try {
    const res = await fetch(workerUrl, {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (res.status === 503) {
      return { success: false, message: 'Space is Sleeping', error: 'Wake it up manually.' }
    }
    return { success: res.ok || res.status === 405, message: 'AI Worker is Online.' }
  } catch {
    return { success: false, message: 'Connection Refused' }
  }
}

export async function deleteRun(runId: string): Promise<ActionResponse> {
  try {
    const { supabase } = await getSupabaseWithRLS()
    const { error } = await supabase.from('test_runs').delete().eq('id', runId)
    if (error) throw error
    revalidatePath('/')
    return { success: true, message: 'Mission purged.' }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Purge Failed')
  }
}

export async function deleteSavedTest(testId: number): Promise<ActionResponse> {
  try {
    const { supabase } = await getSupabaseWithRLS()
    const { error } = await supabase.from('saved_tests').delete().eq('id', testId)
    if (error) throw error
    revalidatePath('/registry')
    return { success: true, message: 'Test removed from registry.' }
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNAUTHORIZED')) {
      return { success: false, message: 'Unauthorized' }
    }
    return createErrorResponse(err, 'Delete Failed')
  }
}

export async function exportUserData() {
  try {
    const { supabase } = await getSupabaseWithRLS()
    const { data, error } = await supabase
      .from('test_runs')
      .select('*, execution_logs(*)')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data }
  } catch (err) {
    console.error('Export Failed:', err)
    return { success: false, message: 'Failed to retrieve archive.' }
  }
}

export async function updateTelemetrySettings(enabled: boolean): Promise<ActionResponse> {
  try {
    const { supabase, userId } = await getSupabaseWithRLS()

    const { error } = await supabase
      .from('user_settings')
      .update({ telemetry_enabled: enabled })
      .eq('user_id', userId)

    if (error) throw error

    revalidatePath('/settings')
    return { success: true, message: 'Privacy settings updated' }
  } catch (err) {
    return createErrorResponse(err, 'Failed to update settings')
  }
}
