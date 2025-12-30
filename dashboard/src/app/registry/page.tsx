import { supabase } from '@/lib/supabase'
import RunSavedButton from '@/components/RunSavedButton'
import { Archive, Calendar, FileCode, PlusCircle } from 'lucide-react'

interface SavedTest {
  id: number
  name: string
  intent: string
  created_at: string
}

export default async function RegistryPage() {
  const { data, error } = await supabase
    .from('saved_tests')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) console.error('Registry Fetch Error:', error.message)

  const savedTests = (data as SavedTest[]) || []

  return (
    <main className="w-full p-8 mx-auto min-h-screen bg-slate-950 text-slate-200">
      <div className="flex justify-between items-end mb-10 border-b border-slate-900 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Archive className="w-8 h-8 text-blue-500" />
            Golden Library
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Verified &quot;Source of Truth&quot; test cases for regression-intelligence.
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-mono text-slate-500 uppercase tracking-wider">
            Total Blueprints
          </span>
          <p className="text-2xl font-bold text-white">{savedTests.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savedTests.length === 0 && (
          <div className="col-span-full py-20 text-center rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/50">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
                <PlusCircle className="w-8 h-8 text-slate-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-white">No blueprints saved</p>
                <p className="text-sm text-slate-500 mt-1">
                  Promote a successful run from Mission Control to save it here.
                </p>
              </div>
            </div>
          </div>
        )}

        {savedTests.map(test => (
          <div
            key={test.id}
            className="group relative bg-slate-900 rounded-xl border border-slate-800 p-6 hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-300 flex flex-col"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                <FileCode className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                <Calendar className="w-3 h-3" />
                {new Date(test.created_at).toLocaleDateString()}
              </div>
            </div>

            <div className="flex-1">
              <h3 className="font-bold text-lg text-white mb-2 group-hover:text-blue-300 transition-colors">
                {test.name}
              </h3>
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">{test.intent}</p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-mono">ID: {test.id}</span>
              <RunSavedButton testId={test.id} />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
