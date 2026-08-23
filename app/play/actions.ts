'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Validate a 4-digit PIN against the selected team in Supabase.
 * On success, writes a `golf_team_id` cookie readable by both
 * server components (via cookies()) and client components (document.cookie).
 */
/**
 * Clear the team cookie and return to the PIN screen. Needed so a phone
 * that's already been signed in (or landed on the demo fallback team) can
 * get back to a clean login — there was previously no way out.
 */
export async function signOutTeam(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set('golf_team_id', '', { path: '/play', maxAge: 0 })
}

export async function loginWithPin(
  teamId: string,
  pin: string
): Promise<{ error?: string }> {
  const supabase = await createClient()

  const { data, error: dbError } = await supabase
    .from('team')
    .select('id')
    .eq('id', teamId)
    .eq('pin', pin)
    .maybeSingle()

  if (dbError || !data) {
    return { error: 'Incorrect PIN — check your confirmation email.' }
  }

  const validatedId = (data as { id: string }).id

  const cookieStore = await cookies()
  cookieStore.set('golf_team_id', validatedId, {
    path: '/play',
    maxAge: 60 * 60 * 24, // 24 hours
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    // NOT httpOnly — client components (scorecard, mulligans) also need to read this
  })

  return {}
}
