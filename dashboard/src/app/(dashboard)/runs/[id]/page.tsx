import { getSupabaseWithRLS } from '@/lib/supabase-server'
import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import LiveLogViewer from '@/components/LiveLogViewer'
import { Globe, Cpu, Clock, ExternalLink, ChevronRight, ArrowLeft, ShieldAlert } from 'lucide-react'
import PromoteButton from '@/components/PromoteButton'
import { Metadata } from 'next'
import type { ExecutionLog } from '@/types/database'
import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: Promise<{ id: string }>
}

function humanizeIntent(intent: string): string {
  if (!intent) return 'Untitled Mission'

  const intentMatch = intent.match(/<user_intent>([\s\S]*?)<\/user_intent>/)
  let core = intentMatch ? intentMatch[1] : intent

  core = core
    .replace(/^\s*\d+\.\s*/gm, '')
    .replace(/\n/g, ' ')
    .trim()

  if (core.length > 60) {
    return core.substring(0, 57) + '...'
  }
  return core || 'Neural Execution'
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const { supabase } = await getSupabaseWithRLS()

  const { data: run } = await supabase.from('test_runs').select('intent').eq('id', id).single()

  const cleanTitle = run?.intent ? humanizeIntent(run.intent) : id.slice(0, 8)

  return {
    title: `Trace: ${cleanTitle}`,
    description: `Neural execution telemetry for mission ${id}`,

    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  }
}

export default async function RunPage({ params }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')
  const { id } = await params
  const { supabase } = await getSupabaseWithRLS()

  const { data: run } = await supabase
    .from('test_runs')
    .select('*, execution_logs(*)')
    .eq('id', id)
    .single()

  if (!run) notFound()

  const logs = (run.execution_logs || []) as ExecutionLog[]

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      <header className="p-6 border-b border-slate-900 bg-slate-900/20 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              <span className="text-blue-500">Missions</span>
              <ChevronRight size={10} />
              <span>{run.mode}</span>
              <ChevronRight size={10} />
              <span className="text-slate-300">{run.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tighter flex items-center gap-3">
              {humanizeIntent(run.intent)}
            </h1>
            <div className="flex items-center gap-4 pt-1">
              <Link
                href="/dashboard"
                className="h-8 w-8 rounded-full border border-slate-800 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-600 transition-all group"
              >
                <ArrowLeft
                  size={14}
                  className="group-hover:-translate-x-0.5 transition-transform"
                />
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Globe size={14} className="text-slate-600" />
                <span className="font-mono">{run.url}</span>
                <ExternalLink size={12} className="text-slate-700" />
              </div>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock size={14} className="text-slate-600" />
                <span>
                  {run.created_at ? new Date(run.created_at).toLocaleString() : 'Unknown time'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {run.mode === 'scout' && run.report_url && (
              <a
                href={run.report_url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-2 transition-all shadow-lg shadow-violet-900/20"
              >
                <ShieldAlert size={14} className="text-violet-200" />
                <span className="text-[10px] font-black uppercase tracking-widest">
                  Download_Audit
                </span>
              </a>
            )}
            <div
              className={`px-4 py-2 rounded-lg border flex items-center gap-3 ${
                run.status === 'FAILED'
                  ? 'bg-red-500/10 border-red-500/20 text-red-500'
                  : run.status === 'COMPLETED'
                    ? 'bg-green-500/10 border-green-500/20 text-green-500'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400 animate-pulse'
              }`}
            >
              <Cpu size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest">{run.status}</span>
            </div>

            {run.status === 'COMPLETED' && (
              <PromoteButton runId={run.id} defaultName={run.intent} />
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-900" />
          <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.4em]">
            Neural_Trace_Log
          </span>
          <div className="h-px flex-1 bg-slate-900" />
        </div>

        <LiveLogViewer runId={run.id} initialLogs={logs} />
      </div>
    </main>
  )
}
