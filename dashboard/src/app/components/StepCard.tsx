'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { CheckCircle, XCircle, Bandage, MousePointer, Type, ImageIcon, Play } from 'lucide-react'

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
  const [isImageOpen, setIsImageOpen] = useState(false)

  const isHealEvent = step.action === 'heal' || step.status === 'HEALED'
  const isScreenshot = step.description?.startsWith('IMG:')
  const screenshotFilename = isScreenshot ? step.description.replace('IMG:', '').trim() : null

  let oldSelector = ''
  let newSelector = ''
  if (isHealEvent && step.description && step.description.includes('->')) {
    const parts = step.description.replace('Healed: ', '').split('->')
    oldSelector = parts[0]?.trim().replace(/'/g, '')
    newSelector = parts[1]?.trim().replace(/'/g, '')
  }

  const getStatusIcon = () => {
    if (step.status === 'FAILED' || step.status === 'ERROR')
      return <XCircle className="w-4 h-4 text-red-400" />
    if (step.status === 'PASSED') return <CheckCircle className="w-4 h-4 text-green-400" />
    if (isHealEvent) return <Bandage className="w-4 h-4 text-orange-400" />
    if (isScreenshot) return <ImageIcon className="w-4 h-4 text-pink-400" />
    return <Play className="w-4 h-4 text-slate-400" />
  }

  const getBgColor = () => {
    if (step.status === 'FAILED') return 'bg-red-500/5 border-red-500/20'
    if (step.status === 'PASSED') return 'bg-green-500/5 border-green-500/20'
    if (isHealEvent) return 'bg-orange-500/10 border-orange-500/30'
    if (isScreenshot) return 'bg-pink-500/5 border-pink-500/20'
    return 'bg-slate-900/50 border-slate-800/50'
  }

  return (
    <>
      <div
        className={`group relative rounded-xl border border-slate-800/60 bg-slate-950/60 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-950 hover:shadow-lg hover:shadow-black/40 ${getBgColor()}`}
      >
        {/* Header + Timestamp */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3 min-w-0">
            {/* Status Icon */}
            <div className="mt-0.5 shrink-0 rounded-lg border border-slate-700/60 bg-slate-900/60 p-1.5 backdrop-blur-sm">
              {getStatusIcon()}
            </div>

            {/* Header Text */}
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="rounded-full border border-slate-700/40 bg-slate-900/40 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
                {step.role.toUpperCase()}
              </span>
              <span className="rounded-md bg-black/40 px-2 py-0.5 font-mono text-[11px] text-slate-500">
                {step.step_id}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 tracking-wide">
                {step.action.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Timestamp */}
          <div className="ml-3 text-right font-mono text-[11px] text-slate-500">
            <div>
              {new Date(step.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-[10px] text-slate-700">
              {new Date(step.timestamp).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Description */}
        {!isHealEvent && !isScreenshot && (
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-200">
            {step.description}
          </p>
        )}

        {/* Selector / Value Chips */}
        {(step.selector || step.value) && !isHealEvent && !isScreenshot && (
          <div className="mt-2 flex flex-wrap gap-2">
            {step.selector && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/5 px-2 py-1 font-mono text-[11px] text-blue-300">
                <MousePointer className="h-3 w-3" />
                {step.selector}
              </span>
            )}
            {step.value && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-indigo-500/5 px-2 py-1 font-mono text-[11px] text-indigo-300">
                <Type className="h-3 w-3" />
                {step.value.length > 28 ? `${step.value.slice(0, 28)}…` : step.value}
              </span>
            )}
          </div>
        )}

        {/* Healing Diff */}
        {isHealEvent && (
          <div className="mt-3 rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-300">
              <Bandage className="h-4 w-4" />
              Self-Healing Applied
            </p>
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex-1 rounded-md border border-red-500/30 bg-red-500/10 p-2 text-red-400 line-through">
                {oldSelector || 'Failed selector'}
              </div>
              <span className="text-slate-500">→</span>
              <div className="flex-1 rounded-md border border-green-500/30 bg-green-500/10 p-2 font-semibold text-green-400">
                {newSelector || 'Auto-fixed'}
              </div>
            </div>
          </div>
        )}

        {/* Screenshot */}
        {isScreenshot && screenshotFilename && (
          <div className="mt-3">
            <button
              onClick={() => setIsImageOpen(true)}
              className="group relative w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40 aspect-video transition hover:border-pink-500/40"
            >
              <Image
                src={`/screenshots/${screenshotFilename}`}
                alt="Screenshot"
                fill
                className="object-cover opacity-70 transition group-hover:opacity-100"
                unoptimized
              />
              <div className="absolute inset-0 flex items-end bg-linear-to-t from-black/70 via-transparent to-transparent opacity-0 transition group-hover:opacity-100">
                <span className="m-3 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                  <ImageIcon className="h-3 w-3" />
                  Expand
                </span>
              </div>
            </button>
            <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
              {screenshotFilename}
            </p>
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isImageOpen && screenshotFilename && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/95 backdrop-blur-md p-4"
          onClick={() => setIsImageOpen(false)}
        >
          <div className="relative h-full w-full max-w-6xl">
            <Image
              src={`/screenshots/${screenshotFilename}`}
              alt="Full Screenshot"
              fill
              className="object-contain rounded-xl border border-slate-800 shadow-2xl"
              unoptimized
            />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-xl border border-white/20 bg-black/70 px-5 py-2 text-xs font-mono text-white backdrop-blur-md">
              <ImageIcon className="mr-2 inline h-3 w-3" />
              {screenshotFilename}
              <span className="ml-3 text-slate-400">(click to close)</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
