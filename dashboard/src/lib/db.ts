import Database from 'better-sqlite3'
import path from 'path'

// Navigate out of 'dashboard' to the project root to find the DB
const dbPath = path.join(process.cwd(), '..', 'data', 'db', 'orchestrator.db')

export const db = new Database(dbPath, {
  readonly: true, // Dashboard only reads data for now
  fileMustExist: true,
})

export interface TestRun {
  run_id: string
  intent: string
  status: string
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
  timestamp: string
}
