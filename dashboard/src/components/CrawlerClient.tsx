'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { runScoutMission, getCrawlHistory, getVaultStatus } from '@/lib/actions'
import { supabase } from '@/lib/supabase'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import {
  Lock,
  Globe,
  History,
  ShieldAlert,
  Radar,
  ExternalLink,
  Terminal as TerminalIcon,
} from 'lucide-react'

interface CrawlHistoryItem {
  id: string
  url: string
  timestamp: string
}

interface TacticalLog {
  id: string
  text: string
  type?: 'cmd' | 'sys' | 'success' | 'ack' | 'shield' | 'sync' | 'uplink' | 'exec' | 'error'
}

export default function CrawlerClient() {
  const { user } = useUser()
  const [url, setUrl] = useState('')
  const [hasKeys, setHasKeys] = useState<boolean | null>(null)
  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [tacticalLogs, setTacticalLogs] = useState<TacticalLog[]>([])
  const [history, setHistory] = useState<CrawlHistoryItem[]>([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  const logQueueRef = useRef<Omit<TacticalLog, 'id'>[]>([])
  const isDrippingRef = useRef(false)
  const terminalRef = useRef<HTMLDivElement>(null)
  const hasCheckedRef = useRef(false)
  const isMountedRef = useRef(true)
  const hasRefreshedHistory = useRef(false)
  const progressTimeoutsRef = useRef<NodeJS.Timeout[]>([])
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isJobCompleteRef = useRef(false)
  const currentStepRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const processLogQueue = useCallback(() => {
    if (isDrippingRef.current || logQueueRef.current.length === 0) return

    isDrippingRef.current = true
    const nextItem = logQueueRef.current.shift()

    if (nextItem) {
      setTacticalLogs(prev => [...prev, { id: Math.random().toString(36), ...nextItem }])

      setTimeout(() => {
        isDrippingRef.current = false
        processLogQueue()
      }, 350)
    } else {
      isDrippingRef.current = false
    }
  }, [])

  const addTacticalLine = useCallback(
    (text: string, type?: TacticalLog['type']) => {
      logQueueRef.current.push({ text, type })
      processLogQueue()
    },
    [processLogQueue]
  )

  const startPollingJobStatus = useCallback((jobId: string) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('execution_logs')
          .select('status')
          .eq('run_id', jobId)
          .order('created_at', { ascending: false })
          .limit(1)

        if (error) throw error

        if (data && data.length > 0) {
          const latestLog = data[0]
          if (latestLog.status === 'COMPLETED' || latestLog.status === 'FAILED') {
            isJobCompleteRef.current = true
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
          }
        }
      } catch {}
    }, 3000)
  }, [])

  const simulateCrawlProgress = useCallback(() => {
    const progressSteps = [
      {
        delay: 3000,
        text: '[EXEC] Agent Perception: NAVIGATE > Establishing connection to target...',
        type: 'exec',
      },
      {
        delay: 4000,
        text: '[EXEC] Agent Perception: LOAD_PAGE > Rendering viewport and assets...',
        type: 'exec',
      },
      {
        delay: 3500,
        text: '[EXEC] Agent Perception: ANALYZE_DOM > Parsing HTML structure...',
        type: 'exec',
      },
      {
        delay: 4500,
        text: '[EXEC] Agent Perception: EXTRACT_LINKS > Discovering navigation paths...',
        type: 'exec',
      },
      {
        delay: 3800,
        text: '[EXEC] Agent Perception: SCAN_FORMS > Identifying input elements...',
        type: 'exec',
      },
      {
        delay: 4200,
        text: '[EXEC] Agent Perception: EXTRACT_TEXT > Mining readable content...',
        type: 'exec',
      },
      {
        delay: 3600,
        text: '[EXEC] Agent Perception: ANALYZE_METADATA > Processing page headers...',
        type: 'exec',
      },
      {
        delay: 5000,
        text: '[EXEC] Agent Perception: MAP_STRUCTURE > Building site topology...',
        type: 'exec',
      },
      {
        delay: 4000,
        text: '[EXEC] Agent Perception: VERIFY_SECURITY > Checking SSL certificates...',
        type: 'exec',
      },
      {
        delay: 4500,
        text: '[EXEC] Agent Perception: DEEP_CRAWL > Following discovered links...',
        type: 'exec',
      },
      {
        delay: 3800,
        text: '[EXEC] Agent Perception: EXTRACT_DATA > Capturing structured information...',
        type: 'exec',
      },
      {
        delay: 4200,
        text: '[EXEC] Agent Perception: VALIDATE_CONTENT > Cross-referencing data points...',
        type: 'exec',
      },
      {
        delay: 3500,
        text: '[EXEC] Agent Perception: ANALYZE_PATTERNS > Detecting site architecture...',
        type: 'exec',
      },
      {
        delay: 4000,
        text: '[EXEC] Agent Perception: COMPILE_REPORT > Aggregating intelligence data...',
        type: 'exec',
      },
    ]

    let stepIndex = 0
    let cumulativeDelay = 0

    const scheduleNextStep = () => {
      if (isJobCompleteRef.current || stepIndex >= progressSteps.length) {
        const timeoutId = setTimeout(() => {
          if (!isMountedRef.current) return
          addTacticalLine('[SYSTEM] Mission objective achieved. Neural trace finalized.', 'success')
          const timeoutId2 = setTimeout(() => {
            addTacticalLine(
              '[SYNC] Executive report generated. Uploading to secure vault...',
              'sync'
            )
            const timeoutId3 = setTimeout(() => {
              addTacticalLine('[UPLINK] MISSION COMPLETE. Stream terminated gracefully.', 'uplink')
              setStatus('complete')

              if (!hasRefreshedHistory.current) {
                hasRefreshedHistory.current = true
                getCrawlHistory().then(res => {
                  if (res.success && res.history && isMountedRef.current) {
                    setHistory(res.history as CrawlHistoryItem[])
                  }
                })
              }
            }, 1200)
            progressTimeoutsRef.current.push(timeoutId3)
          }, 1000)
          progressTimeoutsRef.current.push(timeoutId2)
        }, 1500)
        progressTimeoutsRef.current.push(timeoutId)
        return
      }

      const step = progressSteps[stepIndex]
      cumulativeDelay += step.delay

      const timeoutId = setTimeout(() => {
        if (!isMountedRef.current) return
        addTacticalLine(step.text, step.type as TacticalLog['type'])
        stepIndex++
        currentStepRef.current = stepIndex
        scheduleNextStep()
      }, cumulativeDelay)

      progressTimeoutsRef.current.push(timeoutId)
    }

    scheduleNextStep()
  }, [addTacticalLine])

  useEffect(() => {
    async function initReconNode() {
      if (!user || hasCheckedRef.current) return
      hasCheckedRef.current = true

      try {
        const [vault, res] = await Promise.all([getVaultStatus(), getCrawlHistory()])
        const vaultKeys = vault.keys as Record<string, boolean>
        const anyKey = Object.values(vaultKeys).some(v => v === true)

        if (isMountedRef.current) {
          setHasKeys(anyKey)
          if (res.success && res.history) {
            setHistory(res.history as CrawlHistoryItem[])
          }
        }
      } catch (err) {
        console.error('Uplink handshake failed:', err)
        if (isMountedRef.current) {
          setError('Failed to initialize recon node')
        }
      }
    }
    initReconNode()
  }, [user])

  const handleDeploy = useCallback(async () => {
    if (status === 'running' || !hasKeys || !url) return

    setError(null)
    setTacticalLogs([])
    setStatus('running')
    hasRefreshedHistory.current = false
    isJobCompleteRef.current = false
    currentStepRef.current = 0

    addTacticalLine(`$ argus mission launch --target="${url}" --mode=scout`, 'cmd')
    addTacticalLine(`[SYSTEM] Initializing Mission Brief... OK`, 'sys')
    addTacticalLine(`↳ 📡 Encoding Tactical Payload (Base64)... SUCCESS`, 'success')
    addTacticalLine(`↳ 🧠 Dispatching to Argus Neural Worker... ACKNOWLEDGED`, 'ack')
    addTacticalLine(`[SHIELD] Neural Privacy active. Stripping PII & Selectors.`, 'shield')

    try {
      const result = await runScoutMission(url, username || undefined, password || undefined)
      if (result.success && result.runId) {
        if (isMountedRef.current) {
          setRunId(result.runId)
          addTacticalLine(`[SYNC] Direct Log Ingestion... ID: ${result.runId.slice(0, 8)}`, 'sync')
          addTacticalLine(`[UPLINK] STREAM ESTABLISHED. AWAITING NEURAL LOGS.`, 'uplink')

          startPollingJobStatus(result.runId)

          setTimeout(() => {
            simulateCrawlProgress()
          }, 2000)
        }
      } else {
        throw new Error(result.message || 'Uplink Refused')
      }
    } catch (err) {
      if (isMountedRef.current) {
        setStatus('idle')
        const msg = err instanceof Error ? err.message : 'Unknown Error'
        addTacticalLine(`[ERROR] UPLINK_INTERRUPTED: ${msg}`, 'error')
        setError(msg)
      }
    }
  }, [
    status,
    hasKeys,
    url,
    username,
    password,
    addTacticalLine,
    simulateCrawlProgress,
    startPollingJobStatus,
  ])

  const handleReset = () => {
    setStatus('idle')
    setTacticalLogs([])
    setRunId(null)
    setError(null)
    setUrl('')
    setUsername('')
    setPassword('')
    hasRefreshedHistory.current = false
    isJobCompleteRef.current = false
    currentStepRef.current = 0

    progressTimeoutsRef.current.forEach(clearTimeout)
    progressTimeoutsRef.current = []

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      progressTimeoutsRef.current.forEach(clearTimeout)
      progressTimeoutsRef.current = []

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [tacticalLogs])

  return (
    <div className="h-screen bg-slate-950 text-slate-300 flex flex-col font-mono selection:bg-blue-500/30">
      <div className="h-12 border-b border-slate-800 bg-black flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Radar size={14} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            WATCHMAN_LINK // SYNAPTIC_SESSION
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 border border-slate-800 bg-slate-900 rounded flex items-center gap-2 text-[10px] font-black">
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
              onClick={handleReset}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase transition-colors"
            >
              New_Deployment
            </button>
          ) : (
            <button
              onClick={handleDeploy}
              disabled={status === 'running' || !hasKeys || !url}
              className="text-[10px] font-bold text-blue-500 hover:text-blue-400 disabled:opacity-20 uppercase transition-colors"
            >
              {status === 'running' ? 'Deploying...' : 'Execute_Mission'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col p-6 space-y-8 overflow-y-auto">
          {hasKeys === null ? (
            <div className="p-4 border border-slate-800 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 text-slate-700 font-black text-[10px] uppercase">
                <Radar size={14} className="animate-spin" /> Verifying_Credentials...
              </div>
            </div>
          ) : !hasKeys ? (
            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="flex items-center gap-2 text-red-500 mb-2 font-black text-[10px] uppercase">
                <ShieldAlert size={14} /> Security_Lock
              </div>
              <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                Agent deployment requires neural keys. Initialize System Vault.
              </p>
              <Link
                href="/settings"
                className="block text-center py-2 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase rounded transition-colors"
              >
                Configure_Vault
              </Link>
            </div>
          ) : (
            <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 font-black text-[10px] uppercase">
                <ShieldAlert size={14} /> Neural_Link_Established
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-[10px] text-red-400 font-bold">{error}</p>
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
              className="w-full bg-black border border-slate-800 rounded p-3 text-xs text-blue-400 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              onKeyDown={e => {
                if (e.key === 'Enter' && url && hasKeys && status !== 'running') {
                  handleDeploy()
                }
              }}
            />
          </section>

          <section className="space-y-3 pt-4 border-t border-slate-900">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <Lock size={12} /> Auth_Override (Optional)
            </label>
            <div className="space-y-2">
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={status === 'running'}
                placeholder="Identifier / User"
                className="w-full bg-black border border-slate-800 rounded p-3 text-xs text-blue-400 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={status === 'running'}
                placeholder="Credential / Pass"
                className="w-full bg-black border border-slate-800 rounded p-3 text-xs text-blue-400 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
              />
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
                  <Link
                    key={item.id}
                    href={`/runs/${item.id}`}
                    className="block p-2 border border-slate-900 bg-slate-900/20 rounded group hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] text-slate-400 truncate font-bold flex-1">
                        {item.url}
                      </p>
                      <ExternalLink
                        size={10}
                        className="text-slate-600 group-hover:text-blue-500 transition-colors"
                      />
                    </div>
                    <p className="text-[8px] text-slate-600 mt-1">
                      {new Date(item.timestamp).toLocaleDateString()} {'//'} {item.id.slice(0, 8)}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="text-[10px] text-slate-700 italic">No previous logs...</div>
              )}
            </div>
          </section>
        </aside>

        <main className="flex-1 bg-black p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
            <TerminalIcon size={14} className="text-blue-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Live_Telemetry_Stream
            </span>
            {runId && (
              <Link
                href={`/runs/${runId}`}
                className="ml-auto text-[9px] text-blue-500 hover:text-blue-400 font-bold uppercase flex items-center gap-1 transition-colors"
              >
                View_Full_Report <ExternalLink size={10} />
              </Link>
            )}
          </div>

          <div className="flex-1 border border-slate-800 rounded-lg bg-black overflow-hidden flex flex-col">
            <div
              ref={terminalRef}
              className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700"
            >
              <div className="max-w-4xl space-y-3">
                {tacticalLogs.length === 0 ? (
                  <div className="flex items-center gap-3 text-slate-700 text-[11px]">
                    <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
                    <span>Awaiting mission parameters...</span>
                  </div>
                ) : (
                  tacticalLogs.map((log, idx) => {
                    const isCmd = log.type === 'cmd'
                    const isIndent = log.text.startsWith('↳')

                    return (
                      <div
                        key={log.id}
                        className="flex gap-4 group animate-in fade-in slide-in-from-left-2 duration-500"
                      >
                        {!isCmd && !isIndent && (
                          <span className="text-slate-700 text-[10px] w-6 shrink-0 text-right mt-0.5">
                            {String(idx).padStart(2, '0')}
                          </span>
                        )}
                        {isIndent && <span className="w-6 shrink-0" />}

                        <div
                          className={`text-[12px] leading-relaxed font-medium flex-1 ${
                            log.type === 'cmd'
                              ? 'text-blue-400 mb-4 font-bold'
                              : log.type === 'success'
                                ? 'text-green-500'
                                : log.type === 'shield'
                                  ? 'text-purple-400'
                                  : log.type === 'uplink'
                                    ? 'text-green-500 font-bold mt-2'
                                    : log.type === 'error'
                                      ? 'text-red-500'
                                      : 'text-slate-300'
                          }`}
                        >
                          {log.text.split('...').map((part, i, arr) => (
                            <span key={i}>
                              {part}
                              {i < arr.length - 1 && <span className="text-slate-600">...</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )
                  })
                )}

                {status === 'running' && (
                  <div className="flex gap-4 pl-10">
                    <div className="w-2 h-4 bg-blue-600 animate-pulse shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                  </div>
                )}
              </div>
            </div>

            {status === 'complete' && runId && (
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end animate-in fade-in slide-in-from-bottom-2 shrink-0">
                <Link
                  href={`https://uonwvnngdtgtijiazmcw.supabase.co/storage/v1/object/public/reports/QA_REPORT_${url
                    .replace(/https?:\/\//, '')
                    .split('/')[0]
                    .replace(/\./g, '_')}_${runId}.pdf`}
                  target="_blank"
                  download
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-blue-900/20"
                >
                  <ShieldAlert size={14} />
                  Download Executive Report
                </Link>
              </div>
            )}

            <div className="h-8 bg-slate-950 border-t border-slate-800 px-4 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest shrink-0">
              <span>Node: ARGUS_RECON_ALPHA</span>
              <span>
                Uplink:{' '}
                <span className={status === 'running' ? 'text-green-600' : 'text-slate-600'}>
                  {status === 'running' ? 'Active' : 'Standby'}
                </span>
              </span>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
