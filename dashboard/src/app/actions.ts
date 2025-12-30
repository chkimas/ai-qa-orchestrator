'use server'

import { spawn, ChildProcess } from 'child_process'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs'
import { db } from '@/lib/db'

export interface ActionResponse {
  success: boolean
  message: string
  runId?: string
  error?: string
}

export interface CrawlRecord {
  id: number
  url: string
  report_path: string
  timestamp: string
}

export interface RiskItem {
  url: string
  risk_score: number
  status: 'CRITICAL' | 'BRITTLE' | 'STABLE'
  recommendation: string
}

interface RawRiskRow {
  url: string
  risk_score: number
}

/**
 * SAFE EXECUTOR UTILITY
 * Strictly typed and isolated process management.
 */
class SafeExecutor {
  private static projectRoot: string = path.resolve(process.cwd(), '..')

  private static getPythonPath(): string {
    const isWindows: boolean = process.platform === 'win32'
    const venvPython: string = path.join(
      this.projectRoot,
      'venv',
      isWindows ? 'Scripts' : 'bin',
      isWindows ? 'python.exe' : 'python'
    )
    return fs.existsSync(venvPython) ? venvPython : 'python'
  }

  static async run(args: string[]): Promise<void> {
    const python: string = this.getPythonPath()
    const mainScript: string = path.join(this.projectRoot, 'main.py')

    return new Promise((resolve, reject) => {
      // Renamed from 'process' to 'child' to avoid collision with global process
      const child: ChildProcess = spawn(python, [mainScript, ...args], {
        cwd: this.projectRoot,
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUNBUFFERED: '1' },
        stdio: 'inherit',
      })

      child.on('close', (code: number | null) => {
        if (code === 0) resolve()
        else reject(new Error(`Orchestrator exited with code ${code}`))
      })

      child.on('error', (err: Error) => {
        reject(err)
      })
    })
  }
}

/**
 * MODE 1: SNIPER / CHAOS RUNNER
 */
export async function runTest(formData: FormData): Promise<ActionResponse> {
  const intent = formData.get('intent') as string | null
  const url = formData.get('url') as string | null
  const role = formData.get('role') as string | null
  const testData = formData.get('test_data') as string | null
  const isChaos: boolean = formData.get('is_chaos') === 'on'

  if (!intent) return { success: false, message: 'Intent is required' }

  try {
    const payload: string = Buffer.from(
      JSON.stringify({
        context: {
          baseUrl: url || 'AUTO_DISCOVER',
          role: role || 'customer',
          testData: testData || 'None',
        },
        instructions: intent,
      })
    ).toString('base64')

    const args: string[] = [payload]
    if (isChaos) args.push('--chaos')

    // Background execution for long-running AI tasks
    SafeExecutor.run(args).catch((err: Error) =>
      console.error('Critical Orchestrator Failure:', err.message)
    )

    revalidatePath('/')
    return { success: true, message: `${isChaos ? 'Chaos' : 'Sniper'} run initiated.` }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown execution error'
    return { success: false, message: 'Failed to initiate test', error: errMsg }
  }
}

/**
 * MODE 2: SCOUT (CRAWLER)
 */
export async function runScoutTest(
  url: string,
  user?: string,
  password?: string
): Promise<ActionResponse> {
  if (!url) return { success: false, message: 'URL is required.' }

  try {
    const args: string[] = [url, '--mode', 'scout']
    if (user) args.push('--user', user)
    if (password) args.push('--password', password)

    SafeExecutor.run(args).catch((err: Error) =>
      console.error('Scout Mission Failure:', err.message)
    )

    return { success: true, message: 'Autonomous Scout mission started.' }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Unknown scout error'
    return { success: false, message: 'Scout initiation failed', error: errMsg }
  }
}

/**
 * MODE 3: PREDICTIVE HEATMAP
 */
export async function getRiskHeatmap(): Promise<RiskItem[]> {
  try {
    const stats = db
      .prepare(
        `
            SELECT
                url,
                CAST(((SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) * 70.0) +
                      (SUM(CASE WHEN status = 'HEALED' THEN 1 ELSE 0 END) * 30.0)) / COUNT(*) AS FLOAT) as risk_score
            FROM logs
            WHERE url IS NOT NULL AND url != ''
            GROUP BY url
            HAVING risk_score > 0
            ORDER BY risk_score DESC
            LIMIT 5
        `
      )
      .all() as RawRiskRow[]

    return stats.map(
      (item: RawRiskRow): RiskItem => ({
        url: item.url,
        risk_score: Math.round(item.risk_score),
        status: item.risk_score > 60 ? 'CRITICAL' : item.risk_score > 25 ? 'BRITTLE' : 'STABLE',
        recommendation: item.risk_score > 60 ? 'Immediate Logic Audit' : 'Selector Optimization',
      })
    )
  } catch (err: unknown) {
    console.error('Heatmap Intelligence Failure:', err)
    return []
  }
}

/**
 * REGISTRY: SAVE SUCCESSFUL RUN AS A "GOLDEN PATH"
 */
export async function saveRunToRegistry(runId: string, name: string): Promise<ActionResponse> {
  try {
    // 1. Fetch the original intent
    const run = db.prepare('SELECT intent FROM test_runs WHERE run_id = ?').get(runId) as
      | { intent: string }
      | undefined

    if (!run) throw new Error(`Run ID ${runId} not found`)

    // 2. Fetch only successful, non-screenshot steps to form the regression script
    const logs = db
      .prepare(
        `
        SELECT step_id, role, action, selector, value, details as description
        FROM logs
        WHERE run_id = ? AND status = 'PASSED' AND action != 'screenshot'
        ORDER BY step_id ASC
      `
      )
      .all(runId)

    if (logs.length === 0) {
      throw new Error('No successful steps found. Cannot save an unsuccessful run.')
    }

    // 3. Save to Registry
    const stepsJson = JSON.stringify(logs)
    db.prepare('INSERT INTO saved_tests (name, intent, steps_json) VALUES (?, ?, ?)').run(
      name,
      run.intent,
      stepsJson
    )

    revalidatePath('/registry')
    return { success: true, message: 'Test successfully promoted to Registry.' }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Registry save failed'
    return { success: false, message: 'Failed to save test', error: errMsg }
  }
}

/**
 * REGISTRY: REPLAY A SAVED TEST (REGRESSION)
 */
export async function runSavedTest(testId: number): Promise<ActionResponse> {
  try {
    // Use the SafeExecutor to trigger the --run-saved flag in main.py
    const args: string[] = ['--run-saved', testId.toString()]

    SafeExecutor.run(args).catch((err: Error) =>
      console.error('Saved Test Replay Failure:', err.message)
    )

    return {
      success: true,
      message: 'Regression replay started. Monitor the dashboard for results.',
    }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Replay failed'
    return { success: false, message: 'Failed to start replay', error: errMsg }
  }
}

/**
 * CRAWLER: FETCH CRAWL HISTORY
 */
export async function getCrawlHistory(): Promise<{ success: boolean; history: CrawlRecord[] }> {
  try {
    const history = db
      .prepare('SELECT * FROM crawl_history ORDER BY timestamp DESC LIMIT 8')
      .all() as CrawlRecord[]

    return { success: true, history }
  } catch (err: unknown) {
    console.error('History Error:', err)
    return { success: false, history: [] }
  }
}

/**
 * MAINTENANCE
 */
export async function deleteRun(runId: string): Promise<ActionResponse> {
  try {
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM logs WHERE run_id = ?').run(runId)
      db.prepare('DELETE FROM test_runs WHERE run_id = ?').run(runId)
    })
    transaction()

    revalidatePath('/')
    return { success: true, message: 'Records purged.' }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : 'Purge failed'
    return { success: false, message: 'Deletion failed', error: errMsg }
  }
}
