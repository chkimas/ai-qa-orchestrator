import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

// 1. Resolve path relative to the "dashboard" folder where you run 'npm run dev'
// We assume process.cwd() is '.../ai-qa-orchestrator/dashboard'
const dbPath = path.resolve(process.cwd(), '..', 'data', 'db', 'orchestrator.db')

console.log(`🔌 Next.js Database Path: ${dbPath}`)

// 2. SELF-HEALING: Create the directory if it doesn't exist
const dbDir = path.dirname(dbPath)
if (!fs.existsSync(dbDir)) {
  console.log(`🛠️ Creating missing database directory: ${dbDir}`)
  fs.mkdirSync(dbDir, { recursive: true })
}

// 3. Initialize Connection
export const db = new Database(dbPath, {
  // verbose: console.log, // Uncomment for SQL debugging
  fileMustExist: false,
})

// 4. Shared Types
export interface TestRun {
  run_id: string
  intent: string
  status: 'RUNNING' | 'PASSED' | 'FAILED'
  created_at: string
}

export interface TestLog {
  id: number
  run_id: string
  step_id: number
  role: string
  action: string
  status: string
  details: string
  selector?: string
  value?: string
  timestamp: string
  description?: string
}
