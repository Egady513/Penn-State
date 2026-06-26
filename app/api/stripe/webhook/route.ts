import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeTeamTotal } from '@/lib/teamTotal'
import { sendRegistrationConfirmation } from '@/lib/registrationEmail'

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
    // game-day checkout stores comma-separated purchase IDs in metadata
    const purchaseIds = session.metadata?.purchase_ids
      ? session.metadata.purchase_ids.split(',').filter(Boolean)
      : null

    if (!teamId) {
      return NextResponse.json({ received: true, skipped: 'no team_id in metadata' })
    }

    // 1 ── Must be a genuinely paid session.
    if (session.payment_status !== 'paid') {
      console.warn(`[stripe webhook] team ${teamId}: payment_status=${session.payment_status}, not marking paid`)
      return NextResponse.json({ received: true, skipped: `payment_status=${session.payment_status}` })
    }

    const supabase = createAdminClient()
    const paidCents = session.amount_total ?? 0

    if (purchaseIds) {
      // ── Game-day purchase ──────────────────────────────────────────────
      // Verify collected amount matches the sum of the specific purchases.
      type PRow = { id: string; amount: number; quantity: number }
      const { data: purchRows } = await supabase
        .from('purchase')
        .select('id, amount, quantity')
        .in('id', purchaseIds) as { data: PRow[] | null }
      const expectedCents = Math.round(
        (purchRows ?? []).reduce((s, r) => s + r.amount * r.quantity, 0) * 100
      )
      if (paidCents < expectedCents) {
        console.error(`[stripe webhook] GAME-DAY AMOUNT MISMATCH team ${teamId}: ${paidCents}¢ < ${expectedCents}¢`)
        return NextResponse.json({ received: true, error: 'amount mismatch', teamId }, { status: 200 })
      }
      // Mark only these purchases paid.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('purchase') as any).update({ paid_status: 'paid' }).in('id', purchaseIds)
    } else {
      // ── Initial registration checkout ──────────────────────────────────
      // Amount must cover the full authoritative team total.
      const expected = await computeTeamTotal(teamId)
      const expectedCents = Math.round(expected * 100)
      if (paidCents < expectedCents) {
        console.error(
          `[stripe webhook] AMOUNT MISMATCH team ${teamId}: collected ${paidCents}¢ < expected ${expectedCents}¢. NOT marking paid.`,
        )
        return NextResponse.json({ received: true, error: 'amount mismatch', teamId }, { status: 200 })
      }

      // Verified. Mark everything for this team paid. Idempotent on retries.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('team') as any).update({ payment_status: 'paid' }).eq('id', teamId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('registration') as any).update({ payment_status: 'paid' }).eq('team_id', teamId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('purchase') as any).update({ paid_status: 'paid' }).eq('team_id', teamId)

      // If this team bought a hole sponsorship, auto-list them on the public
      // sponsors page using their chosen display name (hole_sponsor_name).
      await maybeCreateHoleSponsor(supabase, teamId)

      // Send confirmation email. Failure must not fail the webhook.
      try {
        await sendRegistrationConfirmation(teamId)
      } catch (err) {
        console.error(`[stripe webhook] confirmation email failed for team ${teamId}:`, err)
      }
    }
  }

  return NextResponse.json({ received: true })
}

/**
 * If the team's signup purchases include a hole_sponsor catalog item, list
 * the team under "Hole Sponsors" on the public page. The team name becomes
 * the sponsor name. Skips if a sponsor with the same name already exists for
 * the event (idempotent — safe across webhook retries).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function maybeCreateHoleSponsor(supabase: any, teamId: string) {
  try {
    const { data: team } = await supabase
      .from('team')
      .select('id, name, hole_sponsor_name, hole_sponsor_logo_url, event_id')
      .eq('id', teamId)
      .maybeSingle()
    if (!team) return

    const { data: holePurchases } = await supabase
      .from('purchase')
      .select('id, catalog_item:catalog_item_id(tag)')
      .eq('team_id', teamId)
    type Row = { catalog_item: { tag: string | null } | null }
    const hasHoleSponsorship = (holePurchases as Row[] | null)?.some(
      (p) => p.catalog_item?.tag === 'hole_sponsor',
    )
    if (!hasHoleSponsorship) return

    // Prefer the explicit sponsor display name; fall back to team name.
    const sponsorName: string = team.hole_sponsor_name ?? team.name

    const { data: existing } = await supabase
      .from('sponsor')
      .select('id')
      .eq('event_id', team.event_id)
      .ilike('name', sponsorName)
      .limit(1)
    if (existing && existing.length > 0) return

    await supabase.from('sponsor').insert({
      event_id: team.event_id,
      name: sponsorName,
      logo_url: team.hole_sponsor_logo_url ?? null,
      sponsorship_type: 'Hole',
      amount: 100,
      active: true,
    })
  } catch (err) {
    // Don't fail the webhook if the auto-list fails — payment already
    // succeeded; Eddie can add the sponsor manually from admin if needed.
    console.error(`[webhook] maybeCreateHoleSponsor failed for team ${teamId}:`, err)
  }
}
