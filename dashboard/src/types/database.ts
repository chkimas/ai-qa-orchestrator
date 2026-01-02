import { Database } from './supabase'

// Extract raw Table types from the generated Schema
type PublicTable = Database['public']['Tables']

// Export Domain Models (Aliases to the Generated Source of Truth)
export type TestRun = PublicTable['test_runs']['Row']
export type UserSettings = PublicTable['user_settings']['Row']
export type ExecutionLog = PublicTable['execution_logs']['Row']
export type SavedTest = PublicTable['saved_tests']['Row']

// Export Helper types for Insert/Update operations
export type TestRunInsert = PublicTable['test_runs']['Insert']
export type TestRunUpdate = PublicTable['test_runs']['Update']

// Application Logic Enums (Keep these for UI and Type-safety in code)
export type RunStatus = 'QUEUED' | 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'HEALED'
export type RunMode = 'sniper' | 'scout' | 'chaos' | 'replay'
export type AIProvider = 'groq' | 'gemini' | 'openai' | 'anthropic' | 'sonar'
