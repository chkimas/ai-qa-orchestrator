'use client'

import { useState } from 'react'
import { saveRunToRegistry } from '@/lib/actions'
import { BookmarkPlus, X, Loader2 } from 'lucide-react'

// Define the response shape locally to avoid any
interface SaveResponse {
  success: boolean
  message?: string
  error?: string
}

export default function SaveTestButton({ runId }: { runId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'error'>('idle')

  async function handleSave() {
    if (!name.trim()) return
    setIsSaving(true)
    setStatus('idle')

    try {
      const result = (await saveRunToRegistry(runId, name)) as SaveResponse

      if (result.success) {
        setIsOpen(false)
        setName('')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-slate-800 text-slate-200 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-700 hover:bg-slate-700 transition"
      >
        <BookmarkPlus size={14} /> Promote to Golden
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-white">Save to Golden Library</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Give this test case a name to identify it in the registry.
            </p>

            <input
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg mb-6 text-white outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="e.g., Checkout Flow - Production"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-slate-400 font-medium disabled:opacity-30"
              >
                Cancel
              </button>
              {status === 'error' && (
                <p className="text-[9px] text-red-500 font-bold uppercase mb-2">
                  Registry Sync Failure
                </p>
              )}
              <button
                onClick={handleSave}
                disabled={!name.trim() || isSaving}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 size={14} className="animate-spin" />}
                {isSaving ? 'Saving...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
