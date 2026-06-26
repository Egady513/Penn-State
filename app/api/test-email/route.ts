import { NextRequest, NextResponse } from 'next/server'
import { sendRegistrationConfirmation } from '@/lib/registrationEmail'

export const runtime = 'nodejs'

/**
 * Test endpoint — sends a registration confirmation email for an existing
 * team_id, so we can preview the template without going through Stripe.
 *
 * Usage: GET /api/test-email?team_id=<uuid>
 *
 * Gated by env: TEST_EMAIL_TOKEN must match ?token=... so it can't be hit
 * by anyone who finds the URL. Remove this endpoint (or revoke the token)
 * once we're done testing.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const teamId = url.searchParams.get('team_id')
  const token = url.searchParams.get('token')
  const expected = process.env.TEST_EMAIL_TOKEN

  if (!expected) {
    return NextResponse.json({ error: 'TEST_EMAIL_TOKEN env var not set' }, { status: 500 })
  }
  if (token !== expected) {
    return NextResponse.json({ error: 'Bad token' }, { status: 401 })
  }
  if (!teamId) {
    return NextResponse.json({ error: 'Provide ?team_id=<uuid>' }, { status: 400 })
  }

  try {
    const results = await sendRegistrationConfirmation(teamId)
    return NextResponse.json({ ok: true, sent: results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
