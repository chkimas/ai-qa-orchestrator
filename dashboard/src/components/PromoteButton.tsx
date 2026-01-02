'use client'

import { useState } from 'react'
import { saveRunToRegistry } from '@/lib/actions'
import { ShieldCheck, Loader2 } from 'lucide-react'

export default function PromoteButton({
  runId,
  defaultName,
}: {
  runId: string
  defaultName: string
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePromote = async () => {
    setLoading(true)
    setError(null)
    const res = await saveRunToRegistry(runId, defaultName)

    if (res.success) {
      setDone(true)
    } else {
      setError(res.error || 'Promotion Failed')
    }
    setLoading(false)
  }

  if (done)
    return (
      <div className="flex items-center gap-2 text-blue-500 text-[10px] font-black uppercase border border-blue-500/30 bg-blue-500/10 px-4 py-2 rounded-lg">
        <ShieldCheck size={14} /> Vaulted
      </div>
    )

  return (
    <button
      onClick={handlePromote}
      disabled={loading}
      className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-all text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-600/20"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
      {done ? '✓ Promoted' : error ? '! Retry' : loading ? 'Syncing...' : 'Promote to Golden'}
    </button>
  )
}
