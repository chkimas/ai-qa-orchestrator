'use client'

import { useState } from 'react'
import { saveRunToRegistry } from '@/lib/actions'

export default function SaveTestButton({ runId }: { runId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return

    setIsSaving(true)

    const result = await saveRunToRegistry(runId, name)

    setIsSaving(false)
    setIsOpen(false)

    // 2. Check success before celebrating
    if (result.success) {
      alert('✅ Test Saved Successfully!')
    } else {
      alert(`❌ Save Failed: ${result.message}`)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-slate-800 text-white px-3 py-1 text-sm rounded hover:bg-slate-700 transition"
      >
        💾 Save as Test Case
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h3 className="font-bold text-lg mb-4">Save Test Case</h3>
            <input
              className="w-full border p-2 rounded mb-4"
              placeholder="E.g. Login Smoke Test"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsOpen(false)} className="px-3 py-1 text-slate-500">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!name || isSaving}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
