'use client'

import { useMemo } from 'react'
import { RiskItem } from '@/lib/actions'
import { AlertTriangle, ShieldCheck, Activity } from 'lucide-react'

interface RiskHeatmapProps {
  data: RiskItem[]
}

const RISK_THRESHOLDS = {
  CRITICAL: 70,
  WARNING: 30,
} as const

function parseUrl(url: string) {
  const clean = url.replace('https://', '').replace('http://', '').replace('www.', '')
  const parts = clean.split('/')
  return {
    domain: parts[0],
    path: parts.slice(1).join('/') || 'root',
  }
}

function getRiskColor(score: number): string {
  if (score > RISK_THRESHOLDS.CRITICAL) {
    return 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]'
  }
  if (score > RISK_THRESHOLDS.WARNING) {
    return 'text-orange-400'
  }
  return 'text-emerald-500'
}

function getRiskBarColor(score: number): string {
  if (score > RISK_THRESHOLDS.CRITICAL) return 'bg-red-500'
  if (score > RISK_THRESHOLDS.WARNING) return 'bg-orange-500'
  return 'bg-emerald-500'
}

export default function RiskHeatmap({ data }: RiskHeatmapProps) {
  const parsedData = useMemo(
    () =>
      data.map(item => ({
        ...item,
        parsed: parseUrl(item.url),
      })),
    [data]
  )

  if (data.length === 0) {
    return (
      <div className="w-full p-6 bg-slate-900/40 border border-white/5 rounded-2xl text-[10px] text-slate-600 uppercase font-black text-center tracking-[0.3em] flex flex-col items-center gap-3">
        <Activity
          size={18}
          className="animate-pulse opacity-20 motion-reduce:animate-none"
          aria-hidden="true"
        />
        Awaiting Stability Data...
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label="Risk assessment heatmap"
      className="w-full bg-slate-900/40 border border-white/10 p-4 rounded-2xl backdrop-blur-xl relative"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="min-w-0 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
          <Activity
            size={12}
            className="text-blue-500 animate-pulse motion-reduce:animate-none"
            aria-hidden="true"
          />
          <span className="truncate">Neural Heat Index</span>
        </h3>

        <span className="shrink-0 text-[8px] font-mono text-slate-500 uppercase tracking-tighter bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
          {data.length} Nodes Active
        </span>
      </div>

      <ul className="space-y-4" role="list">
        {parsedData.map(item => (
          <li
            key={item.url}
            className="group animate-in fade-in slide-in-from-right-3 duration-500"
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 flex-1">
                <span
                  className="block truncate text-[10px] font-black text-white uppercase tracking-tight"
                  title={item.url}
                >
                  {item.parsed.domain}
                </span>
                <span className="block min-w-0 truncate text-[8px] font-mono text-slate-500 opacity-70">
                  /{item.parsed.path}
                </span>
              </div>

              <span
                className={`shrink-0 text-lg font-black italic tracking-tighter ${getRiskColor(
                  item.risk_score
                )}`}
              >
                {item.risk_score}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={item.risk_score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Risk level: ${item.risk_score}%`}
              className="mt-2 w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-white/5"
            >
              <div
                className={`h-full transition-all duration-1000 ease-out motion-reduce:transition-none ${getRiskBarColor(
                  item.risk_score
                )}`}
                style={{ width: `${item.risk_score}%` }}
              />
            </div>

            <div className="mt-2 flex items-center gap-1.5 min-w-0">
              {item.status === 'CRITICAL' ? (
                <AlertTriangle
                  size={10}
                  className="text-red-500 animate-pulse motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <ShieldCheck size={10} className="text-emerald-600" aria-hidden="true" />
              )}
              <span className="min-w-0 truncate text-[9px] text-slate-500 uppercase font-black tracking-tighter">
                {item.recommendation}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
