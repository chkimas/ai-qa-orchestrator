import { db } from '@/lib/db'
import Link from 'next/link'
import RunSavedButton from '@/app/components/RunSavedButton'

interface SavedTest {
  id: number
  name: string
  intent: string
  created_at: string
}

export default function RegistryPage() {
  // 2. Apply the Interface
  const savedTests = db
    .prepare('SELECT * FROM saved_tests ORDER BY created_at DESC')
    .all() as SavedTest[]

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Test Registry</h1>
            <p className="text-slate-500">Golden test cases ready for regression.</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="grid gap-4">
          {savedTests.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-300">
              {/* 3. FIX: Escaped quotes (&quot;) */}
              <p className="text-slate-400">
                No saved tests yet. Go to a Run and click &quot;Save&quot;.
              </p>
            </div>
          )}

          {savedTests.map(test => (
            <div
              key={test.id}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md transition"
            >
              <div>
                <h3 className="font-bold text-lg text-slate-800">{test.name}</h3>
                <p className="text-slate-500 text-sm truncate max-w-xl">{test.intent}</p>
                <span className="text-xs text-slate-400 mt-1 block">
                  Created: {new Date(test.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex gap-2">
                <RunSavedButton testId={test.id} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
