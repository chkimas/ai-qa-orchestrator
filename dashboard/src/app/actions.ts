'use server'

import { exec } from 'child_process'
import { revalidatePath } from 'next/cache'
import path from 'path'
import { promisify } from 'util'
import { db } from '@/lib/db'

const execAsync = promisify(exec)

interface RunTestResult {
  success: boolean
  message: string
}

export async function runTest(formData: FormData): Promise<RunTestResult> {
  const intent = formData.get('intent') as string

  if (!intent) {
    return { success: false, message: 'Intent is required' }
  }

  try {
    // 1. Resolve path to the Project Root (Go up one level from 'dashboard')
    const projectRoot = path.resolve(process.cwd(), '..')

    // 2. Point strictly to the Virtual Environment Python executable
    // This ensures we use the python that has LangChain & Playwright installed.
    // NOTE: On Windows it's 'Scripts', on Mac/Linux it's usually 'bin'
    const isWindows = process.platform === 'win32'
    const venvPython = path.join(
      projectRoot,
      'venv',
      isWindows ? 'Scripts' : 'bin',
      isWindows ? 'python.exe' : 'python'
    )

    // 3. Construct the secure command
    // We wrap paths in quotes to handle spaces in your username ("Christian Kim Asilo")
    // We execute "main.py" passing the intent as an argument
    const command = `"${venvPython}" -u main.py "${intent}"`

    console.log(`🚀 Triggering Orchestrator from: ${projectRoot}`)
    console.log(`   Command: ${command}`)

    // 4. Execute Python Script
    // We set 'cwd' (Current Working Directory) to projectRoot so Python imports work
    const { stdout, stderr } = await execAsync(command, {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 5,
      // --- CRITICAL FIX: FORCE UTF-8 ENCODING ---
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    console.log('✅ Python Output:', stdout)
    if (stderr) {
      // Note: Playwright sometimes prints non-error info to stderr, so we just log it
      console.warn('⚠️ Python Stderr:', stderr)
    }

    // 5. Refresh the UI to show the new run immediately
    revalidatePath('/')

    return { success: true, message: 'Test completed successfully!' }
  } catch (error: unknown) {
    console.error('❌ Execution Failed:', error)

    // Type narrowing for the error object
    let errorMessage = 'Unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    return { success: false, message: errorMessage }
  }
}

export async function saveRunToRegistry(runId: string, name: string) {
  console.log(`💾 Attempting to save run: ${runId}`) // <--- DEBUG LOG

  try {
    // 1. Get the Run Intent
    const run = db.prepare('SELECT intent FROM test_runs WHERE run_id = ?').get(runId) as
      | { intent: string }
      | undefined

    if (!run) {
      console.error(`❌ Run ID ${runId} not found in DB`) // <--- DEBUG LOG
      throw new Error(`Run ID ${runId} not found`)
    }

    // 2. Get the Steps (Logs)
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

    console.log(`   found ${logs.length} passed steps to save.`) // <--- DEBUG LOG

    if (logs.length === 0) {
      throw new Error('No successful steps found in this run. Cannot save empty test.')
    }

    // 3. Serialize
    const stepsJson = JSON.stringify(logs)

    // 4. Insert
    const info = db
      .prepare('INSERT INTO saved_tests (name, intent, steps_json) VALUES (?, ?, ?)')
      .run(name, run.intent, stepsJson)

    console.log(`   ✅ Inserted row ID: ${info.lastInsertRowid}`) // <--- DEBUG LOG

    revalidatePath('/registry')
    return { success: true, message: 'Test Saved to Registry!' }
  } catch (error: unknown) {
    console.error('Save Failed:', error)

    let errorMessage = 'An unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    return { success: false, message: errorMessage }
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

    // COMMAND: python main.py --run-saved 1
    const command = `"${venvPython}" -u main.py --run-saved ${testId}`

    console.log(`🚀 Replaying Test ID ${testId}: ${command}`)

    // Execute with UTF-8 support
    // We don't await the output here because we want to return immediately
    // and let the user watch the run appear in the dashboard.
    execAsync(command, {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    })

    // We return success immediately so the UI doesn't freeze
    return { success: true, message: 'Replay started! Check Dashboard.' }
  } catch (error: unknown) {
    console.error('Replay Failed:', error)
    return { success: false, message: 'Failed to start replay' }
  }
}

export async function deleteRun(runId: string) {
  try {
    // 1. Delete logs associated with the run first (Foreign Key cleanup)
    db.prepare('DELETE FROM logs WHERE run_id = ?').run(runId)

    // 2. Delete the run itself
    db.prepare('DELETE FROM test_runs WHERE run_id = ?').run(runId)

    // 3. Refresh the page data
    revalidatePath('/')
    return { success: true }
  } catch (error) {
    console.error('Failed to delete run:', error)
    return { success: false, error: 'Failed to delete' }
  }
}
