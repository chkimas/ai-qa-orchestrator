'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { AIProvider } from '@/types/database'

export default function NewRunModal() {
  const { user } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [vaultStatus, setVaultStatus] = useState<Record<string, boolean>>({})
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini')
  const [hasAnyKey, setHasAnyKey] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const PROVIDERS: { id: AIProvider; name: string }[] = [
    { id: 'openai', name: 'OpenAI (GPT-4o)' },
    { id: 'gemini', name: 'Google Gemini' },
    { id: 'groq', name: 'Groq (Llama 3)' },
    { id: 'anthropic', name: 'Anthropic (Claude)' },
    { id: 'sonar', name: 'Perplexity Sonar' },
  ]

  useEffect(() => {
    async function checkVault() {
      if (!user || !isOpen) return
      const status = await getVaultStatus()
      setVaultStatus(status)
      const anyExist = Object.values(status).some(v => v === true)
      setHasAnyKey(anyExist)
      if (anyExist && !status[selectedProvider]) {
        const firstAvailable = Object.keys(status).find(k => status[k]) as AIProvider
        if (firstAvailable) setSelectedProvider(firstAvailable)
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
            {/* Header */}
            <header className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-600/20 flex items-center justify-center border border-blue-500/30">
                  <Cpu className="text-blue-500" size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tighter">
                    SNIPER_DEPLOYMENT
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

            <form action={handleSubmit} className="p-0">
              <div className="grid grid-cols-1 md:grid-cols-2">
                {/* Left Side: Parameters */}
                <div className="p-6 border-r border-slate-800 space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Settings size={12} /> Neural Engine
                    </label>
                    <div className="grid grid-cols-1 gap-1.5">
                      {PROVIDERS.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          disabled={!vaultStatus[p.id]}
                          onClick={() => setSelectedProvider(p.id)}
                          className={`flex items-center justify-between px-3 py-2 rounded-md border transition-all text-xs ${
                            selectedProvider === p.id
                              ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                              : 'border-slate-800 bg-slate-950/40 text-slate-500'
                          } ${
                            !vaultStatus[p.id]
                              ? 'opacity-30 cursor-not-allowed'
                              : 'hover:border-slate-700'
                          }`}
                        >
                          {p.name}
                          {selectedProvider === p.id && (
                            <CheckCircle2 size={12} className="text-blue-500" />
                          )}
                        </button>
                      ))}
                      <input type="hidden" name="provider" value={selectedProvider} />
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
                      <p className="text-[10px] text-red-400 font-bold uppercase leading-tight">
                        Uplink Blocked: Configure keys in System Vault
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Side: Mission Details */}
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

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1.5 tracking-tighter">
                              Native Verbs
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {['Navigate', 'Click', 'Input', 'Verify', 'Wait'].map(verb => (
                                <span
                                  key={verb}
                                  className="text-[9px] px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono rounded"
                                >
                                  {verb}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold mb-1.5 tracking-tighter">
                              Injection Syntax
                            </p>
                            <div className="text-[10px] font-mono text-yellow-500/90 bg-yellow-500/5 border border-yellow-500/20 px-2 py-1 rounded">
                              {'{{key_name}}'}
                            </div>
                          </div>
                        </div>

                        <p className="text-[9px] text-slate-400 mt-3 leading-relaxed border-t border-slate-800 pt-2 italic">
                          Argus supports both{' '}
                          <span className="text-blue-400 font-bold">Sequential Steps</span> (1. 2.
                          3.) and <span className="text-blue-400 font-bold">Natural Language</span>.
                          The engine will derive the logical pathing automatically.
                        </p>
                      </div>
                    )}

                    <textarea
                      name="intent"
                      rows={5}
                      required
                      placeholder="Enter mission steps, e.g., '1. Navigate to /login', '2. Input {{user}}', or 'Go to dashboard, verify Total Revenue {{expected_sum}}'."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 outline-none focus:border-blue-500 resize-none placeholder:text-slate-600 font-mono leading-relaxed"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Database size={12} /> Injection Data (JSON)
                    </label>
                    <textarea
                      name="test_data"
                      rows={4}
                      placeholder='{ "user": "admin", "password": "123" }'
                      className="w-full bg-black border border-slate-800 rounded-lg p-3 text-yellow-500 font-mono text-[11px] outline-none focus:ring-1 focus:ring-yellow-500/50 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <footer className="p-5 bg-slate-950 border-t border-slate-800 flex justify-end gap-3 items-center">
                <p className="text-[9px] text-slate-600 font-mono uppercase mr-auto tracking-widest flex items-center gap-2">
                  <ShieldCheck size={12} /> Argus Verification: Ready
                </p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase hover:text-slate-300 transition-colors"
                >
                  Abort
                </button>
                {error && (
                  <p className="text-[10px] text-red-500 font-black uppercase mb-2">! {error}</p>
                )}
                <button
                  type="submit"
                  disabled={isLoading || !hasAnyKey}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black uppercase tracking-tighter px-10 py-2.5 rounded-lg shadow-xl shadow-blue-600/20 transition-all disabled:opacity-20"
                >
                  {isLoading ? 'CALCULATING_TRACE...' : 'DEPLOY_SNIPER'}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
