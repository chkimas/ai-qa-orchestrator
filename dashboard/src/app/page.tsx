import { db, TestRun } from '@/lib/db'
import Link from 'next/link'
import NewRunModal from '@/app/components/NewRunModal'
import { Trash2, ArrowRight, Activity } from 'lucide-react'
import { deleteRun } from './actions'

export default async function Home() {
  const runs = db.prepare('SELECT * FROM test_runs ORDER BY created_at DESC').all() as TestRun[]

  return (
    // Updated: Dark background for the main area
    <main className="p-8 max-w-6xl mx-auto min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Activity className="w-6 h-6 text-blue-500" />
            Run History
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage your AI automation sessions</p>
        </div>
        <NewRunModal />
      </div>

      {/* Table Card - Dark Mode */}
      <div className="bg-slate-900 rounded-xl shadow-xl border border-slate-800 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-950 border-b border-slate-800">
            <tr>
              <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-32">
                Status
              </th>
              <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider">
                Intent (Hover to reveal)
              </th>
              <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-48">
                Time
              </th>
              <th className="p-4 font-semibold text-slate-400 text-xs uppercase tracking-wider w-24 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {runs.map(run => (
              <tr key={run.run_id} className="hover:bg-slate-800/50 transition-colors group">
                {/* Status Badge - Updated for Dark Mode Contrast */}
                <td className="p-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shadow-sm
                    ${
                      run.status === 'PASSED'
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : run.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
                    }`}
                  >
                    {run.status || 'RUNNING'}
                  </span>
                </td>

                {/* Intent Column - Truncated with Tooltip */}
                <td className="p-4">
                  <Link
                    href={`/runs/${run.run_id}`}
                    title={run.intent} // <--- Native Browser Tooltip
                    className="font-medium text-slate-200 hover:text-blue-400 flex items-center gap-2 transition-colors max-w-md"
                  >
                    <span className="truncate">{run.intent}</span>
                  </Link>
                </td>

                {/* Time */}
                <td className="p-4 text-slate-500 text-xs font-mono">
                  {new Date(run.created_at).toLocaleString()}
                </td>

                {/* Actions */}
                <td className="p-4 text-right flex justify-end gap-2 items-center">
                  <Link
                    href={`/runs/${run.run_id}`}
                    className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="View Details"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <form
                    action={async () => {
                      'use server'
                      await deleteRun(run.run_id)
                    }}
                  >
                    <button
                      type="submit"
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Run"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {runs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-16 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-3">
                    <Activity className="w-10 h-10 text-slate-700" />
                    <p className="text-lg font-medium text-slate-400">No runs found</p>
                    <p className="text-xs text-slate-600">
                      Click &quot;New Test Run&quot; to start automating.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}
