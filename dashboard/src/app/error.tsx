'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('SYSTEM_CRASH:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
        <AlertTriangle className="text-red-500" size={40} />
      </div>

      <h1 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase">
        Neural <span className="text-red-500">Collapse</span>
      </h1>

      <div className="max-w-lg bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-10">
        <p className="text-slate-400 font-mono text-xs text-left overflow-auto whitespace-pre-wrap">
          TRACE_LOG: {error.message || 'Unknown Protocol Failure'}
        </p>
      </div>

      <button
        onClick={() => reset()}
        className="flex items-center gap-3 px-8 py-3 bg-white/5 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg hover:bg-white/10 transition-all border border-white/10 backdrop-blur-md"
      >
        <RefreshCw size={14} />
        Re-Sync Neural Link
      </button>
    </div>
  )
}
