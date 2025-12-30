'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StepCard from './StepCard'

interface LogEntry {
  id: number
  run_id: string
  step_id: number
  role: string
  action: string
  status: string
  description: string
  timestamp: string
  details?: string
  selector?: string
  value?: string
}

export default function LiveLogViewer({
  runId,
  initialLogs,
}: {
  runId: string
  initialLogs: LogEntry[]
}) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs)

  useEffect(() => {
    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_logs',
          filter: `run_id=eq.${runId}`,
        },
        payload => {
          const newLog = payload.new as LogEntry
          setLogs(prev => [...prev, newLog])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId])

  return (
    <div className="space-y-4">
      {logs.map(log => (
        <div key={log.id}>
          <StepCard step={log} />
        </div>
      ))}
    </div>
  )
}
