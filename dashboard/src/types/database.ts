export type RunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'HEALED'
export type RunMode = 'sniper' | 'scout' | 'chaos' | 'replay'

export interface TestRun {
  id: string
  user_id: string
  url: string
  intent: string
  status: RunStatus
  mode: RunMode
  created_at: string
}

export interface ExecutionLog {
  id: number
  run_id: string
  step_id: number
  role: string
  action: string
  status: string
  description: string
  details?: string
  selector?: string
  value?: string
  timestamp: string
}

export interface SavedTest {
  id: number
  name: string
  steps_json: string
  created_at: string
}
