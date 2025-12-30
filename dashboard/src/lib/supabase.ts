import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Standard client for hooks and components
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for Server Actions (bypasses RLS)
export const getSupabaseAdmin = () => {
  return createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}
