'use server'

import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export interface SettleResult {
  url?: string
  error?: string
}

/**
 * Create a Stripe Checkout to settle a team's outstanding balance from the
 * play-app "What you owe" page — unpaid mulligans ($2 each) plus any unpaid
 * purchases. The amount is computed SERVER-SIDE (never trust the client).
 *
 * The webhook's `settle_balance` branch marks the team's mulligans + unpaid
 * purchases paid once Stripe confirms.
 */
export async function createSettleBalanceCheckout(
  teamId: string,
  origin: string,
): Promise<SettleResult> {
  const supabase = await createClient()

  // Unpaid mulligans ($2 each)
  const { data: mulls } = await supabase
    .from('mulligan')
    .select('count')
    .eq('team_id', teamId)
    .eq('paid', false)
  const mullTotal = (mulls ?? []).reduce(
    (s: number, m: { count: number }) => s + (m.count || 0), 0,
  ) * 2

  // Unpaid purchases (amount × quantity)
  const { data: purch } = await supabase
    .from('purchase')
    .select('amount, quantity')
    .eq('team_id', teamId)
    .eq('paid_status', 'unpaid')
  const purchTotal = (purch ?? []).reduce(
    (s: number, p: { amount: number; quantity: number }) =>
      s + Number(p.amount) * (p.quantity || 1), 0,
  )

  const total = mullTotal + purchTotal
  if (!(total > 0)) {
    return { error: 'You have no outstanding balance to pay.' }
  }
  const totalCents = Math.round(total * 100)

  // Team name for the line-item description
  const { data: team } = await supabase
    .from('team')
    .select('name')
    .eq('id', teamId)
    .maybeSingle()
  const teamName = (team as { name: string } | null)?.name ?? 'your team'

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Outstanding balance — ${teamName}` },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/play/owe?settled=1`,
      cancel_url: `${origin}/play/owe`,
      metadata: {
        team_id: teamId,
        settle_balance: 'true',
        expected_total_cents: String(totalCents),
      },
    })
    return { url: session.url ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start checkout.'
    return { error: message }
  }
}
