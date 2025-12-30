import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  // 1. Get the CLERK_WEBHOOK_SECRET from environment variables
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // 2. Get the headers for verification
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    })
  }

  // 3. Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // 4. Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // 5. Verify the payload
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occurred', {
      status: 400,
    })
  }

  // 6. Handle the webhook logic
  const eventType = evt.type

  if (eventType === 'user.created') {
    const { id } = evt.data
    const supabase = getSupabaseAdmin()

    // Initialize the user in your settings table
    const { error } = await supabase.from('user_settings').insert({
      user_id: id,
      preferred_provider: 'gemini',
    })

    if (error) {
      console.error('Error syncing user to Supabase:', error.message)
      return new Response('Error syncing user', { status: 500 })
    }

    console.log(`✅ User ${id} successfully synced to Supabase.`)
  }

  return new Response('Webhook processed', { status: 200 })
}
