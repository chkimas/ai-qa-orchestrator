'use client'

import { useState, useEffect, useRef } from 'react'
import { runScoutMission, getCrawlHistory, getReportContent, getVaultStatus } from '@/lib/actions'
import { supabase } from '@/lib/supabase'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { Lock, Globe, History, Download, ShieldAlert, Radar, Eye } from 'lucide-react'

interface SupabaseLogPayload {
  action: string
  status: string
  description?: string
  details?: string
  message?: string
}

interface CrawlHistoryItem {
  id: string
  url: string
  timestamp: string
}

export default function ReconScoutPage() {
  const { user } = useUser()
  const [url, setUrl] = useState('')
  const [hasKeys, setHasKeys] = useState<boolean | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [history, setHistory] = useState<CrawlHistoryItem[]>([])
  const terminalRef = useRef<HTMLDivElement>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    async function checkSecurity() {
      if (!user) return
      const vault = await getVaultStatus()
      const anyKey = Object.values(vault).some(v => v === true)
      setHasKeys(anyKey)
    }
    checkSecurity()
    refreshHistory()
  }, [user])

  const refreshHistory = async () => {
    const res = await getCrawlHistory()
    if (res.success && res.history) {
      setHistory(res.history as CrawlHistoryItem[])
    }
  }

  const handleDeploy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (status === 'running' || !hasKeys || !url) return

    setLogs('📡 ESTABLISHING UPLINK TO REMOTE NODE...\n')
    setStatus('running')

    try {
      const result = await runScoutMission(url)
      if (result.success && result.runId) {
        setRunId(result.runId)
      } else {
        throw new Error(result.message || 'Uplink Refused')
      }
    } catch (err: unknown) {
      setStatus('idle')
      const msg = err instanceof Error ? err.message : 'Unknown Error'
      setLogs(prev => prev + `❌ CRITICAL_FAILURE: ${msg}\n`)
    }
  }

  const handleDownload = async () => {
    if (!runId) return
    const res = await getReportContent(runId)
    if (res && res.execution_logs) {
      const content =
        `# ARGUS RECON REPORT: ${res.url}\nID: ${res.id}\n\n` +
        res.execution_logs.map(l => `[${l.status}] ${l.action}: ${l.message}`).join('\n')
      const blob = new Blob([content], { type: 'text/markdown' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `ARGUS_RECON_${runId.slice(0, 8)}.md`
      link.click()
    }
  }

  // Real-time Telemetry Subscription
  useEffect(() => {
    if (!runId || status !== 'running') return

    const channel = supabase
      .channel(`recon-${runId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'execution_logs',
          filter: `run_id=eq.${runId}`,
        },
        payload => {
          const newLog = payload.new as SupabaseLogPayload
          const time = new Date().toLocaleTimeString([], { hour12: false })
          const logLine = `[${time}] ${newLog.action.toUpperCase()} > ${
            newLog.description || newLog.message || newLog.details
          }\n`
          setLogs(prev => prev + logLine)

          if (newLog.status === 'COMPLETED' || newLog.status === 'FAILED') {
            setStatus('complete')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [runId, status])

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  return (
    <div className="h-screen bg-black text-slate-300 flex flex-col font-mono selection:bg-blue-500/30">
      {/* Tactical Top Bar */}
      <div className="h-14 border-b border-slate-800 bg-slate-950 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded">
            <Radar className="h-4 w-4 text-blue-500 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-widest uppercase">RECON_SCOUT</h1>
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter italic">
              Autonomous Site Discovery Protocol
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 border border-slate-800 bg-black rounded flex items-center gap-2 text-[10px] font-black">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'running'
                  ? 'bg-green-500 animate-pulse'
                  : status === 'complete'
                  ? 'bg-blue-500'
                  : 'bg-slate-700'
              }`}
            />
            {status.toUpperCase()}
          </div>
          {status === 'complete' ? (
            <button
              onClick={() => {
                setStatus('idle')
                setLogs('')
                setRunId(null)
              }}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase rounded transition-all"
            >
              New_Deployment
            </button>
          ) : (
            <button
              onClick={() => handleDeploy()}
              disabled={status === 'running' || !hasKeys}
              className="px-6 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-20 text-white text-[10px] font-black uppercase rounded transition-all shadow-lg shadow-blue-600/20"
            >
              Deploy_Agent
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Parameters */}
        <aside className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col p-6 space-y-8 overflow-y-auto">
          {!hasKeys && (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-500 mb-2 font-black text-[10px] uppercase">
                <ShieldAlert size={14} /> Security_Lock
              </div>
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                Agent deployment requires neural keys. Initialize System Vault to continue.
              </p>
              <Link
                href="/settings"
                className="block text-center py-2 bg-red-600 text-white text-[10px] font-black uppercase rounded"
              >
                Configure_Vault
              </Link>
            </div>
          )}

          <section className="space-y-4">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Globe size={12} /> Target_Endpoint
            </label>
            <input
              value={url}
              onChange={e => setUrl(e.target.value)}
              disabled={status === 'running'}
              placeholder="https://example.com"
              className="w-full bg-black border border-slate-800 rounded p-3 text-xs text-blue-400 outline-none focus:border-blue-500 transition-colors"
            />
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-900">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Auth_Overide (Optional)
            </label>
            <div className="space-y-2">
              <div className="relative">
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={status === 'running'}
                  placeholder="Identifier / User"
                  className="w-full bg-black border border-slate-800 rounded p-3 text-xs text-blue-400 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={status === 'running'}
                  placeholder="Credential / Pass"
                  className="w-full bg-black border border-slate-800 rounded p-3 text-xs text-blue-400 outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
            <p className="text-[9px] text-slate-700 italic leading-tight">
              If provided, Argus will attempt to bypass entry gates using these credentials during
              the crawl.
            </p>
          </section>

          <section className="flex-1">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 mb-4">
              <History size={12} /> Mission_History
            </label>
            <div className="space-y-2">
              {history.length > 0 ? (
                history.map(item => (
                  <div
                    key={item.id}
                    className="p-2 border border-slate-900 bg-slate-900/20 rounded group hover:border-slate-700 transition-all"
                  >
                    <p className="text-[10px] text-slate-400 truncate font-bold">{item.url}</p>
                    <p className="text-[8px] text-slate-600 mt-1">
                      {new Date(item.timestamp).toLocaleDateString()} {'//'} {item.id.slice(0, 8)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-[10px] text-slate-700 italic">No previous logs...</div>
              )}
            </div>
          </section>
        </aside>

        {/* Right Side: Live Terminal */}
        <section className="flex-1 bg-black flex flex-col relative">
          <div className="absolute inset-0 pointer-events-none border-20 border-transparent shadow-[inset_0_0_100px_rgba(0,0,0,0.5)] z-10" />

          <div className="h-8 bg-slate-950 border-b border-slate-800 flex items-center px-4 justify-between shrink-0">
            <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
              Live_Telemetry_Stream
            </span>
            <div className="flex gap-1">
              <div className="h-1 w-1 rounded-full bg-slate-800" />
              <div className="h-1 w-1 rounded-full bg-slate-800" />
              <div className="h-1 w-1 rounded-full bg-slate-800" />
            </div>
          </div>

          <div
            ref={terminalRef}
            className="flex-1 p-6 overflow-y-auto scrollbar-hide font-mono text-[11px] leading-relaxed"
          >
            {logs ? (
              <pre className="text-blue-400/90 whitespace-pre-wrap">{logs}</pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Eye size={48} className="mb-4" />
                <p className="text-[10px] font-black uppercase tracking-[0.5em]">Awaiting_Input</p>
              </div>
            )}
            {status === 'running' && (
              <span className="inline-block w-2 h-4 bg-blue-500 align-middle ml-1 animate-pulse" />
            )}
          </div>

          {/* Terminal Footer Actions */}
          {status === 'complete' && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end animate-in fade-in slide-in-from-bottom-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 text-blue-500 hover:text-blue-400 text-[10px] font-black uppercase transition-all"
              >
                <Download size={12} /> Download_Recon_Report.md
              </button>
            </div>
          )}
        </section>
      </div>

      {/* System Status Bar */}
      <footer className="h-8 bg-slate-950 border-t border-slate-900 px-6 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest shrink-0">
        <div className="flex items-center gap-6">
          <span>
            Uplink: <span className="text-green-600">Secure</span>
          </span>
          <span>
            Node: <span className="text-slate-400">ARGUS_RECON_ALPHA</span>
          </span>
        </div>
        <span>v1.2.0-STABLE</span>
      </footer>
    </div>
  )
}
