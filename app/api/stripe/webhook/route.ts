import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

// Stripe SDK needs the Node runtime (not Edge).
export const runtime = 'nodejs'

/**
 * Stripe webhook. Public URL — security comes from signature verification,
 * NOT auth. On a completed checkout, marks the team + registration + add-on
 * purchases as paid (using the service-role client, since there's no user here).
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

    if (teamId) {
      const supabase = createAdminClient()
      // Mark everything for this team as paid. Idempotent — safe on retries.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('team') as any).update({ payment_status: 'paid' }).eq('id', teamId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('registration') as any).update({ payment_status: 'paid' }).eq('team_id', teamId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('purchase') as any).update({ paid_status: 'paid' }).eq('team_id', teamId)
    }
  }

  return NextResponse.json({ received: true })
}
