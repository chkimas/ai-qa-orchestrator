import React from 'react'
import {
  CheckCircle,
  XCircle,
  Bandage,
  Terminal,
  MousePointer,
  Type,
  Eye,
  Clock,
} from 'lucide-react'

interface StepProps {
  step: {
    id: number
    step_id: number
    role: string
    action: string
    status: string
    description: string
    selector?: string
    value?: string
    timestamp: string
  }
}

export default function StepCard({ step }: StepProps) {
  // 1. Detect if this is a "Healing" Event
  const isHealEvent = step.action === 'heal' || step.status === 'HEALED'

  // 2. Parse "Healed: 'old' -> 'new'" string
  let oldSelector = ''
  let newSelector = ''

  if (isHealEvent && step.description && step.description.includes('->')) {
    const parts = step.description.replace('Healed: ', '').split('->')
    oldSelector = parts[0]?.trim().replace(/'/g, '')
    newSelector = parts[1]?.trim().replace(/'/g, '')
  }

  // 3. Icon Logic
  const getIcon = () => {
    if (isHealEvent) return <Bandage className="w-5 h-5 text-orange-500" />
    if (step.status === 'FAILED' || step.status === 'ERROR')
      return <XCircle className="w-5 h-5 text-red-500" />

    switch (step.action) {
      case 'click':
        return <MousePointer className="w-4 h-4 text-blue-500" />
      case 'input':
        return <Type className="w-4 h-4 text-purple-500" />
      case 'verify_text':
        return <Eye className="w-4 h-4 text-green-600" />
      case 'wait':
        return <Clock className="w-4 h-4 text-slate-400" />
      case 'navigate':
        return <Terminal className="w-4 h-4 text-yellow-600" />
      default:
        return <CheckCircle className="w-4 h-4 text-slate-300" />
    }
  }

  // 4. Color Logic
  const getBorderColor = () => {
    if (isHealEvent) return 'border-orange-200 bg-orange-50'
    if (step.status === 'FAILED') return 'border-red-200 bg-red-50'
    return 'border-slate-200 bg-white shadow-sm'
  }

  return (
    <div
      className={`relative flex items-start gap-4 p-4 mb-3 rounded-lg border ${getBorderColor()} transition-all`}
    >
      {/* Icon Wrapper */}
      <div className={`mt-1 p-2 rounded-full bg-slate-50 border border-slate-100`}>{getIcon()}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {isHealEvent ? 'SELF-HEALING TRIGGERED' : `STEP ${step.step_id} • ${step.action}`}
          </span>
          <span className="text-xs text-slate-400 font-mono">
            {new Date(step.timestamp).toLocaleTimeString()}
          </span>
        </div>

        {/* Healing Diff View */}
        {isHealEvent ? (
          <div className="mt-2">
            <p className="text-sm text-slate-600 mb-2 font-medium">Auto-fix applied:</p>
            <div className="flex flex-col sm:flex-row gap-2 font-mono text-xs">
              <div className="flex-1 px-3 py-2 bg-red-50 border border-red-100 rounded text-red-600 line-through decoration-red-400">
                {oldSelector || 'Unknown'}
              </div>
              <div className="hidden sm:block text-slate-300 self-center">➔</div>
              <div className="flex-1 px-3 py-2 bg-green-50 border border-green-100 rounded text-green-700 font-bold">
                {newSelector || 'Fixed Selector'}
              </div>
            </div>
          </div>
        ) : (
          /* Normal Step View */
          <div>
            <p className="text-sm text-slate-700 font-medium">{step.description}</p>
            {(step.selector || step.value) && (
              <div className="mt-2 flex flex-wrap gap-2 text-xs font-mono">
                {step.selector && (
                  <span className="px-2 py-1 bg-slate-100 rounded text-blue-600 border border-slate-200">
                    sel: {step.selector}
                  </span>
                )}
                {step.value && (
                  <span className="px-2 py-1 bg-slate-100 rounded text-purple-600 border border-slate-200">
                    val: {step.value}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
