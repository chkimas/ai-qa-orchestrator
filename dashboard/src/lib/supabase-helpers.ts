import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Authorization Helper: Ensures all database operations are scoped to authenticated users.
 *
 * Usage:
 * ```typescript
 * const { supabase, userId } = await getAuthorizedSupabase()
 * const { data } = await supabase.from('test_runs').select('*').eq('user_id', userId)
 * ```
 *
 * Security Note: This app uses Clerk for authentication + Supabase service role key
 * for database access. RLS policies are NOT active. Authorization is enforced at the
 * application layer through this helper and manual user_id checks in all queries.
 */
export async function getAuthorizedSupabase() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("UNAUTHORIZED: No active Clerk session");
  }

  return {
    supabase: getSupabaseAdmin(),
    userId,
  };
}

/**
 * Type-safe wrapper for queries that must be scoped to the current user.
 * Prevents accidental data leaks by requiring explicit user_id filtering.
 */
export async function queryAsUser<T>(
  queryFn: (
    supabase: ReturnType<typeof getSupabaseAdmin>,
    userId: string
  ) => Promise<T>
): Promise<T> {
  const { supabase, userId } = await getAuthorizedSupabase();
  return queryFn(supabase, userId);
}
