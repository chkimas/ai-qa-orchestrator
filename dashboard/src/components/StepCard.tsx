'use client'

import Image from 'next/image' // Added for optimization
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Code,
  MousePointer2,
  Type,
  Search,
  Shield,
} from 'lucide-react'

interface StepProps {
  step: {
    step_id: number
    action: string
    status: string
    message: string
    role: string // Added role to interface
    selector?: string
    value?: string
    screenshot_url?: string
    created_at: string
  }
}

export default function StepCard({ step }: StepProps) {
  const isError = step.status === 'FAILED' || step.status === 'ERROR'
  const isComplete = step.status === 'COMPLETED' || step.status === 'SUCCESS'
  const isSystem = step.role === 'system'

  const getIcon = () => {
    if (isSystem) return <Shield size={14} className="text-blue-400" />
    if (step.action.toLowerCase().includes('click')) return <MousePointer2 size={14} />
    if (step.action.toLowerCase().includes('input')) return <Type size={14} />
    if (step.action.toLowerCase().includes('verify')) return <CheckCircle2 size={14} />
    return <Activity size={14} />
  }

  return (
    <div className={`relative flex gap-6 group`}>
      {/* Step Indicator */}
      <div
        className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
          isError
            ? 'bg-red-500/10 border-red-500/40 text-red-500'
            : isComplete
            ? 'bg-green-500/10 border-green-500/40 text-green-500'
            : isSystem
            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
            : 'bg-slate-900 border-slate-700 text-slate-400'
        }`}
      >
        {isError ? <AlertCircle size={18} /> : isComplete ? <CheckCircle2 size={18} /> : getIcon()}
      </div>

      <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 hover:border-slate-700 transition-colors">
        <header className="flex justify-between items-start mb-3">
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Step_{step.step_id.toString().padStart(2, '0')} {'//'} {step.action}
            </span>
            <p className="text-sm text-slate-200 font-medium leading-relaxed">{step.message}</p>
          </div>
          <span className="text-[9px] font-mono text-slate-600 uppercase">
            {step.role} {'//'}{' '}
            {new Date(step.created_at).toLocaleTimeString([], {
              hour12: false,
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </header>

        {(step.selector || step.value) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {step.selector && (
              <div className="bg-black/40 rounded-lg p-2 border border-slate-800/50 flex items-center gap-2">
                <Search size={12} className="text-blue-500" />
                <code className="text-[10px] text-blue-400 truncate font-mono">
                  {step.selector}
                </code>
              </div>
            )}
            {step.value && (
              <div className="bg-black/40 rounded-lg p-2 border border-slate-800/50 flex items-center gap-2">
                <Code size={12} className="text-yellow-500" />
                <code className="text-[10px] text-yellow-500 truncate font-mono">{step.value}</code>
              </div>
            )}
          </div>
        )}

        {step.screenshot_url && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 relative aspect-video">
            <Image
              src={step.screenshot_url}
              alt="Argus Intelligence Capture"
              fill
              unoptimized // dynamic screenshots from workers are usually better served unoptimized
              className="object-cover opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>
    </div>
  )
}
