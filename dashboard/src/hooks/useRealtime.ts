'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ExecutionLog } from '@/types/database'

export function useRealtimeLogs(runId: string | null, initialLogs: ExecutionLog[] = []) {
  const [displayLogs, setDisplayLogs] = useState<ExecutionLog[]>(initialLogs)

  useEffect(() => {
    if (!runId) return

    const channel = supabase
      .channel(`realtime-logs-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_logs',
          filter: `run_id=eq.${runId}`,
        },
        payload => {
          setDisplayLogs(prev => [...prev, payload.new as ExecutionLog])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId])

  return runId ? displayLogs : []
}
