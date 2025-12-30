import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import NewRunModal from '@/components/NewRunModal'
import RiskHeatmap from '@/components/RiskHeatmap'
import { Trash2, ArrowRight, Activity, Globe } from 'lucide-react'
import { deleteRun, getRiskHeatmap } from '@/lib/actions'

export default async function Home() {
  // 1. Fetch from Supabase instead of local SQLite
  const { data: runs, error } = await supabase
    .from('test_runs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Supabase Fetch Error:', error.message)
  }

  const runData = runs || []
  const heatmapData = await getRiskHeatmap()

  return (
    <main className="p-8 mx-auto min-h-screen bg-slate-950 text-slate-200">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-500" />
            Mission Control
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage cloud-hybrid AI automation sessions</p>
        </div>
        <NewRunModal />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden h-fit">
          <table className="w-full table-fixed text-left border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800">
              <tr>
                <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-32">
                  Status
                </th>
                <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">
                  Target & Intent
                </th>
                <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-48 text-center">
                  Launched At
                </th>
                <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-24 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {runData.map(run => (
                <tr key={run.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm
                      ${
                        run.status === 'COMPLETED'
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : run.status === 'FAILED'
                          ? 'bg-red-500/10 text-red-400 border-red-500/20'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                      }`}
                    >
                      {run.status || 'QUEUED'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col truncate">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                        <Globe className="w-3 h-3" />
                        <span className="truncate">{run.url}</span>
                      </div>
                      <Link
                        href={`/runs/${run.id}`}
                        className="font-medium text-slate-200 hover:text-blue-400 transition-colors truncate"
                      >
                        {run.intent}
                      </Link>
                    </div>
                  </td>
                  <td className="p-4 text-center text-slate-500 text-xs font-mono">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td className="p-4 text-right flex justify-end gap-2 items-center">
                    <Link
                      href={`/runs/${run.id}`}
                      className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <form
                      action={async () => {
                        'use server'
                        await deleteRun(run.id)
                      }}
                    >
                      <button
                        type="submit"
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {runData.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-3">
                      <Activity className="w-10 h-10 text-slate-700" />
                      <p className="text-lg font-medium text-slate-400">No Mission Logs</p>
                      <p className="text-xs text-slate-600">
                        Start a new run to populate the cloud database.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <RiskHeatmap data={heatmapData} />
          <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
            <h4 className="text-[10px] uppercase font-bold text-slate-500 mb-2">System Health</h4>
            <p className="text-2xl font-mono text-blue-400">
              {runData.length} <span className="text-xs text-slate-600">Total Runs</span>
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
