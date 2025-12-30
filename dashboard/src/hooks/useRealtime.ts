'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ExecutionLog } from '@/types/database'

export function useRealtimeLogs(runId: string | null) {
  const [data, setData] = useState<ExecutionLog[]>([])

  useEffect(() => {
    if (!runId) return

    const fetchInitial = async () => {
      const { data: initialLogs } = await supabase
        .from('execution_logs')
        .select('*')
        .eq('run_id', runId)
        .order('step_id', { ascending: true })

      // Cast the response to our interface
      if (initialLogs) setData(initialLogs as ExecutionLog[])
    }

    fetchInitial()

    const channel = supabase
      .channel(`live-run-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_logs',
          filter: `run_id=eq.${runId}`,
        },
        payload => {
          const newLog = payload.new as ExecutionLog
          setData(current => [...current, newLog])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId])

  return data
}
