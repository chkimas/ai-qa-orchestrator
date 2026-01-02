import { getSupabaseAdmin } from '@/lib/supabase'
import { auth } from '@clerk/nextjs/server'
import { Archive, ShieldCheck, Trash2, Globe } from 'lucide-react'
import Link from 'next/link'
import { Database } from '@/lib/supabase'
import { Metadata } from 'next'

type SavedTest = Database['public']['Tables']['saved_tests']['Row']

export const metadata: Metadata = {
  title: 'Neural Registry',
  description: 'Access the Golden Path repository for regression testing.',
  robots: 'noindex, nofollow',
}

export default async function GoldenLibraryPage() {
  const { userId } = await auth()
  if (!userId) return null

  const supabase = getSupabaseAdmin()
  const { data } = await supabase
    .from('saved_tests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const registry = (data || []) as SavedTest[]

  return (
    <main className="p-8 mx-auto min-h-screen bg-slate-950 text-slate-200">
      <header className="mb-10 flex justify-between items-end border-b border-slate-900 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
              <Archive className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
              Golden_Library
            </h1>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-12 font-mono">
            Verified_Behavioral_Baselines
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {registry.length === 0 ? (
          <div className="col-span-full py-20 border border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center opacity-20">
            <Archive size={48} className="mb-4" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em]">Registry_Empty</p>
          </div>
        ) : (
          registry.map(item => (
            <div
              key={item.id}
              className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 hover:border-blue-500/30 transition-all group relative"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-tighter">
                  <ShieldCheck size={14} /> {item.name || 'UNNAMED_TEST'}
                </div>
                <span className="text-[9px] font-mono text-slate-600">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>

              <p className="text-xs text-slate-300 mb-4 line-clamp-2 min-h-8">
                {item.intent || 'No intent description provided.'}
              </p>

              <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono mb-6 bg-black/30 p-2 rounded border border-slate-800/50">
                <Globe size={10} className="shrink-0" />
                <span className="truncate">{item.url}</span>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-800/50">
                {/* Now run_id is valid! */}
                <Link
                  href={`/runs/${item.run_id}`}
                  className={`flex-1 text-center py-2 rounded-md text-[10px] font-black uppercase transition-all ${
                    item.run_id
                      ? 'bg-slate-800 hover:bg-slate-700 text-white'
                      : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {item.run_id ? 'View Trace' : 'No Trace Link'}
                </Link>
                <button className="px-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-md transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  )
}
