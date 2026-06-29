'use server'

import { sendRegistrationConfirmation } from '@/lib/registrationEmail'

/**
 * Admin action: re-send the registration confirmation email for a team.
 * Pulls fresh data from the DB and sends to every golfer with an email on
 * file — so after correcting a mistyped address on the Teams page, this
 * delivers the confirmation (and PIN) to the right inbox.
 */
export async function resendConfirmation(
  teamId: string,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  try {
    const results = await sendRegistrationConfirmation(teamId)
    return { ok: true, count: results.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
