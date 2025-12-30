import { db, TestRun, TestLog } from '@/lib/db'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import SaveTestButton from '@/app/components/SaveTestButton'
import StepCard from '@/app/components/StepCard'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function RunDetailsPage({ params }: PageProps) {
  const resolvedParams = await params
  const runId = resolvedParams.id

  // 1. Fetch Metadata
  const run = db.prepare('SELECT * FROM test_runs WHERE run_id = ?').get(runId) as
    | TestRun
    | undefined

  if (!run) {
    console.error(`Run ID ${runId} not found`)
    notFound()
  }

  // 2. Fetch Logs
  const logs = db
    .prepare('SELECT * FROM logs WHERE run_id = ? ORDER BY id ASC')
    .all(runId) as TestLog[]

  // 3. Find Victory Screenshot
  const successLog = logs.find(l => l.action === 'screenshot' && l.status === 'PASSED')
  const screenshotFilename = successLog?.description?.split('IMG:')[1]?.trim()

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-slate-200">
      <div className="mx-auto max-w-6xl">
        {/* Navigation */}
        <div className="mb-6 flex justify-start">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        {/* Header Card */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-0">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white mb-2">Execution Details</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                <span className="font-mono rounded border border-slate-800 bg-slate-950/40 px-2 py-1">
                  {run.run_id}
                </span>
                <span>•</span>
                <span>{new Date(run.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-3">
              <SaveTestButton runId={run.run_id} />
              <div
                className={`rounded-lg border px-4 py-2 text-sm font-bold tracking-wide uppercase ${
                  run.status === 'PASSED'
                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}
              >
                {run.status}
              </div>
            </div>
          </div>

          {/* Business Intent */}
          <div className="mt-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Business Intent
            </h3>
            <p className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-lg font-medium italic text-slate-300">
              &quot;{run.intent}&quot;
            </p>
          </div>
        </div>

        {/* Hero Screenshot */}
        {screenshotFilename && (
          <div className="mb-8">
            <h3 className="mb-2 ml-1 text-xs font-bold uppercase tracking-wider text-slate-500">
              Final State Capture
            </h3>
            <div className="relative overflow-hidden rounded-xl border border-slate-800 shadow-2xl group bg-slate-900">
              {/* Browser Toolbar Mock */}
              <div className="flex h-8 items-center gap-1.5 border-b border-slate-800 bg-slate-900 px-4 text-[10px] text-slate-500 font-mono">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <div className="h-2.5 w-2.5 rounded-full bg-slate-700" />
                <span className="ml-2 truncate">localhost:3000/success</span>
              </div>

              {/* Screenshot */}
              <Image
                src={`/screenshots/${screenshotFilename}`}
                alt="Final Success State"
                width={1280}
                height={720}
                className="w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
                unoptimized
              />
            </div>
          </div>
        )}

        {/* Timeline Steps */}
        <div className="space-y-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
            Step-by-Step Execution
          </h2>

          <div className="relative pl-6 border-l-2 border-slate-800 space-y-6">
            {logs.map(log => (
              <StepCard
                key={log.id}
                step={{
                  ...log,
                  description: log.description || log.details || 'No details provided',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
