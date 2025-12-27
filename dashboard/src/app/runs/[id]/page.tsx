import { db, TestRun, TestLog } from '@/lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RunDetailsPage({ params }: PageProps) {
  // 1. Await the params to get the ID
  const resolvedParams = await params
  const runId = resolvedParams.id

  // 2. Fetch Run Metadata
  const run = db.prepare('SELECT * FROM test_runs WHERE run_id = ?').get(runId) as
    | TestRun
    | undefined

  if (!run) {
    console.error(`Run ID ${runId} not found in DB`)
    notFound()
  }

  // 3. Fetch Logs (Steps)
  const logs = db
    .prepare('SELECT * FROM logs WHERE run_id = ? ORDER BY step_id ASC')
    .all(runId) as TestLog[]

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Header Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Execution Details</h1>
              <p className="text-slate-600 font-mono text-sm bg-slate-100 px-2 py-1 rounded inline-block">
                ID: {run.run_id}
              </p>
            </div>
            <div
              className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide uppercase
              ${
                run.status === 'PASSED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {run.status}
            </div>
          </div>
          <div className="mt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Business Intent
            </h3>
            <p className="text-lg text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100">
              &quot;{run.intent}&quot;
            </p>
          </div>
        </div>

        {/* Timeline Steps */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Step-by-Step Execution</h2>

          {logs.map(log => (
            <div
              key={log.id}
              className={`relative pl-8 border-l-2 ${
                log.status === 'FAILED' ? 'border-red-300' : 'border-slate-200'
              }`}
            >
              {/* Timeline Dot */}
              <div
                className={`absolute -left-2.25 top-4 w-4 h-4 rounded-full border-2 border-white
                ${
                  log.status === 'PASSED'
                    ? 'bg-green-500'
                    : log.status === 'FAILED'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
              ></div>

              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded
                    ${
                      log.role === 'customer'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {log.role}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-700 mr-2 uppercase text-xs tracking-wider">
                      {log.action}
                    </span>
                    <span className="text-slate-600">{log.details}</span>
                  </div>
                  {log.status === 'FAILED' && (
                    <span className="text-red-600 font-bold text-sm">Failed ✗</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
