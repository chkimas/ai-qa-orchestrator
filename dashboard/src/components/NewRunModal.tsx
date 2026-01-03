'use client'

import { useState, useEffect, useRef } from 'react'
import { launchMission } from '@/actions/orchestrator'
import { useUser } from '@clerk/nextjs'
import { getVaultStatus } from '@/lib/actions'
import {
  Play,
  Settings,
  Database,
  Sparkles,
  X,
  AlertCircle,
  Cpu,
  CheckCircle2,
  ShieldCheck,
  Info,
  BookOpen,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { AIProvider } from '@/types/database'

const MODEL_MAPPING: Record<string, { id: string; label: string; desc: string }[]> = {
  openai: [
    { id: 'gpt-4o', label: 'GPT-4o', desc: 'Omni engine; swift multimodal judgment.' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini', desc: 'Lean compute; high-throughput replies.' },
  ],
  gemini: [
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      desc: 'Next-gen speed; nimble multimodal inference.',
    },
    {
      id: 'gemini-1.5-pro',
      label: 'Gemini 1.5 Pro',
      desc: 'Long context; steadfast deep reasoning.',
    },
  ],
  groq: [
    {
      id: 'llama-3.3-70b-versatile',
      label: 'Llama 3.3 70B',
      desc: 'Flagship versatility; broad competence at scale.',
    },
    {
      id: 'llama-3.1-8b-instant',
      label: 'Llama 3.1 8B',
      desc: 'High-speed sprinter; ultra-low latency.',
    },
  ],
  anthropic: [
    {
      id: 'claude-3-5-sonnet-latest',
      label: 'Claude 3.5 Sonnet',
      desc: 'Keen for code; high-fidelity reasoning.',
    },
    {
      id: 'claude-3-5-haiku-latest',
      label: 'Claude 3.5 Haiku',
      desc: 'Fastest Claude; improved intelligence at scale.',
    },
  ],
  sonar: [
    {
      id: 'sonar-reasoning-pro',
      label: 'Sonar Reasoning Pro',
      desc: 'Deep solver; high-accuracy web grounded research.',
    },
    {
      id: 'sonar',
      label: 'Sonar',
      desc: 'Web-grounded chat; nimble answers with citations.',
    },
  ],
}

export default function NewRunModal() {
  const { user } = useUser()
  const hasSyncedRef = useRef(false)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [vaultStatus, setVaultStatus] = useState<Record<string, boolean>>({})
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini')
  const [hasAnyKey, setHasAnyKey] = useState<boolean>(true)
  const [isChaos, setIsChaos] = useState(false) // NEW: Chaos State
  const [error, setError] = useState<string | null>(null)

  const PROVIDERS: { id: AIProvider; name: string }[] = [
    { id: 'openai', name: 'OpenAI (GPT-4o)' },
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'groq', name: 'Groq (Llama 3)' },
    { id: 'anthropic', name: 'Anthropic (Claude)' },
    { id: 'sonar', name: 'Perplexity Sonar' },
  ]

  useEffect(() => {
    if (!isOpen) {
      hasSyncedRef.current = false
      return
    }

    async function checkVault() {
      if (!user || !isOpen) return
      const data = await getVaultStatus()
      const vaultKeys = data.keys as Record<string, boolean>
      setVaultStatus(vaultKeys)
      const anyExist = Object.values(vaultKeys).some(v => v === true)
      setHasAnyKey(anyExist)

      if (anyExist && !hasSyncedRef.current) {
        let providerToSet = selectedProvider
        if (data.preferred && vaultKeys[data.preferred]) {
          providerToSet = data.preferred as AIProvider
        } else if (!vaultKeys[selectedProvider]) {
          const firstAvailable = Object.keys(vaultKeys).find(k => vaultKeys[k]) as AIProvider
          if (firstAvailable) providerToSet = firstAvailable
        }

        setSelectedProvider(providerToSet)
        if (MODEL_MAPPING[providerToSet]) {
          setSelectedModel(MODEL_MAPPING[providerToSet][0].id)
        }
        hasSyncedRef.current = true
      }
    }
    checkVault()
  }, [isOpen, user, selectedProvider])

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    setError(null)
    const result = await launchMission(formData)

    if (result.success) {
      window.location.href = `/runs/${result.runId}`
    } else {
      setError(result.error || 'Launch Failed')
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-500 transition font-bold shadow-xl shadow-blue-900/30 flex items-center gap-2 text-sm uppercase tracking-tighter"
      >
        <Play className="w-4 h-4 fill-white" /> Initiate Mission
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            <header className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <Cpu className="text-blue-500" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tighter uppercase">
                    Sniper_Deployment
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">
                    Argus Precision Node
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors p-2"
              >
                <X size={24} />
              </button>
            </header>

            <form action={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 border-r border-slate-800 space-y-6">
                  {/* Neural Engine Selection */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Settings size={12} className="text-blue-500" /> Neural Engine
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PROVIDERS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={!vaultStatus[p.id]}
                          onClick={() => {
                            setSelectedProvider(p.id)
                            if (MODEL_MAPPING[p.id]) setSelectedModel(MODEL_MAPPING[p.id][0].id)
                          }}
                          className={`flex items-center justify-between px-3 py-2 rounded-md border transition-all text-xs outline-none ${
                            selectedProvider === p.id
                              ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_10px_rgba(59,130,246,0.15)]'
                              : 'border-slate-800/60 bg-slate-950/40 text-slate-500 hover:border-slate-700'
                          } ${
                            !vaultStatus[p.id]
                              ? 'opacity-20 cursor-not-allowed border-dashed'
                              : 'cursor-pointer'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <div
                              className={`w-1 h-1 rounded-full ${
                                selectedProvider === p.id
                                  ? 'bg-blue-400 animate-pulse'
                                  : 'bg-slate-700'
                              }`}
                            />
                            {p.name}
                          </span>
                          {selectedProvider === p.id && (
                            <CheckCircle2 size={12} className="text-blue-500" />
                          )}
                        </button>
                      ))}
                      <input type="hidden" name="provider" value={selectedProvider} />
                    </div>
                  </div>

                  {/* Model Configuration Dropdown */}
                  <div className="space-y-2.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Cpu size={12} className="text-blue-500" /> Model Configuration
                    </label>
                    <div className="relative group">
                      <select
                        name="model"
                        value={selectedModel}
                        onChange={e => setSelectedModel(e.target.value)}
                        className="w-full appearance-none bg-slate-950/40 border border-slate-800 rounded-md pl-3 pr-10 py-2.5 text-[11px] font-mono text-slate-300 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all cursor-pointer hover:bg-slate-900/60"
                      >
                        {MODEL_MAPPING[selectedProvider]?.map(model => (
                          <option key={model.id} value={model.id} className="bg-[#0b0e14]">
                            {model.label.toUpperCase()} — {model.desc.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-0 top-0 h-full w-10 flex items-center justify-center pointer-events-none border-l border-slate-800/50">
                        <ChevronDown
                          size={14}
                          className="text-slate-500 group-hover:text-blue-400"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">
                        Stream_Ready: {selectedProvider.toUpperCase()}_
                        {selectedModel?.replace(/-/g, '_').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Info size={12} /> Target URL
                    </label>
                    <input
                      name="url"
                      type="url"
                      required
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  {!hasAnyKey && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-3">
                      <AlertCircle className="text-red-500 shrink-0" size={16} />
                      <p className="text-[10px] text-red-400 font-bold uppercase">
                        Uplink Blocked: Configure keys in System Vault
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-slate-950/30 space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Sparkles size={12} /> Intent (Mission Steps)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowGuide(!showGuide)}
                        className="text-[9px] text-blue-500 hover:text-blue-400 font-bold uppercase border border-blue-500/20 px-2 py-0.5 rounded"
                      >
                        {showGuide ? 'Close Guide' : 'AI Guide'}
                      </button>
                    </div>
                    {showGuide && (
                      <div className="bg-slate-950 border border-blue-500/30 rounded-lg p-4 mb-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-3 border-b border-blue-500/20 pb-2">
                          <BookOpen size={12} className="text-blue-400" />
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                            Instruction_Set_vkam
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-relaxed italic">
                          Argus supports Sequential Steps and Natural Language pathing.
                        </p>
                      </div>
                    )}
                    <textarea
                      name="intent"
                      rows={5}
                      required
                      placeholder="e.g., '1. Navigate to /login', '2. Input {{user}}'..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Database size={12} /> Injection Data (JSON)
                    </label>
                    <textarea
                      name="test_data"
                      rows={4}
                      placeholder='{ "user": "admin" }'
                      className="w-full bg-black border border-slate-800 rounded-lg p-3 text-yellow-500 font-mono text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <footer className="p-5 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  {/* CHAOS PROTOCOL TOGGLE */}
                  <div className="flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 group hover:border-red-500/30 transition-colors">
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_chaos"
                        id="is_chaos"
                        checked={isChaos}
                        onChange={e => setIsChaos(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-700 rounded-full peer peer-checked:bg-red-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4 transition-colors"></div>
                    </div>
                    <label
                      htmlFor="is_chaos"
                      className={`text-[9px] font-black uppercase tracking-[0.15em] cursor-pointer transition-colors ${
                        isChaos ? 'text-red-500' : 'text-slate-500'
                      }`}
                    >
                      {isChaos ? 'Chaos_Active' : 'Chaos_Protocol'}
                    </label>
                    <Zap
                      size={10}
                      className={`${isChaos ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}
                    />
                  </div>

                  <p className="text-[9px] text-slate-600 font-mono uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck size={12} /> Status: Ready
                  </p>
                </div>

                <div className="flex gap-3 items-center">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase hover:text-slate-300"
                  >
                    Abort
                  </button>
                  {error && (
                    <p className="text-[10px] text-red-500 font-black uppercase tracking-tighter mr-2">
                      {error}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isLoading || !hasAnyKey}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-tighter px-10 py-2.5 rounded-lg shadow-xl shadow-blue-600/20 disabled:opacity-20 transition-all"
                  >
                    {isLoading ? 'CALCULATING_TRACE...' : 'DEPLOY_SNIPER'}
                  </button>
                </div>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
