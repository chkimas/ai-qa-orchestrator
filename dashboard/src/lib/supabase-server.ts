import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export async function getSupabaseWithRLS() {
  const { userId, getToken } = await auth()

  if (!userId) {
    throw new Error('UNAUTHORIZED')
  }

  const supabaseAccessToken = await getToken({ template: 'supabase' })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${supabaseAccessToken}`,
        },
      },
    }
  )

  return { supabase, userId }
}
