'use client'

import { useState } from 'react'
import { runSavedTest } from '@/app/actions'
import { useRouter } from 'next/navigation'

export default function RunSavedButton({ testId }: { testId: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleRun() {
    setIsLoading(true)
    const result = await runSavedTest(testId)

    if (result.success) {
      // Optional: Redirect to dashboard to watch the run
      router.push('/')
    } else {
      alert('Failed to start test')
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleRun}
      disabled={isLoading}
      className="bg-green-600 text-white px-4 py-2 rounded font-medium hover:bg-green-700 shadow-sm transition disabled:opacity-50 flex items-center gap-2"
    >
      {isLoading ? 'Starting...' : '▶ Run Now'}
    </button>
  )
}
