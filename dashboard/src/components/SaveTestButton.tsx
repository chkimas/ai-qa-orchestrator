'use client'

import { useState, useEffect, useRef } from 'react'
import { saveRunToRegistry } from '@/lib/actions'
import { BookmarkPlus, X, Loader2 } from 'lucide-react'

export default function SaveTestButton({ runId }: { runId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSaving])

  async function handleSave() {
    if (!name.trim() || isSaving) return
    setIsSaving(true)
    setStatus('idle')

    try {
      const result = await saveRunToRegistry(runId, name)

      if (result.success) {
        setStatus('success')
        setTimeout(() => {
          setIsOpen(false)
          setName('')
          setStatus('idle')
        }, 1500)
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    } finally {
      setIsSaving(false)
    }
  }

  function handleClose() {
    if (isSaving) return
    setIsOpen(false)
    setName('')
    setStatus('idle')
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
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          aria-describedby="modal-description"
        >
          <div
            ref={modalRef}
            className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 id="modal-title" className="font-bold text-lg text-white">
                Save to Golden Library
              </h3>
              <button
                onClick={handleClose}
                disabled={isSaving}
                className="text-slate-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <p id="modal-description" className="text-xs text-slate-400 mb-4">
              Give this test case a name to identify it in the registry.
            </p>

            <form
              onSubmit={e => {
                e.preventDefault()
                handleSave()
              }}
            >
              <input
                className="w-full bg-slate-950 border border-slate-800 p-3 rounded-lg mb-4 text-white outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Checkout Flow - Production"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={isSaving || status === 'success'}
                autoFocus
                aria-label="Test case name"
              />
            </form>

            {status === 'success' && (
              <div className="mb-4 p-3 bg-green-950/30 border border-green-500/30 rounded-lg animate-in fade-in">
                <p className="text-xs text-green-400 font-medium">
                  ✓ Successfully saved to Golden Library
                </p>
              </div>
            )}

            {status === 'error' && (
              <div className="mb-4 p-3 bg-red-950/30 border border-red-500/30 rounded-lg animate-in fade-in">
                <p className="text-xs text-red-400 font-medium">
                  Failed to save test case. Please try again.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                disabled={isSaving || status === 'success'}
                className="px-4 py-2 text-sm text-slate-400 font-medium hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name.trim() || isSaving || status === 'success'}
                aria-busy={isSaving}
                className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSaving && (
                  <Loader2
                    size={14}
                    className="animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                {isSaving ? 'Saving...' : 'Confirm Promotion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
