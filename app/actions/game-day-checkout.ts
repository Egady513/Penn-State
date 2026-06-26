'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'

export interface GameDayItem {
  catalogItemId: string
  name: string
  price: number
  quantity: number
}

export interface GameDayCheckoutResult {
  url?: string
  error?: string
}

/**
 * Creates purchase rows for a game-day add-on order and returns a Stripe
 * Checkout URL. The webhook marks only these specific purchases paid once
 * Stripe confirms (via purchase_ids in session metadata).
 */
export async function createGameDayCheckout(
  teamId: string,
  items: GameDayItem[],
  origin: string,
): Promise<GameDayCheckoutResult> {
  if (!items.length) return { error: 'No items selected.' }

  const supabase = await createClient()
  const admin = createAdminClient()

  // Verify the team exists and is paid (registered).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: team } = await (supabase.from('team') as any)
    .select('id, name, payment_status')
    .eq('id', teamId)
    .maybeSingle()
  if (!team) return { error: 'Team not found.' }
  if (team.payment_status !== 'paid') return { error: 'Team registration must be paid first.' }

  // Create purchase rows via the SECURITY DEFINER RPC so anon client can write.
  const dbItems = items.map(i => ({
    catalog_item_id: i.catalogItemId,
    quantity: i.quantity,
    amount: i.price,
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: purchaseRows, error: rpcErr } = await (supabase.rpc as any)(
    'create_game_day_purchases',
    { p_team_id: teamId, p_items: dbItems },
  )
  if (rpcErr) return { error: `Could not save purchases: ${rpcErr.message}` }

  const purchaseIds: string[] = (purchaseRows as { id: string }[] | null)?.map(r => r.id) ?? []
  if (!purchaseIds.length) return { error: 'No purchases were created.' }

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const totalCents = Math.round(total * 100)

  const stripe = getStripe()

  // Build one line-item per catalog item type (Stripe requires > 0 unit_amount).
  const lineItems = items.map(i => ({
    price_data: {
      currency: 'usd',
      product_data: { name: i.name },
      unit_amount: Math.round(i.price * 100),
    },
    quantity: i.quantity,
  }))

  let session
  try {
    session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/play/owe?paid=1`,
      cancel_url: `${origin}/play/shop`,
      metadata: {
        team_id: teamId,
        purchase_ids: purchaseIds.join(','),
        expected_total_cents: String(totalCents),
      },
    })
  } catch (err) {
    // Roll back the unpaid purchase rows if Stripe session creation fails.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('purchase') as any).delete().in('id', purchaseIds)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return { error: `Could not start checkout: ${msg}` }
  }

  if (!session.url) return { error: 'Stripe returned no checkout URL.' }
  return { url: session.url }
}
