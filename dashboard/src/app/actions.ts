'use server'

import { exec } from 'child_process'
import { revalidatePath } from 'next/cache'
import path from 'path'
import { promisify } from 'util'
import { db } from '@/lib/db'
import { spawn } from 'child_process'
import fs from 'fs'

const execAsync = promisify(exec)

const LOG_DIR = path.resolve(process.cwd(), '..', 'logs')
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

interface RunTestResult {
  success: boolean
  message: string
}

export async function runTest(formData: FormData): Promise<RunTestResult> {
  const intent = formData.get('intent') as string
  const url = formData.get('url') as string
  const role = formData.get('role') as string
  const testData = formData.get('test_data') as string

  if (!intent) {
    return { success: false, message: 'Intent is required' }
  }

  try {
    const projectRoot = path.resolve(process.cwd(), '..')
    const isWindows = process.platform === 'win32'
    const venvPython = path.join(
      projectRoot,
      'venv',
      isWindows ? 'Scripts' : 'bin',
      isWindows ? 'python.exe' : 'python'
    )

    // --- FIX: Base64 Encoding ---
    // We package everything into a structured JSON object first
    const payloadObj = {
      context: {
        baseUrl: url || 'AUTO_DISCOVER',
        role: role || 'customer',
        testData: testData || 'None',
      },
      instructions: intent,
    }

    // Convert JSON -> String -> Base64
    // This creates a safe string like "eyJjb250ZXh0Ijp7..." with no spaces or newlines
    const base64Payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64')

    // Pass the Base64 string to Python
    const command = `"${venvPython}" -u main.py "${base64Payload}"`

    console.log(`🚀 Triggering Orchestrator...`)

    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    console.log('✅ Python Output:', stdout)
    if (stderr) console.warn('⚠️ Python Stderr:', stderr)

    revalidatePath('/')
    return { success: true, message: 'Test Execution Completed.' }
  } catch (error: unknown) {
    console.error('❌ Execution Failed:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// --- Registry Actions ---

export async function saveRunToRegistry(runId: string, name: string) {
  console.log(`💾 Attempting to save run: ${runId}`)

  try {
    const run = db.prepare('SELECT intent FROM test_runs WHERE run_id = ?').get(runId) as
      | { intent: string }
      | undefined

    if (!run) throw new Error(`Run ID ${runId} not found`)

    // Only save passed steps to create a "Golden Path"
    const logs = db
      .prepare(
        `
        SELECT step_id, role, action, selector, value, description
        FROM logs
        WHERE run_id = ? AND status = 'PASSED' AND action != 'screenshot'
        ORDER BY step_id ASC
      `
      )
      .all(runId)

    if (logs.length === 0) {
      throw new Error('No successful steps found. Cannot save empty test.')
    }

    const stepsJson = JSON.stringify(logs)

    db.prepare('INSERT INTO saved_tests (name, intent, steps_json) VALUES (?, ?, ?)').run(
      name,
      run.intent,
      stepsJson
    )

    revalidatePath('/registry')
    return { success: true, message: 'Test Saved to Registry!' }
  } catch (error: unknown) {
    console.error('Save Failed:', error)
    return { success: false, message: error instanceof Error ? error.message : 'Save Failed' }
  }
}

export async function runSavedTest(testId: number) {
  try {
    const projectRoot = path.resolve(process.cwd(), '..')
    const isWindows = process.platform === 'win32'
    const venvPython = path.join(
      projectRoot,
      'venv',
      isWindows ? 'Scripts' : 'bin',
      isWindows ? 'python.exe' : 'python'
    )

    const command = `"${venvPython}" -u main.py --run-saved ${testId}`
    console.log(`🚀 Replaying Golden Test ID ${testId}`)

    // Non-blocking execution for Replays (Fire and Forget)
    exec(command, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    return { success: true, message: 'Replay started! Watch the Dashboard.' }
  } catch (error: unknown) {
    console.error('Replay Failed:', error)
    return { success: false, message: 'Failed to start replay' }
  }
}

export async function deleteRun(runId: string) {
  try {
    db.prepare('DELETE FROM logs WHERE run_id = ?').run(runId)
    db.prepare('DELETE FROM test_runs WHERE run_id = ?').run(runId)
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete run:', error)
    return { success: false, error: 'Failed to delete' }
  }
}

export async function runScoutTest(url: string, user?: string, password?: string) {
  const LOG_DIR = path.resolve(process.cwd(), '..', 'logs')
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })

  const runId = Date.now().toString()
  const logFile = path.join(LOG_DIR, `${runId}.log`)

  const venvPath = path.resolve(process.cwd(), '..', 'venv')
  const pythonPath =
    process.platform === 'win32'
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python')

  // Use venv if it exists, otherwise fallback to global 'python'
  const cmd = fs.existsSync(pythonPath) ? pythonPath : 'python'

  console.log(`🚀 Using Python: ${cmd}`)
  // --------------------------------

  const scriptPath = path.resolve(process.cwd(), '..', 'main.py')
  const args = [scriptPath, url, '--mode', 'scout']
  if (user) args.push('--user', user)
  if (password) args.push('--password', password)

  const pythonProcess = spawn(cmd, args, {
    cwd: path.resolve(process.cwd(), '..'),
    env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONIOENCODING: 'utf-8' },
  })

  const logStream = fs.createWriteStream(logFile)
  pythonProcess.stdout.pipe(logStream)
  pythonProcess.stderr.pipe(logStream)

  pythonProcess.on('close', () => logStream.end())

  // Return success with runId
  return { success: true, message: 'Scout Started', runId }
}

// --- 2. READ THE LOGS (POLLING) ---
export async function getRunLogs(runId: string) {
  const logFile = path.join(LOG_DIR, `${runId}.log`)

  if (!fs.existsSync(logFile)) {
    return { logs: 'Initializing Scout...' }
  }

  try {
    const logs = fs.readFileSync(logFile, 'utf-8')
    return { logs }
  } catch {
    return { logs: 'Error reading logs...' }
  }
}

// GET REPORT CONTENT FOR DOWNLOAD
export async function getReportContent(filename: string) {
  try {
    const filePath = path.resolve(process.cwd(), '..', filename)
    if (fs.existsSync(filePath)) {
      return { success: true, content: fs.readFileSync(filePath, 'utf-8') }
    }
    return { success: false, message: 'Report not found' }
  } catch {
    return { success: false, message: 'Error reading report' }
  }
}

// GET CRAWL HISTORY FROM DB
export async function getCrawlHistory() {
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS crawl_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT,
        report_path TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `
    ).run()

    const history = db.prepare('SELECT * FROM crawl_history ORDER BY timestamp DESC LIMIT 8').all()
    return { success: true, history }
  } catch (err) {
    console.error('History Error:', err)
    return { success: false, history: [] }
  }
}
