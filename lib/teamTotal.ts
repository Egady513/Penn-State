import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Compute a team's authoritative order total (in dollars) from what is actually
 * saved in the database: registration base fee + donation + every itemized
 * purchase row attached to the team at signup.
 *
 * SERVER-ONLY. Uses the service-role client so it sees all rows regardless of
 * RLS. This is the single source of truth for (a) what Stripe should charge and
 * (b) what the webhook should expect to have been collected. Never trust an
 * amount sent from the browser.
 */
export async function computeTeamTotal(teamId: string): Promise<number> {
  const supabase = createAdminClient()

  const [regRes, purchaseRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('registration') as any)
      .select('fee_amount, donation_amount')
      .eq('team_id', teamId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('purchase') as any)
      .select('amount, quantity, channel')
      .eq('team_id', teamId),
  ])

  const regs = (regRes.data ?? []) as { fee_amount: number; donation_amount: number }[]
  const purchases = (purchaseRes.data ?? []) as { amount: number; quantity: number; channel: string }[]

  const regTotal = regs.reduce(
    (s, r) => s + (Number(r.fee_amount) || 0) + (Number(r.donation_amount) || 0),
    0,
  )

  // Only the signup-channel purchases are part of the registration checkout.
  // (Day-of check-in purchases are settled separately and must not inflate the
  // amount charged at registration.)
  const purchaseTotal = purchases
    .filter((p) => p.channel === 'signup')
    .reduce((s, p) => s + (Number(p.amount) || 0) * (Number(p.quantity) || 1), 0)

  return Math.round((regTotal + purchaseTotal) * 100) / 100
}
