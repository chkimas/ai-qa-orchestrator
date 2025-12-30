import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'
import { Key, ShieldCheck, Cpu } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export default async function SettingsPage() {
  const { userId } = await auth()

  // Fetch settings safely
  const { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  async function updateSettings(formData: FormData) {
    'use server'
    const { userId } = await auth()
    if (!userId) return

    const updates = {
      user_id: userId,
      encrypted_gemini_key: formData.get('gemini_key') as string,
      encrypted_groq_key: formData.get('groq_key') as string,
      preferred_provider: formData.get('preferred_provider') as string,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('user_settings').upsert(updates, {
      onConflict: 'user_id',
    })

    if (error) {
      console.error('Update Error:', error.message)
    }

    revalidatePath('/settings')
  }

  return (
    <main className="p-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <header className="mb-10 border-b border-slate-800 pb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ShieldCheck className="text-blue-500 w-8 h-8" />
          System Configuration
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          Manage your AI intelligence providers and secure vault keys. These keys are used by the
          worker nodes to execute missions.
        </p>
      </header>

      <form action={updateSettings} className="space-y-8">
        {/* Preferred Provider Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Cpu size={16} className="text-blue-400" /> Model Orchestration
          </h2>

          <div className="grid gap-2">
            <label className="text-xs font-mono text-slate-500 uppercase">
              Primary LLM Provider
            </label>
            <select
              name="preferred_provider"
              defaultValue={settings?.preferred_provider || 'gemini'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all cursor-pointer hover:border-slate-700"
            >
              <option value="gemini">Google Gemini 1.5 Pro (Recommended)</option>
              <option value="groq">Groq (Llama 3 70B - Low Latency)</option>
              <option value="openai">OpenAI GPT-4o</option>
              <option value="anthropic">Anthropic Claude 3.5 Sonnet</option>
            </select>
          </div>
        </div>

        {/* API Vault Section */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <Key size={16} className="text-blue-400" /> Secure API Vault
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-500 uppercase">
                Gemini API Key
              </label>
              <input
                name="gemini_key"
                type="password"
                placeholder="••••••••••••••••"
                defaultValue={settings?.encrypted_gemini_key || ''}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder:text-slate-700 focus:border-blue-600 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-slate-500 uppercase">
                Groq API Key
              </label>
              <input
                name="groq_key"
                type="password"
                placeholder="••••••••••••••••"
                defaultValue={settings?.encrypted_groq_key || ''}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 placeholder:text-slate-700 focus:border-blue-600 outline-none transition-all"
              />
            </div>
          </div>

          <p className="mt-4 text-[10px] text-slate-600 italic">
            * Keys are stored as text in this iteration. RLS is currently disabled for this project.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="group relative flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-10 rounded-xl transition-all shadow-xl shadow-blue-900/20 active:scale-95"
          >
            Apply Changes
          </button>
        </div>
      </form>
    </main>
  )
}
