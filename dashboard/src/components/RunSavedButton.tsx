'use client'

import { useState } from 'react'
import { runSavedTest } from '@/lib/actions'
import { useRouter } from 'next/navigation'
import { Play, Loader2 } from 'lucide-react'

export default function RunSavedButton({ testId }: { testId: number | string }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const [error, setError] = useState(false)

  async function handleRun() {
    setIsLoading(true)
    setError(false)

    const result = await runSavedTest(String(testId))

    if (result.success && result.runId) {
      router.push(`/runs/${result.runId}`)
    } else {
      setError(true)
      setIsLoading(false)
      setTimeout(() => setError(false), 3000)
    }
  }

  return (
    <button
      onClick={handleRun}
      disabled={isLoading}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition disabled:opacity-50 flex items-center gap-2 text-xs"
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Play className="w-3 h-3 fill-current" />
      )}
      {isLoading ? 'Initializing...' : error ? 'Failed to Sync' : 'Replay Mission'}
    </button>
  )
}
