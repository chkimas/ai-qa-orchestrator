import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET
  if (!WEBHOOK_SECRET) throw new Error('CLERK_WEBHOOK_SECRET missing')

  const headerPayload = await headers()
  const svix_headers = {
    'svix-id': headerPayload.get('svix-id') || '',
    'svix-timestamp': headerPayload.get('svix-timestamp') || '',
    'svix-signature': headerPayload.get('svix-signature') || '',
  }

  if (!svix_headers['svix-id']) return new Response('Missing headers', { status: 400 })

  const payload = await req.json()
  const body = JSON.stringify(payload)
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, svix_headers) as WebhookEvent
  } catch {
    return new Response('Verification failed', { status: 400 })
  }

  const supabase = getSupabaseAdmin()
  const { id } = evt.data

  // --- CASE 1: NEW USER CREATED ---
  if (evt.type === 'user.created') {
    const { error } = await supabase.from('user_settings').insert({
      user_id: id as string,
      preferred_provider: 'gemini', // Default engine
    })

    if (error) {
      console.error('[Webhooks] Sync error:', error.message)
      return new Response('Sync error', { status: 500 })
    }
  }

  // --- CASE 2: USER DELETED (THE CLEANUP) ---
  else if (evt.type === 'user.deleted') {
    const { error } = await supabase
      .from('user_settings')
      .delete()
      .eq('user_id', id as string)

    if (error) {
      console.error('[Webhooks] Cleanup error:', error.message)
      return new Response('Cleanup error', { status: 500 })
    }
    console.log(`[ARGUS] Data purged for user: ${id}`)
  }

  return new Response('Webhook processed', { status: 200 })
}
