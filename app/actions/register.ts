'use server'

import { createClient } from '@/lib/supabase/server'
import { EVENT_ID } from '@/lib/eventId'

export interface GolferData {
  name: string
  email: string
  phone: string
  skill: string
  dietary: string
}

export interface RegisterPayload {
  teamName: string
  isSingle: boolean
  golfers: GolferData[]
  /** Selected add-on ids from the form: 'gimme' | 'ctp' | 'ld' | 'adv' */
  addons: string[]
  /** Optional donation in dollars */
  donation: number
}

export interface RegisterResult {
  teamId?: string
  pin?: string
  error?: string
}

/** Generate a random 4-digit PIN string, e.g. "4821" */
function randomPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000))
}

// Maps a form add-on id → a name pattern that matches the seeded catalog_item.
// Catalog names (supabase/seed.sql): 'Gimme rope (3 ft)', 'Closest-to-pin entry',
// 'Long-drive entry', 'Advantage card: …'.
const ADDON_CATALOG_PATTERN: Record<string, string> = {
  gimme: 'gimme',
  ctp: 'closest',
  ld: 'long-drive',
  adv: 'advantage',
}

/**
 * Save a new team registration to Supabase.
 * Writes: team → players → registration (base fee + donation) → one purchase
 * row per selected add-on (so the money is itemized and contest entries flag
 * as paid on the day-of scorecard).
 * Returns { teamId, pin } on success or { error } on failure.
 */
export async function registerTeam(payload: RegisterPayload): Promise<RegisterResult> {
  const supabase = await createClient()

  const baseFee = payload.isSingle ? 100 : 200
  const donation = Number(payload.donation) || 0

  // Look up the catalog items once so we can itemize the selected add-ons.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catalog } = await (supabase.from('catalog_item') as any)
    .select('id, name, price')
    .eq('event_id', EVENT_ID)
    .eq('active', true) as { data: { id: string; name: string; price: number }[] | null }

  // Build the purchase rows for the selected add-ons (team_id filled in below).
  const addonItems = (payload.addons ?? [])
    .map(id => {
      const pattern = ADDON_CATALOG_PATTERN[id]
      if (!pattern || !catalog) return null
      const item = catalog.find(c => c.name.toLowerCase().includes(pattern))
      return item ? { catalog_item_id: item.id, amount: item.price } : null
    })
    .filter((x): x is { catalog_item_id: string; amount: number } => x !== null)

  // Try up to 5 PINs in case of collision (unique constraint on event_id + pin)
  for (let attempt = 0; attempt < 5; attempt++) {
    const pin = randomPin()

    // 1 ── Insert team
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const teamInsert = await (supabase.from('team') as any).insert({
      event_id:      EVENT_ID,
      name:          payload.teamName.trim(),
      pin,
      single_golfer: payload.isSingle,
      payment_status: 'unpaid',
    }).select('id').single()

    if (teamInsert.error) {
      // 23505 = unique_violation (PIN collision) → retry
      if (teamInsert.error.code === '23505') continue
      return { error: `Could not create team: ${teamInsert.error.message}` }
    }

    const teamId = (teamInsert.data as { id: string }).id

    // Helper to roll back the team if a later step fails
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rollback = async () => { await (supabase.from('team') as any).delete().eq('id', teamId) }

    // 2 ── Insert players (with skill level)
    const playerRows = payload.golfers.map(g => ({
      team_id:       teamId,
      name:          g.name.trim(),
      email:         g.email.trim(),
      phone:         g.phone.trim() || null,
      skill_level:   g.skill || null,
      dietary_notes: g.dietary.trim() || null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: playerError } = await (supabase.from('player') as any).insert(playerRows)
    if (playerError) {
      await rollback()
      return { error: `Could not save player info: ${playerError.message}` }
    }

    // 3 ── Insert registration (base fee + donation, both unpaid)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: regError } = await (supabase.from('registration') as any).insert({
      team_id:         teamId,
      fee_amount:      baseFee,
      donation_amount: donation,
      payment_method:  null,          // method chosen at the Pay step
      payment_status:  'unpaid',
    })
    if (regError) {
      await rollback()
      return { error: `Could not create registration: ${regError.message}` }
    }

    // 4 ── Insert one purchase row per selected add-on (itemized, unpaid)
    if (addonItems.length > 0) {
      const purchaseRows = addonItems.map(a => ({
        catalog_item_id: a.catalog_item_id,
        team_id:         teamId,
        quantity:        1,
        amount:          a.amount,
        paid_status:     'unpaid',
        channel:         'signup',
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: purchError } = await (supabase.from('purchase') as any).insert(purchaseRows)
      if (purchError) {
        await rollback()
        return { error: `Could not save add-ons: ${purchError.message}` }
      }
    }

    return { teamId, pin }
  }

  return { error: 'Could not assign a unique PIN. Please try again.' }
}
