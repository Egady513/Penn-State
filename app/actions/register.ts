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
  /** Selected per-team add-on catalog_item ids (UUIDs from the catalog) */
  addons: string[]
  /**
   * Long-Drive + Closest-to-Pin challenge entry:
   *  'individual' = one golfer in both contests ($20)
   *  'team'       = both golfers in both contests ($40)
   *  null         = not entered
   */
  challenge: 'individual' | 'team' | null
  /** Optional donation in dollars */
  donation: number
  /** Hole sponsorship ($100 + a $15 team discount). Twosomes only. */
  holeSponsor?: boolean
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

type CatalogRow = { id: string; name: string; price: number; tag: string | null }
type PurchaseRow = {
  catalog_item_id: string
  team_id: string
  player_id: string | null
  quantity: number
  amount: number
  paid_status: 'unpaid'
  channel: 'signup'
}

/**
 * Save a new team registration to Supabase.
 * Writes: team → players → registration (base fee + donation) → itemized
 * purchase rows. Per-team add-ons attach to the team; the challenge writes a
 * Closest-to-pin + Long-drive entry for each entered golfer (so the money is
 * itemized AND both contests flag as entered on the day-of scorecard).
 */
export async function registerTeam(payload: RegisterPayload): Promise<RegisterResult> {
  const supabase = await createClient()

  const baseFee = payload.isSingle ? 100 : 200
  const donation = Number(payload.donation) || 0

  // Look up the catalog items once so we can itemize.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catalog } = await (supabase.from('catalog_item') as any)
    .select('id, name, price, tag')
    .eq('event_id', EVENT_ID)
    .eq('active', true) as { data: CatalogRow[] | null }

  const findById  = (id: string)  => catalog?.find(c => c.id === id) ?? null
  const findByTag = (tag: string) => catalog?.find(c => c.tag === tag) ?? null

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
      if (teamInsert.error.code === '23505') continue // PIN collision → retry
      return { error: `Could not create team: ${teamInsert.error.message}` }
    }

    const teamId = (teamInsert.data as { id: string }).id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rollback = async () => { await (supabase.from('team') as any).delete().eq('id', teamId) }

    // 2 ── Insert players, returning their ids (for challenge attribution)
    const playerRows = payload.golfers.map(g => ({
      team_id:       teamId,
      name:          g.name.trim(),
      email:         g.email.trim(),
      phone:         g.phone.trim() || null,
      skill_level:   g.skill || null,
      dietary_notes: g.dietary.trim() || null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerInsert = await (supabase.from('player') as any).insert(playerRows).select('id')
    if (playerInsert.error) {
      await rollback()
      return { error: `Could not save player info: ${playerInsert.error.message}` }
    }
    const playerIds = (playerInsert.data as { id: string }[]).map(p => p.id)

    // 3 ── Insert registration (base fee + donation)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: regError } = await (supabase.from('registration') as any).insert({
      team_id:         teamId,
      fee_amount:      baseFee,
      donation_amount: donation,
      payment_method:  null, // Stripe is the only method; webhook confirms payment
      payment_status:  'unpaid',
    })
    if (regError) {
      await rollback()
      return { error: `Could not create registration: ${regError.message}` }
    }

    // 4 ── Build itemized purchases
    const purchases: PurchaseRow[] = []

    // Per-team add-ons (gimme rope, advantage cards) — selected by catalog id
    for (const id of payload.addons ?? []) {
      const item = findById(id)
      if (item) {
        purchases.push({
          catalog_item_id: item.id, team_id: teamId, player_id: null,
          quantity: 1, amount: item.price, paid_status: 'unpaid', channel: 'signup',
        })
      }
    }

    // Hole sponsorship (twosomes only): +$100 sponsorship and -$15 discount,
    // both as itemized signup purchases so they show on the receipt and feed
    // the server-side total.
    if (payload.holeSponsor && !payload.isSingle) {
      const holeItem = findByTag('hole_sponsor')
      const discountItem = findByTag('hole_sponsor_discount')
      for (const item of [holeItem, discountItem]) {
        if (item) {
          purchases.push({
            catalog_item_id: item.id, team_id: teamId, player_id: null,
            quantity: 1, amount: item.price, paid_status: 'unpaid', channel: 'signup',
          })
        }
      }
    }

    // Challenge: CTP + LD entry for each entered golfer
    if (payload.challenge) {
      const ctp = findByTag('ctp')
      const ld = findByTag('ld')
      const entered = payload.challenge === 'team' ? playerIds : playerIds.slice(0, 1)
      for (const pid of entered) {
        for (const item of [ctp, ld]) {
          if (item) {
            purchases.push({
              catalog_item_id: item.id, team_id: teamId, player_id: pid,
              quantity: 1, amount: item.price, paid_status: 'unpaid', channel: 'signup',
            })
          }
        }
      }
    }

    if (purchases.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: purchError } = await (supabase.from('purchase') as any).insert(purchases)
      if (purchError) {
        await rollback()
        return { error: `Could not save add-ons: ${purchError.message}` }
      }
    }

    return { teamId, pin }
  }

  return { error: 'Could not assign a unique PIN. Please try again.' }
}
