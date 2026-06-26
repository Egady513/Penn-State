import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeTeamTotal } from '@/lib/teamTotal'

// Stripe SDK needs the Node runtime (not Edge).
export const runtime = 'nodejs'

/**
 * Stripe webhook. Public URL — security comes from signature verification,
 * NOT auth. On a completed checkout, marks the team + registration + add-on
 * purchases as paid (using the service-role client, since there's no user here).
 *
 * Before marking anything paid we verify the session ACTUALLY collected payment
 * and that the amount matches this team's authoritative server-side total. This
 * prevents a tampered client amount (or an unpaid/partial session) from flipping
 * a team to "paid".
 */
export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !secret) {
    return NextResponse.json({ error: 'Missing signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, secret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    return NextResponse.json({ error: `Webhook verification failed: ${message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const teamId = session.metadata?.team_id

    if (!teamId) {
      // Nothing we can act on; ack so Stripe doesn't retry.
      return NextResponse.json({ received: true, skipped: 'no team_id in metadata' })
    }

    // 1 ── Must be a genuinely paid session.
    if (session.payment_status !== 'paid') {
      console.warn(`[stripe webhook] team ${teamId}: payment_status=${session.payment_status}, not marking paid`)
      return NextResponse.json({ received: true, skipped: `payment_status=${session.payment_status}` })
    }

    // 2 ── Amount actually collected must cover this team's authoritative total.
    const expected = await computeTeamTotal(teamId)
    const expectedCents = Math.round(expected * 100)
    const paidCents = session.amount_total ?? 0
    if (paidCents < expectedCents) {
      // Underpaid (e.g. a tampered amount). Do NOT mark paid; flag for review.
      console.error(
        `[stripe webhook] AMOUNT MISMATCH team ${teamId}: collected ${paidCents}¢ < expected ${expectedCents}¢. NOT marking paid.`,
      )
      // Return 200 so Stripe stops retrying; this is a business mismatch, not a transient error.
      return NextResponse.json({ received: true, error: 'amount mismatch', teamId }, { status: 200 })
    }

    // 3 ── Verified. Mark everything for this team paid. Idempotent on retries.
    const supabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('team') as any).update({ payment_status: 'paid' }).eq('id', teamId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('registration') as any).update({ payment_status: 'paid' }).eq('team_id', teamId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('purchase') as any).update({ paid_status: 'paid' }).eq('team_id', teamId)
  }

  return NextResponse.json({ received: true })
}
