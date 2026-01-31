'use client'

import { useEffect, useState } from 'react'
import StepCard from './StepCard'
import { Terminal, WifiOff, Radio, CheckCircle2 } from 'lucide-react'
import { useRealtimeLogs } from '@/hooks/useRealtime'
import type { ExecutionLog } from '@/types/database'

interface LiveLogViewerProps {
  runId: string
  initialLogs: ExecutionLog[]
}

export default function LiveLogViewer({ runId, initialLogs = [] }: LiveLogViewerProps) {
  const logs = useRealtimeLogs(runId, initialLogs)
  const [showTimeout, setShowTimeout] = useState(false)
  const [showSuccessSplash, setShowSuccessSplash] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTimeout(logs.length === 0)
    }, 15000)

    return () => clearTimeout(timer)
  }, [logs.length])

  useEffect(() => {
    const lastLog = logs[logs.length - 1]
    if (lastLog?.status === 'COMPLETED') {
      const timer = setTimeout(() => setShowSuccessSplash(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [logs])

  if (logs.length === 0 && !showTimeout) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border border-dashed border-slate-800 rounded-3xl bg-slate-950/50 backdrop-blur-sm">
        <div className="relative">
          <Terminal size={24} className="text-blue-500 animate-pulse" />
          <div className="absolute -inset-2 bg-blue-500/20 blur-xl rounded-full animate-pulse" />
        </div>
        <span className="mt-4 text-blue-500/50 font-mono text-xs uppercase tracking-[0.3em]">
          Establishing Neural Uplink...
        </span>
      </div>
    )
  }

  if (logs.length === 0 && showTimeout) {
    return (
      <div className="flex flex-col items-center justify-center p-20 border border-red-900/20 rounded-3xl bg-red-500/5 group">
        <WifiOff size={24} className="text-red-900 mb-4 group-hover:animate-bounce" />
        <div className="text-center space-y-2">
          <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.4em]">
            Signal Obstructed
          </p>
          <p className="text-[10px] text-slate-500 font-mono max-w-60 leading-relaxed">
            Worker is active but telemetry packets are being dropped. Check HF Console for direct
            stream.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative space-y-8 pb-32">
      <div className="absolute left-5.25 top-4 bottom-4 w-px bg-linear-to-b from-blue-500 via-slate-800 to-transparent opacity-50" />

      {logs.map(log => (
        <div key={log.id} className="animate-in fade-in slide-in-from-left-4 duration-700 ease-out">
          <StepCard step={log} />
        </div>
      ))}

      {showSuccessSplash && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-1000">
          <div className="text-center p-12 border border-green-500/30 bg-green-500/5 rounded-[40px] shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(34,197,94,0.05)_50%,transparent_75%)] bg-size-[200%_200%]" />

            <div className="relative z-10 space-y-6">
              <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 border border-green-500/40 animate-bounce">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black text-white tracking-tighter uppercase">
                  Mission Accomplished
                </h2>
                <p className="text-green-500/60 font-mono text-xs uppercase tracking-[0.5em]">
                  Neural Trace Finalized
                </p>
              </div>

              <button
                onClick={() => setShowSuccessSplash(false)}
                className="px-8 py-3 bg-green-500 text-slate-950 font-black text-xs uppercase tracking-widest rounded-full hover:bg-green-400 transition-colors shadow-[0_0_20px_rgba(34,197,94,0.4)]"
              >
                Return to Intelligence Brief
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 pl-3.5">
        <div className="flex h-4 w-4 items-center justify-center">
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping" />
        </div>
        <div className="flex items-center gap-2">
          <Radio
            size={10}
            className="text-blue-500/50"
            style={{ animation: 'spin 3s linear infinite' }}
          />
          <span className="text-[8px] font-mono text-blue-500/40 uppercase tracking-[0.2em]">
            Neural_Sync_Active
          </span>
        </div>
      </div>
    </div>
  )
}
