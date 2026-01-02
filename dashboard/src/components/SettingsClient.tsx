'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { saveVault, getVaultStatus, testProviderKey } from '@/lib/actions'
import { Zap, RefreshCw, ShieldCheck } from 'lucide-react'
import { AIProvider } from '@/types/database'

type ProviderType = AIProvider

const PROVIDERS: { id: ProviderType; name: string; prefix: string }[] = [
  { id: 'openai', name: 'OpenAI (GPT-4o)', prefix: 'sk-' },
  { id: 'gemini', name: 'Google Gemini', prefix: 'AIza' },
  { id: 'groq', name: 'Groq (Llama 3)', prefix: 'gsk_' },
  { id: 'anthropic', name: 'Anthropic (Claude)', prefix: 'sk-ant-' },
  { id: 'sonar', name: 'Perplexity Sonar', prefix: 'pplx-' },
]

export default function SettingsClient() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [testing, setTesting] = useState<string | null>(null)
  const [preferred, setPreferred] = useState<ProviderType>('gemini')
  const [verifiedInSession, setVerifiedInSession] = useState<Record<string, boolean>>({})

  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | null>>({
    openai: null,
    gemini: null,
    groq: null,
    anthropic: null,
    sonar: null,
  })
  const [hasStoredKey, setHasStoredKey] = useState<Record<string, boolean>>({})
  const [keys, setKeys] = useState<Record<string, string>>({
    openai: '',
    gemini: '',
    groq: '',
    anthropic: '',
    sonar: '',
  })

  useEffect(() => {
    async function fetchSettings() {
      if (!user) return

      const data = await getVaultStatus()
      setHasStoredKey(data.keys as Record<string, boolean>)
      if (data.preferred) {
        setPreferred(data.preferred as ProviderType)
      }

      setLoading(false)
    }
    fetchSettings()
  }, [user])

  const handleTest = async (id: ProviderType) => {
    setTesting(id)
    const result = await testProviderKey(id)

    setTestResults(prev => ({ ...prev, [id]: result.success ? 'success' : 'error' }))
    if (result.success) {
      setVerifiedInSession(prev => ({ ...prev, [id]: true }))
    }
    setTesting(null)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving('loading')

    const formData = new FormData()
    formData.append('openai_key', keys.openai)
    formData.append('gemini_key', keys.gemini)
    formData.append('groq_key', keys.groq)
    formData.append('anthropic_key', keys.anthropic)
    formData.append('perplexity_key', keys.sonar)
    formData.append('preferred_provider', preferred)

    try {
      const result = await saveVault(formData)

      if (result.success) {
        setSaving('success')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setSaving('error')
        console.error('VAULT_ERROR:', result.error)
      }
    } catch {
      setSaving('error')
    }
  }

  // Logic: Allow save if preferred provider is already stored OR newly verified
  const canSave =
    verifiedInSession[preferred] ||
    hasStoredKey[preferred] ||
    Object.values(verifiedInSession).some(v => v)

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e14] text-slate-400 font-mono">
        <div className="animate-pulse flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> <span>INITIALIZING ARGUS_VAULT...</span>
        </div>
      </div>
    )

  return (
    <main
      className="min-h-screen bg-[#0b0e14] text-slate-300 font-mono p-8"
      aria-labelledby="page-title"
    >
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 flex justify-between items-end border-b border-slate-800 pb-6">
          <div>
            <h1 id="page-title" className="text-xl text-white font-bold tracking-tighter">
              ARGUS // SYSTEM_CONFIG
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
              Encrypted Intelligence Credentials
            </p>
          </div>
          <div
            className="text-[10px] text-blue-500 font-bold border border-blue-500/20 px-2 py-1 rounded bg-blue-500/5"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            NODE_STATUS: ONLINE
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <aside className="space-y-6" aria-label="Provider selection and security">
            <div>
              <label
                id="primary-engine-label"
                className="text-[10px] text-slate-500 uppercase font-bold mb-3 block tracking-[0.2em]"
              >
                Primary Engine
              </label>
              <div
                className="flex flex-col gap-2"
                role="radiogroup"
                aria-labelledby="primary-engine-label"
              >
                {PROVIDERS.map(p => {
                  const isActive = preferred === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPreferred(p.id)}
                      role="radio"
                      aria-checked={isActive}
                      tabIndex={isActive ? 0 : -1}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-blue-600/10 border-blue-500 text-white shadow-[0_0_15px_-5px_rgba(59,130,246,0.5)]'
                          : 'bg-slate-900/50 border-slate-800 text-slate-500 hover:border-slate-700'
                      }`}
                    >
                      <span
                        className={`text-[10px] font-black uppercase tracking-tighter ${
                          isActive ? 'text-blue-400' : ''
                        }`}
                      >
                        {p.name.split(' ')[0]}
                      </span>
                      {isActive && (
                        <div
                          aria-hidden="true"
                          className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-lg">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <ShieldCheck size={14} aria-hidden="true" />
                <span className="text-[10px] font-bold uppercase">Security Protocol</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                AES-256-CBC Encrypted storage active.
              </p>
            </div>
          </aside>

          <div className="md:col-span-2 space-y-4" aria-label="Provider keys">
            {PROVIDERS.map(p => (
              <div
                key={p.id}
                className="flex items-center gap-4 bg-slate-900/40 p-3 rounded-lg border border-slate-800/50"
              >
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span id={`provider-name-${p.id}`} className="text-[12px] text-slate-400">
                      {p.name}
                    </span>
                    {hasStoredKey[p.id] && (
                      <span className="text-[9px] text-green-500 uppercase font-bold">Vaulted</span>
                    )}
                  </div>

                  <div className="flex items-center bg-black/40 border border-slate-800 rounded px-2">
                    <span
                      id={`provider-prefix-${p.id}`}
                      className="shrink-0 text-[10px] text-slate-600 font-mono mr-2"
                    >
                      {p.prefix}
                    </span>
                    <input
                      id={`provider-key-${p.id}`}
                      name={`provider-key-${p.id}`}
                      type="password"
                      value={keys[p.id]}
                      onChange={e => setKeys({ ...keys, [p.id]: e.target.value })}
                      placeholder={hasStoredKey[p.id] ? '••••••••••••••••' : 'EMPTY'}
                      aria-labelledby={`provider-name-${p.id} provider-prefix-${p.id}`}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      autoComplete="new-password"
                      className="w-full bg-transparent py-1.5 text-xs text-slate-300 outline-none"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleTest(p.id)}
                  disabled={testing === p.id || (keys[p.id] !== '' && !verifiedInSession[p.id])}
                  className={`mt-4 p-2.5 rounded-md border transition-all ${
                    testing === p.id
                      ? 'opacity-50'
                      : keys[p.id] !== '' && !verifiedInSession[p.id]
                      ? 'border-slate-800 text-slate-700 cursor-not-allowed opacity-30'
                      : testResults[p.id] === 'success'
                      ? 'border-green-500 text-green-500 bg-green-500/10'
                      : testResults[p.id] === 'error'
                      ? 'border-red-500 text-red-500 bg-red-500/10'
                      : 'border-slate-800 text-slate-600 hover:text-slate-300'
                  }`}
                  title={keys[p.id] !== '' ? 'Store in Vault to enable testing' : ''}
                >
                  {testing === p.id ? (
                    <RefreshCw size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Zap size={14} aria-hidden="true" />
                  )}
                </button>
              </div>
            ))}

            {/* SIMPLIFIED FOOTER: Single line, original placement */}
            <div className="pt-6 flex items-center justify-between">
              <div
                className="flex flex-col gap-1"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {Object.values(keys).some(k => k !== '') && (
                  <span className="text-[8px] text-blue-400 uppercase font-black animate-pulse flex items-center gap-1">
                    <ShieldCheck size={10} /> Pending Changes: Store in Vault to Test
                  </span>
                )}
                {!canSave && saving === 'idle' && (
                  <span className="text-[9px] text-amber-500/60 uppercase font-black italic">
                    ! Validation Required
                  </span>
                )}
                {saving === 'error' && (
                  <span className="text-[9px] text-red-500 uppercase font-black">
                    ! Sync Failed
                  </span>
                )}
                {saving === 'success' && (
                  <span className="text-[9px] text-emerald-500 uppercase font-black">
                    ✓ Secured
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving !== 'idle' || !canSave}
                aria-disabled={saving !== 'idle' || !canSave}
                aria-busy={saving === 'loading'}
                className={`px-8 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${
                  saving === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                } disabled:opacity-20`}
              >
                {saving === 'loading'
                  ? 'Encrypting...'
                  : saving === 'success'
                  ? 'Secured'
                  : 'Store in Vault'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
