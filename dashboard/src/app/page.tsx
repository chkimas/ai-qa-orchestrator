import { db, TestRun } from '@/lib/db'
import Link from 'next/link'
import NewRunModal from '@/app/components/NewRunModal'

export default function Home() {
  // Fetch runs directly from DB (Server Component Magic ✨)
  const runs = db.prepare('SELECT * FROM test_runs ORDER BY created_at DESC').all() as TestRun[]

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">AI-QA Dashboard</h1>
            <p className="text-slate-500">Orchestrator Control Plane</p>
          </div>
          <NewRunModal />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 font-semibold text-slate-600">Status</th>
                <th className="p-4 font-semibold text-slate-600">Intent</th>
                <th className="p-4 font-semibold text-slate-600">Date</th>
                <th className="p-4 font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr
                  key={run.run_id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition"
                >
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${
                        run.status === 'PASSED'
                          ? 'bg-green-100 text-green-800'
                          : run.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {run.status || 'PENDING'}
                    </span>
                  </td>
                  <td className="p-4 font-medium text-slate-900 truncate max-w-md">{run.intent}</td>
                  <td className="p-4 text-slate-500 text-sm">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <Link
                      href={`/runs/${run.run_id}`}
                      className="text-blue-600 hover:underline text-sm font-semibold"
                    >
                      View Details &rarr;
                    </Link>
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-400">
                    No test runs found. Go run the CLI!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
