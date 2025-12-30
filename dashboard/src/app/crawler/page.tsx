'use client'

import { useState, useEffect, useRef } from 'react'
import { runScoutTest, getRunLogs, getReportContent, getCrawlHistory } from '../actions'
import { Terminal, Play, RotateCcw, Lock, Globe, History, Download } from 'lucide-react'

interface CrawlHistoryItem {
  id: number
  url: string
  report_path: string
  timestamp: string
}

export default function CrawlerPage() {
  const [url, setUrl] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const [status, setStatus] = useState<'idle' | 'running' | 'complete'>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [logs, setLogs] = useState<string>('')
  const [reportFile, setReportFile] = useState<string | null>(null)
  const [history, setHistory] = useState<CrawlHistoryItem[]>([])

  const terminalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    refreshHistory()
  }, [])

  const refreshHistory = async () => {
    const res = await getCrawlHistory()
    if (res.success) setHistory(res.history as CrawlHistoryItem[])
  }

  const handleDeploy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (status === 'running') return

    setLogs('')
    setReportFile(null)
    setStatus('running')

    try {
      const result = await runScoutTest(url, username, password)
      if (result.success && result.runId) {
        setRunId(result.runId)
      } else {
        throw new Error(result.message || 'Failed to start')
      }
    } catch {
      setStatus('idle')
      alert('Failed to deploy scout')
    }
  }

  const handleDownload = async () => {
    if (!reportFile) return
    const res = await getReportContent(reportFile)
    if (res.success && res.content) {
      const blob = new Blob([res.content], { type: 'text/markdown' })
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', reportFile)
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  }

  const handleReset = () => {
    setStatus('idle')
    setLogs('')
    setRunId(null)
    setReportFile(null)
    refreshHistory()
  }

  useEffect(() => {
    if (!runId || status === 'complete') return

    const interval = setInterval(async () => {
      const result = await getRunLogs(runId)
      setLogs(result.logs)

      if (result.logs.includes('Scout Mission Complete')) {
        setStatus('complete')
        const match = result.logs.match(/Report:\s+(QA_REPORT_[\w.-]+\.md)/)
        if (match) setReportFile(match[1])
        clearInterval(interval)
      }

      if (result.logs.includes('Process exited')) {
        setStatus('complete')
        clearInterval(interval)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [runId, status])

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [logs])

  const inputBaseClass = `w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none disabled:opacity-50 transition-colors`

  return (
    <div className="h-full bg-slate-950 text-slate-200 flex flex-col font-sans">
      <div className="h-14 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Terminal className="h-4 w-4 text-blue-400" />
          <div>
            <h1 className="font-semibold text-sm leading-none">CRAWLER</h1>
            <span className="text-xs text-slate-500 font-mono italic">
              Comprehensive, Recursive, Automated, Web, Lifecycle, Evaluation & Reporting
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-mono border border-slate-800 rounded px-3 py-1 bg-slate-950">
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'running'
                  ? 'bg-green-500 animate-pulse'
                  : status === 'complete'
                  ? 'bg-blue-400'
                  : 'bg-slate-600'
              }`}
            />
            {status.toUpperCase()}
          </div>

          {status === 'complete' ? (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded transition-all"
            >
              <RotateCcw className="h-3 w-3" /> New Run
            </button>
          ) : (
            <button
              onClick={() => handleDeploy()}
              disabled={status === 'running'}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-medium rounded transition-all ${
                status === 'running'
                  ? 'bg-slate-800 text-slate-500'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Play className="h-3 w-3 fill-current" />{' '}
              {status === 'running' ? 'Executing...' : 'Deploy Agent'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 border-r border-slate-800 bg-slate-900 flex flex-col overflow-y-auto">
          <form onSubmit={handleDeploy} className="p-5 space-y-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">
                <Globe className="h-3 w-3" /> Target Endpoint
              </div>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                disabled={status === 'running'}
                placeholder="https://..."
                className={inputBaseClass}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 mb-3 font-bold">
                <Lock className="h-3 w-3" /> Authentication (Optional)
              </div>
              <div className="space-y-2">
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  disabled={status === 'running'}
                  placeholder="Username"
                  className={inputBaseClass}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={status === 'running'}
                  placeholder="Password"
                  className={inputBaseClass}
                />
              </div>
            </div>
          </form>

          <div className="flex-1 p-5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-500 mb-4 font-bold">
              <History className="h-3 w-3" /> Recent Activity
            </div>
            <div className="space-y-2">
              {history.length > 0 ? (
                history.map(item => (
                  <div
                    key={item.id}
                    className="group p-2 rounded bg-slate-950/50 border border-slate-800 hover:border-slate-700 transition-all"
                  >
                    <p className="text-[11px] font-mono text-slate-300 truncate">{item.url}</p>
                    <p className="text-[9px] text-slate-600 mt-1">
                      {new Date(item.timestamp).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-700 italic">No past runs found</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 bg-black relative flex flex-col">
          <div className="h-8 bg-slate-950 border-b border-slate-800 flex items-center px-4 justify-between">
            <span className="text-[10px] text-slate-500 font-mono tracking-tighter">
              STREAM_ID: {runId || 'NULL'}
            </span>
            {status === 'running' && (
              <span className="text-[10px] text-green-500 animate-pulse font-bold">
                ● LIVE_FEED
              </span>
            )}
          </div>

          <div
            ref={terminalRef}
            className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
          >
            {logs ? (
              <pre className="text-green-400/90 whitespace-pre-wrap">{logs}</pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-800 gap-4">
                <Terminal className="h-12 w-12 opacity-10" />
                <p className="text-sm font-light tracking-widest uppercase opacity-30">
                  Uplink Ready
                </p>
              </div>
            )}
            {status === 'running' && (
              <span className="inline-block w-2 h-4 bg-green-500 align-middle ml-1 animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <div className="h-10 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-[10px] font-mono text-slate-500 uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <span>
            Enc: <span className="text-slate-300">UTF-8</span>
          </span>
          <span>
            Buffer: <span className="text-slate-300">Unbuffered</span>
          </span>
        </div>

        {status === 'complete' && reportFile && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 font-bold transition-colors"
          >
            <Download className="h-3 w-3" /> Download MD Report
          </button>
        )}
      </div>
    </div>
  )
}
