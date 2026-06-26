'use server'

import { getStripe } from '@/lib/stripe'
import { computeTeamTotal } from '@/lib/teamTotal'

export interface CheckoutArgs {
  teamId: string
  teamName: string
  pin: string
  origin: string // window.location.origin from the client
}

export interface CheckoutResult {
  url?: string
  error?: string
}

/**
 * Create a Stripe Checkout Session for a registration and return its hosted URL.
 *
 * SECURITY: the amount charged is recomputed SERVER-SIDE from what was actually
 * saved for this team (registerTeam wrote the base fee, donation, and itemized
 * add-on rows). The browser never gets to say what to charge — this closes the
 * "pay $1 for a $200 team" hole. The webhook independently re-verifies the
 * amount before marking the team paid.
 */
export async function createCheckoutSession(args: CheckoutArgs): Promise<CheckoutResult> {
  try {
    const total = await computeTeamTotal(args.teamId)
    if (!(total > 0)) {
      return { error: 'Could not determine your order total. Please try again or contact us.' }
    }
    const totalCents = Math.round(total * 100)

    const successUrl = `${args.origin}/confirmation?team=${encodeURIComponent(args.teamName)}&pin=${args.pin}`
    const cancelUrl = `${args.origin}/?canceled=1#register`

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Drive Out Hunger 2026 — ${args.teamName}` },
            unit_amount: totalCents,
          },
          quantity: 1,
        },
      ],
      // team_id tells the webhook which team to mark paid; expected_total_cents
      // lets it cross-check the collected amount without recomputing.
      metadata: {
        team_id: args.teamId,
        pin: args.pin,
        expected_total_cents: String(totalCents),
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { url: session.url ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start checkout.'
    return { error: message }
  }
}
