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

export interface AddonSelection {
  id: string
  quantity: number
}

export interface RegisterPayload {
  teamName: string
  isSingle: boolean
  golfers: GolferData[]
  /** Selected per-team add-ons with quantity (defaults to 1 for non-multi items) */
  addons: AddonSelection[]
  /**
   * Long-Drive + Closest-to-Pin challenge entry:
   *  'individual' = one golfer in both contests ($20)
   *  'team'       = both golfers in both contests ($40)
   *  null         = not entered
   */
  challenge: 'individual' | 'team' | null
  /** For individual challenge entries: which golfer index (0 = primary, 1 = second). Ignored for team. */
  challengeGolferIndex?: number
  /** Optional donation in dollars */
  donation: number
  /** Optional amount the registrant chose to add to cover card processing fees. */
  feeCoverage?: number
  /** Hole sponsorship ($100 + a $15 team discount). Twosomes only. */
  holeSponsor?: boolean
  /** Display name for the hole (business name, etc). Required if holeSponsor. */
  holeSponsorName?: string
  /** Public URL of the sponsor logo uploaded to Supabase storage. */
  holeSponsorLogoUrl?: string
  /** If this twosome wants to play with an already-registered team, that team's id. */
  pairRequestTeamId?: string | null
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
  const donation = Math.max(0, Number(payload.donation) || 0)
  const feeCoverage = Math.max(0, Number(payload.feeCoverage) || 0)

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
      event_id:               EVENT_ID,
      name:                   payload.teamName.trim(),
      pin,
      single_golfer:          payload.isSingle,
      payment_status:         'unpaid',
      hole_sponsor_name:      payload.holeSponsorName?.trim() || null,
      hole_sponsor_logo_url:  payload.holeSponsorLogoUrl || null,
      pair_request_team_id:   payload.pairRequestTeamId || null,
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
      team_id:             teamId,
      fee_amount:          baseFee,
      donation_amount:     donation,
      fee_coverage_amount: feeCoverage,
      payment_method:      null, // Stripe is the only method; webhook confirms payment
      payment_status:      'unpaid',
    })
    if (regError) {
      await rollback()
      return { error: `Could not create registration: ${regError.message}` }
    }

    // 4 ── Build itemized purchases
    const purchases: PurchaseRow[] = []

    // Per-team add-ons (gimme rope, advantage cards) — selected by catalog id
    // with quantity. The `amount` is per-unit; the webhook + computeTeamTotal
    // multiply by quantity, so a multi-buy item rolls up correctly.
    for (const sel of payload.addons ?? []) {
      const item = findById(sel.id)
      const qty = Math.max(1, Math.floor(Number(sel.quantity) || 1))
      if (item) {
        purchases.push({
          catalog_item_id: item.id, team_id: teamId, player_id: null,
          quantity: qty, amount: item.price, paid_status: 'unpaid', channel: 'signup',
        })
      }
    }

    // Hole sponsorship: +$100 for anyone; the -$15 twosome discount only for twosomes.
    if (payload.holeSponsor) {
      const holeItem = findByTag('hole_sponsor')
      if (holeItem) {
        purchases.push({
          catalog_item_id: holeItem.id, team_id: teamId, player_id: null,
          quantity: 1, amount: holeItem.price, paid_status: 'unpaid', channel: 'signup',
        })
      }
      if (!payload.isSingle) {
        const discountItem = findByTag('hole_sponsor_discount')
        if (discountItem) {
          purchases.push({
            catalog_item_id: discountItem.id, team_id: teamId, player_id: null,
            quantity: 1, amount: discountItem.price, paid_status: 'unpaid', channel: 'signup',
          })
        }
      }
    }

    // Challenge: CTP + LD entry for each entered golfer
    if (payload.challenge) {
      const ctp = findByTag('ctp')
      const ld = findByTag('ld')
      const idx = Math.min(payload.challengeGolferIndex ?? 0, playerIds.length - 1)
      const entered = payload.challenge === 'team' ? playerIds : playerIds.slice(idx, idx + 1)
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
