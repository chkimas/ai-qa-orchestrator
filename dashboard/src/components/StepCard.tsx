'use client'

import { useState, useEffect } from 'react'
import {
  Activity,
  CheckCircle2,
  AlertCircle,
  Code,
  MousePointer2,
  Type,
  Search,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { ExecutionLog } from '@/types/database'

interface StepProps {
  step: ExecutionLog
}

export default function StepCard({ step }: StepProps) {
  const [imageError, setImageError] = useState(false)
  const [displayText, setDisplayText] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)

  const isError = step.status === 'FAILED' || step.status === 'ERROR'
  const isComplete = step.status === 'COMPLETED' || step.status === 'SUCCESS'
  const isSystem = step.role === 'system'

  const fullMessage = step.message || ''
  const shouldTruncate = fullMessage.length > 150

  useEffect(() => {
    let charIndex = 0
    const interval = setInterval(() => {
      if (charIndex <= fullMessage.length) {
        setDisplayText(fullMessage.slice(0, charIndex))
        charIndex++
      } else {
        clearInterval(interval)
      }
    }, 15)

    return () => clearInterval(interval)
  }, [fullMessage])

  const getIcon = () => {
    if (isError) return <AlertCircle size={18} />
    if (isComplete) return <CheckCircle2 size={18} />
    if (isSystem) return <Shield size={14} className="text-blue-400" />
    if (step.action?.toLowerCase().includes('click')) return <MousePointer2 size={14} />
    if (step.action?.toLowerCase().includes('input')) return <Type size={14} />
    if (step.action?.toLowerCase().includes('verify')) return <CheckCircle2 size={14} />
    return <Activity size={14} />
  }

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {
        hour12: false,
        minute: '2-digit',
        second: '2-digit',
      })
    } catch {
      return '--:--:--'
    }
  }

  return (
    <div className="relative flex gap-6 group">
      <div
        className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-all ${
          isError
            ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
            : isComplete
              ? 'bg-green-500/10 border-green-500/40 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
              : isSystem
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                : 'bg-slate-900 border-slate-700 text-slate-400'
        }`}
      >
        {getIcon()}
      </div>

      <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 hover:border-slate-700 transition-colors backdrop-blur-sm">
        <header className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
              Step_{step.step_id?.toString().padStart(2, '0') ?? '00'} {'//'}{' '}
              {step.action || 'Unknown'}
            </span>
            <div className="relative">
              <p
                className={`text-sm text-slate-200 font-mono leading-relaxed transition-all duration-300 ${!isExpanded && shouldTruncate ? 'line-clamp-2' : ''}`}
              >
                {displayText}
                {displayText.length < fullMessage.length && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
                )}
              </p>

              {shouldTruncate && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-blue-500/60 hover:text-blue-400 uppercase tracking-tighter transition-colors"
                >
                  {isExpanded ? (
                    <>
                      Collapse Data <ChevronUp size={12} />
                    </>
                  ) : (
                    <>
                      Expand Neural Trace <ChevronDown size={12} />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          <span className="text-[9px] font-mono text-slate-600 uppercase whitespace-nowrap ml-4">
            {step.role} {'//'} {formatTime(step.created_at || '')}
          </span>
        </header>

        {(step.selector || step.value) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {step.selector && (
              <div className="bg-black/40 rounded-lg p-2 border border-slate-800/50 flex items-center gap-2 min-w-0">
                <Search size={12} className="text-blue-500 shrink-0" />
                <code className="text-[10px] text-blue-400 truncate font-mono">
                  {step.selector}
                </code>
              </div>
            )}
            {step.value && (
              <div className="bg-black/40 rounded-lg p-2 border border-slate-800/50 flex items-center gap-2 min-w-0">
                <Code size={12} className="text-yellow-500 shrink-0" />
                <code className="text-[10px] text-yellow-500 truncate font-mono">{step.value}</code>
              </div>
            )}
          </div>
        )}

        {step.screenshot_url && !imageError && (
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-800 relative aspect-video grayscale hover:grayscale-0 transition-all duration-700">
            {/* eslint-disable @next/next/no-img-element */}
            <img
              src={step.screenshot_url}
              alt={`Screenshot of step ${step.step_id}`}
              className="w-full h-full object-cover opacity-60 hover:opacity-100 transition-opacity"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
