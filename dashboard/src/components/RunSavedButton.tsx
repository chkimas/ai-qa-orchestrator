'use client'

import { useState } from 'react'
import { runSavedTest } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { Play, Loader2, AlertCircle } from 'lucide-react'

export default function RunSavedButton({ testId }: { testId: number | string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleRun() {
    if (isLoading) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await runSavedTest(String(testId))

      if (result.success && result.runId) {
        router.push(`/runs/${result.runId}`)
      } else {
        setError(result.error || 'Failed to start test run')
        setIsLoading(false)

        setTimeout(() => setError(null), 4000)
      }
    } catch (err) {
      console.error('Failed to run saved test:', err)
      setError('Network error. Please try again.')
      setIsLoading(false)

      setTimeout(() => setError(null), 4000)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleRun}
        disabled={isLoading}
        aria-busy={isLoading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-xs"
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <Play className="w-3 h-3 fill-current" aria-hidden="true" />
        )}
        {isLoading ? 'Initializing...' : 'Replay Mission'}
      </button>

      {error && (
        <div
          className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-950/30 border border-red-500/30 rounded px-2 py-1 animate-in fade-in"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle size={12} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
