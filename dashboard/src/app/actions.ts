'use server'

import { exec } from 'child_process'
import { revalidatePath } from 'next/cache'
import path from 'path'
import { promisify } from 'util'

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
