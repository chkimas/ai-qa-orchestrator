import { getSupabaseAdmin } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'
import Link from 'next/link'
import { auth } from '@clerk/nextjs/server'
import NewRunModal from '@/components/NewRunModal'
import RiskHeatmap from '@/components/RiskHeatmap'
import { Trash2, ArrowRight, Globe, ShieldAlert, Cpu } from 'lucide-react'
import { deleteRun, getRiskHeatmap, hasValidConfig } from '@/lib/actions'
import { TestRun } from '@/types/database'

export const metadata = {
  title: 'Mission Control',
  description: 'Manage active Neural Watchman nodes and view risk heatmaps.',
  robots: 'noindex, nofollow',
}

export default async function Home() {
  const { userId } = await auth()

  if (!userId) return null // Handled by proxy middleware

  const hasConfig = await hasValidConfig(userId)
  const supabaseAdmin = getSupabaseAdmin()

  // High-performance fetch for current user missions
  const { data: runs, error } = (await supabaseAdmin
    .from('test_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })) as {
    data: TestRun[] | null
    error: PostgrestError | null
  }

  if (error) console.error('[ARGUS DB ERROR]:', error.message)

  const runData = runs || []
  const heatmapData = await getRiskHeatmap()

  return (
    <main className="p-8 mx-auto min-h-screen bg-slate-950 text-slate-200 font-sans">
      {/* Alert for Missing Config */}
      {!hasConfig && (
        <div className="mb-8 p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex justify-between items-center animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={20} />
            <p className="text-xs font-bold text-red-200 uppercase tracking-widest">
              Critical Error: Neural Engines Offline. Check System Vault.
            </p>
          </div>
          <Link
            href="/settings"
            className="text-[10px] font-black bg-red-600 px-4 py-2 rounded-lg hover:bg-red-500 transition-all uppercase tracking-tighter"
          >
            Configure Vault
          </Link>
        </div>
      )}

      {/* Header Section */}
      <div className="flex justify-between items-end mb-10 border-b border-slate-900 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
              <Cpu className="w-5 h-5 text-blue-500" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase">
              Command_Center
            </h1>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] ml-12">
            Active Mission Monitoring
          </p>
        </div>
        <NewRunModal />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Missions Table */}
        <div className="lg:col-span-3 bg-slate-900/40 rounded-2xl border border-slate-800/60 overflow-hidden h-fit backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest w-32">
                  Status
                </th>
                <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest">
                  Target / Intent
                </th>
                <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest w-40 text-center">
                  Timestamp
                </th>
                <th className="p-4 text-[10px] uppercase font-black text-slate-500 tracking-widest w-24 text-right">
                  Ops
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {runData.map((run: TestRun) => (
                <tr key={run.id} className="hover:bg-blue-500/5 transition-all group">
                  <td className="p-4">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        run.status === 'COMPLETED'
                          ? 'text-green-400 border-green-500/20 bg-green-500/5'
                          : run.status === 'FAILED'
                          ? 'text-red-400 border-red-500/20 bg-red-500/5'
                          : 'text-blue-400 border-blue-500/20 bg-blue-500/5 animate-pulse'
                      }`}
                    >
                      {run.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col truncate max-w-md">
                      <span className="text-[9px] text-slate-600 flex items-center gap-1 mb-1 font-bold tracking-tighter uppercase">
                        <Globe size={10} /> {run.url}
                      </span>
                      <Link
                        href={`/runs/${run.id}`}
                        className="text-xs text-slate-200 hover:text-blue-400 truncate transition-colors"
                      >
                        {run.intent}
                      </Link>
                    </div>
                  </td>
                  <td className="p-4 text-center text-[10px] text-slate-500">
                    {run.created_at ? new Date(run.created_at).toLocaleTimeString() : '---'}
                  </td>
                  <td className="p-4 flex justify-end gap-1">
                    <Link
                      href={`/runs/${run.id}`}
                      className="p-2 text-slate-600 hover:text-blue-400 transition-colors"
                    >
                      <ArrowRight size={16} />
                    </Link>
                    <form
                      action={async () => {
                        'use server'
                        await deleteRun(run.id)
                      }}
                    >
                      <button
                        type="submit"
                        className="p-2 text-slate-600 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Predictive Analytics */}
        <aside className="lg:col-span-1 space-y-6">
          <RiskHeatmap data={heatmapData} />
        </aside>
      </div>
    </main>
  )
}
