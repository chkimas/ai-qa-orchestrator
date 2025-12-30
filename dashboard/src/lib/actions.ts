'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseAdmin, supabase } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'

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

/**
 * MODE 1 & CHAOS: SNIPER / MISSION RUNNER
 * Triggered from NewRunModal.tsx
 */
export async function runTest(formData: FormData): Promise<ActionResponse> {
  const { userId } = await auth()
  if (!userId) return { success: false, message: 'Unauthorized' }

  const url = formData.get('url') as string
  const intent = formData.get('intent') as string
  const isChaos = formData.get('is_chaos') === 'on'
  const provider = (formData.get('provider') as string) || 'groq'
  const testData = (formData.get('test_data') as string) || '{}'

  try {
    const adminClient = getSupabaseAdmin()

    // 1. Register the Run in Cloud DB
    const { data: run, error: dbError } = await adminClient
      .from('test_runs')
      .insert({
        user_id: userId,
        url: url,
        intent: intent,
        status: 'QUEUED',
        mode: isChaos ? 'chaos' : 'sniper',
      })
      .select()
      .single()

    if (dbError || !run) throw new Error('Cloud DB Registration Failed')

    // 2. Prepare Payload for Python Worker
    const payload = {
      user_id: userId,
      run_id: run.id,
      context: {
        baseUrl: url,
        testData: JSON.parse(testData),
      },
      instructions: intent,
      mode: isChaos ? 'chaos' : 'sniper',
      provider: provider,
    }

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')

    // 3. Launch Mission via Hugging Face API
    await fetch(process.env.AI_WORKER_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [base64Payload] }),
    })

    revalidatePath('/')
    return { success: true, message: 'Mission Launched', runId: run.id }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown launch error'
    return { success: false, message: 'Launch Failed', error: errMsg }
  }
}

/**
 * MODE 2: SCOUT (Autonomous Cloud Crawler)
 */
export async function runScoutMission(url: string): Promise<ActionResponse> {
  const { userId } = await auth()
  if (!userId) return { success: false, message: 'Unauthorized' }

  try {
    const adminClient = getSupabaseAdmin()

    const { data: run, error: dbError } = await adminClient
      .from('test_runs')
      .insert({
        user_id: userId,
        url: url,
        intent: 'AUTONOMOUS SCOUT: Discovering site structure and risk points.',
        status: 'QUEUED',
        mode: 'scout',
      })
      .select()
      .single()

    if (dbError) throw dbError

    const payload = {
      user_id: userId,
      run_id: run.id,
      url: url,
      mode: 'scout',
    }

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')

    await fetch(process.env.AI_WORKER_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [base64Payload] }),
    })

    revalidatePath('/crawler')
    return { success: true, message: 'Scout drone launched.', runId: run.id }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown scout error'
    return { success: false, message: 'Scout Launch Failed', error: errMsg }
  }
}

/**
 * MODE 3: PREDICTIVE HEATMAP
 * Aggregates logs to find brittle areas
 */
export async function getRiskHeatmap(): Promise<RiskItem[]> {
  const { data, error } = await supabase
    .from('execution_logs')
    .select('url, status')
    .not('url', 'is', null)

  if (error || !data) return []

  const stats: Record<string, { total: number; weight: number }> = {}

  data.forEach(log => {
    if (!stats[log.url]) stats[log.url] = { total: 0, weight: 0 }
    stats[log.url].total += 1
    if (log.status === 'FAILED') stats[log.url].weight += 70
    if (log.status === 'HEALED') stats[log.url].weight += 30
  })

  return Object.entries(stats)
    .map(([url, val]): RiskItem => {
      const score = Math.min(Math.round(val.weight / val.total), 100)

      // Use "as" to assert the literal types
      const status = (score > 60 ? 'CRITICAL' : score > 25 ? 'BRITTLE' : 'STABLE') as
        | 'CRITICAL'
        | 'BRITTLE'
        | 'STABLE'

      return {
        url,
        risk_score: score,
        status,
        recommendation: score > 60 ? 'Immediate Logic Audit' : 'Selector Optimization',
      }
    })
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 5)
}

/**
 * REGISTRY: PROMOTE TO GOLDEN PATH
 */
export async function saveRunToRegistry(runId: string, name: string): Promise<ActionResponse> {
  try {
    const adminClient = getSupabaseAdmin()

    // 1. Fetch Logs
    const { data: logs } = await adminClient
      .from('execution_logs')
      .select('*')
      .eq('run_id', runId)
      .eq('status', 'PASSED')
      .order('step_id', { ascending: true })

    if (!logs || logs.length === 0) throw new Error('No successful steps to save.')

    // 2. Save to saved_tests table
    const { error } = await adminClient.from('saved_tests').insert({
      name,
      steps_json: JSON.stringify(logs),
    })

    if (error) throw error

    revalidatePath('/registry')
    return { success: true, message: 'Promoted to Golden Path.' }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Registry save failed'
    return { success: false, message: 'Registry Save Failed', error: errMsg }
  }
}

/**
 * REGISTRY: REPLAY A SAVED TEST (Regression Blueprint)
 */
export async function runSavedTest(testId: number): Promise<ActionResponse> {
  const { userId } = await auth()
  if (!userId) return { success: false, message: 'Unauthorized' }

  try {
    const adminClient = getSupabaseAdmin()

    // 1. Fetch the Blueprint from the Golden Library
    const { data: blueprint, error: fetchError } = await adminClient
      .from('saved_tests')
      .select('*')
      .eq('id', testId)
      .single()

    if (fetchError || !blueprint) throw new Error('Blueprint not found in Library.')

    // 2. Register a new Run based on this blueprint
    const { data: run, error: dbError } = await adminClient
      .from('test_runs')
      .insert({
        user_id: userId,
        url: blueprint.url || 'SAVED_BLUEPRINT',
        intent: `REPLAY: ${blueprint.name}`,
        status: 'QUEUED',
        mode: 'replay',
      })
      .select()
      .single()

    if (dbError) throw dbError

    // 3. Prepare Payload with the saved steps_json
    const payload = {
      user_id: userId,
      run_id: run.id,
      mode: 'replay',
      // We pass the actual steps so the AI doesn't have to "think" — just execute
      steps: JSON.parse(blueprint.steps_json),
    }

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')

    // 4. Dispatch to Hugging Face
    await fetch(process.env.AI_WORKER_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [base64Payload] }),
    })

    revalidatePath('/')
    return { success: true, message: 'Regression Replay Initiated', runId: run.id }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Replay failed'
    return { success: false, message: 'Replay Failed', error: errMsg }
  }
}

/**
 * CRAWLER: FETCH CRAWL HISTORY
 */
export async function getCrawlHistory() {
  try {
    const { data, error } = await supabase
      .from('test_runs')
      .select('id, url, created_at')
      .eq('mode', 'scout')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    // Map database fields to the UI interface
    const history = data.map(item => ({
      id: item.id,
      url: item.url,
      timestamp: item.created_at,
      report_path: `QA_REPORT_${item.id}.md`,
    }))

    return { success: true, history }
  } catch {
    return { success: false, history: [] }
  }
}

/**
 * CRAWLER: GET REPORT CONTENT (From execution_logs summary)
 */
export async function getReportContent(reportFile: string) {
  try {
    // Extract the ID from the filename
    const runId = reportFile.replace('QA_REPORT_', '').replace('.md', '')

    const { data, error } = await supabase
      .from('execution_logs')
      .select('description, details')
      .eq('run_id', runId)
      .eq('action', 'summary')
      .single()

    if (error) throw error

    return { success: true, content: data.description || data.details }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Purge failed'
    return { success: false, message: 'Purge Failed', error: errMsg }
  }
}

/**
 * MAINTENANCE: PURGE RECORDS
 */
export async function deleteRun(runId: string): Promise<ActionResponse> {
  const { userId } = await auth()
  if (!userId) return { success: false, message: 'Unauthorized' }

  try {
    const adminClient = getSupabaseAdmin()
    const { error } = await adminClient
      .from('test_runs')
      .delete()
      .eq('id', runId)
      .eq('user_id', userId)

    if (error) throw error

    revalidatePath('/')
    return { success: true, message: 'Mission purged from history.' }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Purge failed'
    return { success: false, message: 'Purge Failed', error: errMsg }
  }
}
