'use server'

import { getStripe } from '@/lib/stripe'

export interface CheckoutArgs {
  teamId: string
  amount: number // dollars
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
 * The team is already saved (unpaid) by registerTeam; the webhook flips it to
 * paid once Stripe confirms payment. team_id rides along in metadata so the
 * webhook knows which team to mark.
 */
export async function createCheckoutSession(args: CheckoutArgs): Promise<CheckoutResult> {
  try {
    const successUrl = `${args.origin}/confirmation?team=${encodeURIComponent(args.teamName)}&pin=${args.pin}`
    const cancelUrl = `${args.origin}/?canceled=1#register`

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: { name: `Drive Out Hunger 2026 — ${args.teamName}` },
            unit_amount: Math.round(args.amount * 100),
          },
          quantity: 1,
        },
      ],
      metadata: { team_id: args.teamId, pin: args.pin },
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    return { url: session.url ?? undefined }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not start checkout.'
    return { error: message }
  }
}
