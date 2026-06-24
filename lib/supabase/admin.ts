import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types'

/**
 * Service-role Supabase client — bypasses RLS. SERVER-ONLY.
 * Never import this in a Client Component. Used by the Stripe webhook
 * to mark teams paid (there's no logged-in user in a webhook request).
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
