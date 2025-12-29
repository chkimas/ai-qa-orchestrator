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
  // FIXED: output -> description
  const successLog = logs.find(l => l.action === 'screenshot' && l.status === 'PASSED')
  const screenshotFilename = successLog?.description?.split('IMG:')[1]?.trim()

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Navigation */}
        <div className="mb-6 flex justify-between items-center">
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
              <div className="flex gap-2 text-sm">
                <span className="text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
                  {run.run_id}
                </span>
                <span className="text-slate-400 self-center">•</span>
                <span className="text-slate-500 self-center">
                  {new Date(run.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <SaveTestButton runId={run.run_id} />
              <div
                className={`px-4 py-2 rounded-lg font-bold text-sm tracking-wide uppercase border ${
                  run.status === 'PASSED'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {run.status}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Business Intent
            </h3>
            <p className="text-lg text-slate-800 bg-slate-50 p-4 rounded-lg border border-slate-100 font-medium italic">
              &quot;{run.intent}&quot;
            </p>
          </div>
        </div>

        {/* 📸 HERO SCREENSHOT */}
        {screenshotFilename && (
          <div className="mb-8 group">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
              Final State Capture
            </h3>
            <div className="rounded-xl overflow-hidden border border-slate-200 shadow-md transition-shadow hover:shadow-xl relative">
              {/* Browser Toolbar Mockup */}
              <div className="bg-slate-100 border-b border-slate-200 h-8 flex items-center px-4 gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div>
                <div className="ml-2 text-[10px] text-slate-400 font-mono">
                  localhost:3000/success
                </div>
              </div>
              {/* Optimized Image Component */}
              <Image
                src={`/screenshots/${screenshotFilename}`}
                alt="Final Success State"
                width={1280}
                height={720}
                className="w-full h-auto object-cover opacity-95 group-hover:opacity-100 transition-opacity"
                unoptimized // Safer for local screenshots
              />
            </div>
          </div>
        )}

        {/* Timeline Steps */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            Step-by-Step Execution
          </h2>

          <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
            {logs.map(log => (
              <StepCard key={log.id} step={log} />
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
