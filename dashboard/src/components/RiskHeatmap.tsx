'use client'

import { RiskItem } from '@/lib/actions'

interface RiskHeatmapProps {
  data: RiskItem[]
}

export default function RiskHeatmap({ data }: RiskHeatmapProps) {
  if (data.length === 0) return null

  return (
    <div className="space-y-4 p-4 bg-slate-900/50 border border-slate-800 rounded-xl">
      <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        Predictive Stability Heatmap
      </h3>

      <div className="space-y-3">
        {data.map(item => (
          <div key={item.url} className="group">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-mono text-slate-300 truncate max-w-45">
                {item.url}
              </span>
              <span
                className={`text-[10px] font-bold ${
                  item.status === 'CRITICAL' ? 'text-red-500' : 'text-orange-400'
                }`}
              >
                {item.risk_score}% RISK
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden shadow-inner">
              <div
                className={`h-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(239,68,68,0.5)] ${
                  item.status === 'CRITICAL'
                    ? 'bg-linear-to-r from-red-600 to-red-400'
                    : 'bg-linear-to-r from-orange-600 to-orange-400'
                }`}
                style={{ width: `${item.risk_score}%` }}
              />
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[9px] text-slate-500 italic uppercase">
                {item.recommendation}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {item.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
