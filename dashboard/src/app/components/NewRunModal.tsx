'use client'

import { useState, useRef } from 'react'
import { runTest } from '@/app/actions'
import {
  Play,
  Settings,
  Database,
  Globe,
  Lock,
  Sparkles,
  CheckCircle2,
  BookOpen,
  X,
} from 'lucide-react'

export default function NewRunModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showRules, setShowRules] = useState(false)

  // We use Refs to safely access inputs without "document.getElementById" crashes
  const urlRef = useRef<HTMLInputElement>(null)
  const roleRef = useRef<HTMLSelectElement>(null)
  const intentRef = useRef<HTMLTextAreaElement>(null)
  const dataRef = useRef<HTMLTextAreaElement>(null)

  const fillExample = () => {
    // Safe filling using React Refs
    if (urlRef.current) urlRef.current.value = 'https://www.saucedemo.com'
    if (roleRef.current) roleRef.current.value = 'customer'

    if (intentRef.current) {
      // ⚡ HYBRID STYLE: Numbered Steps + Strict "SOP" Syntax
      intentRef.current.value = `
      1. Navigate to the login page.
      2. Input '{{username}}' into the Username field.
      3. Input '{{password}}' into the Password field.
      4. Click the 'Login' button.
      5. Verify text 'Products' is visible.
      6. Click the 'Add to cart' button.
      7. Verify text '1' is visible in the shopping cart badge.
      `
    }

    setShowAdvanced(true)

    setTimeout(() => {
      if (dataRef.current) {
        dataRef.current.value = `{\n  "username": "standard_user",\n  "password": "secret_sauce"\n}`
      }
    }, 100)
  }

  async function handleSubmit(formData: FormData) {
    setIsLoading(true)
    await runTest(formData)
    setIsLoading(false)
    setIsOpen(false)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition font-medium shadow-lg shadow-blue-900/20 flex items-center gap-2"
      >
        <Play className="w-4 h-4" /> New Test Run
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-950 p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Configure Test Run
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Define strict parameters for the AI Agent.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 custom-scrollbar">
              {/* 📘 AI RULES GUIDE (Collapsible Guidance) */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setShowRules(!showRules)}
                  className="w-full flex items-center justify-between p-3 bg-blue-900/20 border border-blue-800/50 rounded-lg text-blue-300 hover:bg-blue-900/30 transition-colors group"
                >
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <BookOpen className="w-4 h-4" />
                    <span>How to speak to the AI</span>
                  </div>
                  <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-1 rounded group-hover:bg-blue-800 transition">
                    {showRules ? 'Hide Guide' : 'Read Guide'}
                  </span>
                </button>

                {showRules && (
                  <div className="mt-2 rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-xs text-slate-400 shadow-sm animate-in slide-in-from-top-2 space-y-3">
                    <p className="leading-relaxed">
                      <span className="font-medium text-slate-300 tracking-wide">1. Be Direct</span>
                      <br />
                      Start with an action verb. Avoid phrases like
                      <span className="mx-1 italic text-slate-500">“I want you to…”</span>— instead
                      use
                      <span className="mx-1 font-mono text-slate-200">
                        Verify text &quot;Welcome&quot;
                      </span>
                      .
                    </p>

                    <p className="leading-relaxed">
                      <span className="font-medium text-slate-300 tracking-wide">
                        2. Supported Verbs
                      </span>
                      <br />
                      Only the following commands are recognized:
                      <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                        {['Navigate', 'Click', 'Input', 'Verify Text', 'Wait'].map(v => (
                          <span
                            key={v}
                            className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[11px] text-blue-400"
                          >
                            {v}
                          </span>
                        ))}
                      </span>
                    </p>

                    <p className="leading-relaxed">
                      <span className="font-medium text-slate-300 tracking-wide">3. Variables</span>
                      <br />
                      Reference dynamic values using
                      <code className="mx-1 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-yellow-400">
                        {'{{variable}}'}
                      </code>
                      to avoid hardcoding sensitive data.
                    </p>
                  </div>
                )}
              </div>

              <form action={handleSubmit} className="space-y-6">
                {/* 1. Environment & Role */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-2">
                        <Globe className="w-3 h-3 text-blue-400" />
                        Base URL
                      </span>
                      <span className="text-[10px] bg-blue-900/30 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">
                        REQ
                      </span>
                    </label>
                    <input
                      ref={urlRef}
                      name="url"
                      type="url"
                      placeholder="https://staging.app.com"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none text-sm placeholder:text-slate-700 font-mono transition-colors hover:border-slate-700"
                      onBlur={e => {
                        const val = e.target.value.trim()
                        if (val && !val.startsWith('http')) e.target.value = `https://${val}`
                      }}
                    />
                  </div>

                  <div>
                    <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      <span className="flex items-center gap-2">
                        <Lock className="w-3 h-3 text-purple-400" />
                        User Role
                      </span>
                    </label>
                    <div className="relative">
                      <select
                        ref={roleRef}
                        name="role"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none text-sm appearance-none cursor-pointer hover:border-slate-700"
                      >
                        <option value="customer">Standard User (Customer)</option>
                        <option value="admin">Administrator</option>
                        <option value="guest">Guest / Unauthenticated</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                        <svg
                          width="10"
                          height="6"
                          viewBox="0 0 10 6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M1 1L5 5L9 1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Intent Input */}
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Test Scenario
                    </label>
                    <button
                      type="button"
                      onClick={fillExample}
                      className="text-[10px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      <Sparkles className="w-3 h-3" /> Fill Example
                    </button>
                  </div>

                  <textarea
                    ref={intentRef}
                    name="intent"
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none resize-none placeholder:text-slate-700 text-sm font-sans leading-relaxed transition-colors hover:border-slate-700"
                    placeholder="Describe the test steps clearly..."
                    required
                  />
                </div>

                {/* 3. Advanced Data */}
                <div className="border-t border-slate-800 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mb-3 transition-colors font-medium"
                  >
                    {showAdvanced ? '− Hide' : '+ Show'} JSON Data Injection
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                      <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-500 mb-2">
                          <Database className="w-3 h-3" />
                          Test Data (JSON)
                        </label>
                        <textarea
                          ref={dataRef}
                          name="test_data"
                          rows={4}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-yellow-500 font-mono text-xs focus:ring-1 focus:ring-yellow-500 outline-none"
                          placeholder='{"username": "test_user"}'
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></span>
                        Architecting Plan...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Execute Run
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
