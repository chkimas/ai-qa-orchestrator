'use server'

import { auth } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { revalidatePath } from 'next/cache'

export async function launchMission(formData: FormData) {
  const { userId } = await auth()
  if (!userId) throw new Error('Authentication required to launch mission.')

  const url = formData.get('url') as string
  const intent = formData.get('intent') as string
  const provider = (formData.get('provider') as string) || 'groq'

  const supabase = getSupabaseAdmin()

  // 1. Pre-register the run so the UI can navigate immediately
  const { data: run, error } = await supabase
    .from('test_runs')
    .insert({
      user_id: userId,
      url: url,
      intent: intent,
      status: 'QUEUED',
      mode: 'sniper',
    })
    .select()
    .single()

  if (error || !run) {
    console.error('Supabase pre-registration failed:', error)
    return { success: false, error: 'Database rejected mission launch.' }
  }

  // 2. Prepare the encrypted/Base64 payload for the Python worker
  // We mirror the format expected by worker_api.py
  const payload = {
    user_id: userId,
    run_id: run.id, // Pass the UUID we just created
    context: { baseUrl: url },
    instructions: intent,
    provider: provider,
  }

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64')

  // 3. Fire-and-forget ping to the Hugging Face Worker
  try {
    const workerResponse = await fetch(process.env.AI_WORKER_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [base64Payload] }),
    })

    if (!workerResponse.ok) throw new Error(`Worker returned ${workerResponse.status}`)
  } catch (err) {
    console.error('Worker trigger failed:', err)
    // Update status to FAILED if the worker is unreachable
    await supabase.from('test_runs').update({ status: 'FAILED' }).eq('id', run.id)
    return { success: false, error: 'AI Worker is currently offline.' }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/runs/${run.id}`)

  return { success: true, runId: run.id }
}
