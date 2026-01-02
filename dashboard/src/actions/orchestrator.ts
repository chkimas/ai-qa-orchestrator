'use server'

import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { AIProvider, UserSettings } from '@/types/database'

const LaunchSchema = z.object({
  url: z.string().url('Invalid target URL'),
  intent: z.string().min(5, 'Intent too short'),
  provider: z.enum(['groq', 'gemini', 'openai', 'anthropic', 'sonar']) as z.ZodType<AIProvider>,
  model: z.string().min(1, 'Target model required'),
  is_chaos: z.boolean().default(false),
  testData: z
    .string()
    .optional()
    .transform(val => {
      try {
        return val ? JSON.parse(val) : {}
      } catch {
        return {}
      }
    }),
})

type MissionResult = { success: true; runId: string } | { success: false; error: string }

export async function launchMission(formData: FormData): Promise<MissionResult> {
  const { userId } = await auth()
  if (!userId) return { success: false, error: 'Unauthorized: No active session.' }

  const isChaosChecked = formData.get('is_chaos') === 'on'

  const validated = LaunchSchema.safeParse({
    url: formData.get('url'),
    intent: formData.get('intent'),
    provider: formData.get('provider'),
    model: formData.get('model'),
    is_chaos: isChaosChecked,
    testData: formData.get('test_data'),
  })

  if (!validated.success) {
    return { success: false, error: validated.error.issues[0].message }
  }

  const { url, intent, provider, model, is_chaos, testData } = validated.data
  const supabase = getSupabaseAdmin()
  let createdRunId: string | null = null

  try {
    const { data: settings, error: sError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (sError || !settings) {
      return { success: false, error: 'System Config missing. Please visit Settings.' }
    }

    const keyMap: Record<AIProvider, keyof UserSettings> = {
      openai: 'encrypted_openai_key',
      gemini: 'encrypted_gemini_key',
      groq: 'encrypted_groq_key',
      anthropic: 'encrypted_anthropic_key',
      sonar: 'encrypted_perplexity_key',
    }

    const encryptedKey = settings[keyMap[provider]]

    if (!encryptedKey) {
      return {
        success: false,
        error: `Model Access Denied: No encrypted key found for ${provider.toUpperCase()}.`,
      }
    }

    const { data: run, error: insertError } = await supabase
      .from('test_runs')
      .insert({
        user_id: userId,
        url,
        intent,
        status: 'QUEUED',
        mode: is_chaos ? 'chaos' : 'sniper',
      })
      .select('id')
      .single()

    if (insertError || !run) throw new Error('Failed to register Mission in Argus Database.')
    createdRunId = run.id

    const payload = JSON.stringify({
      user_id: userId,
      run_id: createdRunId,
      api_key: encryptedKey,
      provider,
      model,
      mode: is_chaos ? 'chaos' : 'sniper',
      context: { baseUrl: url, testData },
      instructions: intent,
    })

    const workerUrl = `${process.env.AI_WORKER_URL}/mission`

    const response = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [Buffer.from(payload).toString('base64')] }),
    })

    if (!response.ok) throw new Error(`Worker Uplink Failed: ${response.statusText}`)

    revalidatePath('/runs')
    return { success: true, runId: createdRunId }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown mission failure'
    if (createdRunId) {
      await supabase.from('test_runs').update({ status: 'FAILED' }).eq('id', createdRunId)
    }
    return { success: false, error: msg }
  }
}
