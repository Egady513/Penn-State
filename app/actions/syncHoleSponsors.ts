'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { EVENT_ID } from '@/lib/eventId'

/**
 * Backfill hole-sponsor records from paid registrations.
 *
 * The Stripe webhook normally creates a `sponsor` row when a team buys a
 * hole sponsorship. But that only runs on a real webhook delivery — if the
 * webhook is missed and the team is marked paid by hand (set_team_paid),
 * the sponsor row is never created and the sponsorship silently disappears
 * from the public page, emails, and the course export.
 *
 * This finds every paid team that bought a hole sponsorship, and creates a
 * sponsor row for any that don't already have one. Idempotent — safe to run
 * as often as you like; it never touches or overwrites existing sponsors.
 */
export interface SyncResult {
  created: { name: string }[]
  alreadyPresent: number
  error?: string
}

export async function syncHoleSponsors(): Promise<SyncResult> {
  try {
    const supabase = createAdminClient()

    // Paid teams that actually bought the hole-sponsor catalog item.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: purchaseRows, error: pErr } = await (supabase.from('purchase') as any)
      .select('team_id, catalog_item:catalog_item_id(tag)')
    if (pErr) return { created: [], alreadyPresent: 0, error: pErr.message }

    const sponsorTeamIds = new Set(
      ((purchaseRows ?? []) as { team_id: string; catalog_item: { tag: string | null } | null }[])
        .filter(p => p.catalog_item?.tag === 'hole_sponsor')
        .map(p => p.team_id)
    )
    if (sponsorTeamIds.size === 0) return { created: [], alreadyPresent: 0 }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: teams, error: tErr } = await (supabase.from('team') as any)
      .select('id, name, hole_sponsor_name, hole_sponsor_logo_url, hole_sponsor_hole, payment_status')
      .eq('event_id', EVENT_ID)
      .eq('payment_status', 'paid')
      .in('id', Array.from(sponsorTeamIds))
    if (tErr) return { created: [], alreadyPresent: 0, error: tErr.message }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: sponsors, error: sErr } = await (supabase.from('sponsor') as any)
      .select('name')
      .eq('event_id', EVENT_ID)
    if (sErr) return { created: [], alreadyPresent: 0, error: sErr.message }

    const existing = new Set(
      ((sponsors ?? []) as { name: string }[]).map(s => s.name.trim().toLowerCase())
    )

    type TeamRow = {
      id: string; name: string
      hole_sponsor_name: string | null
      hole_sponsor_logo_url: string | null
      hole_sponsor_hole: number | null
    }

    const created: { name: string }[] = []
    let alreadyPresent = 0

    for (const t of (teams ?? []) as TeamRow[]) {
      // Prefer the display name they entered; fall back to the team name —
      // same rule the webhook uses.
      const sponsorName = (t.hole_sponsor_name || t.name).trim()
      if (existing.has(sponsorName.toLowerCase())) { alreadyPresent++; continue }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insErr } = await (supabase.from('sponsor') as any).insert({
        event_id: EVENT_ID,
        name: sponsorName,
        logo_url: t.hole_sponsor_logo_url ?? null,
        sponsorship_type: 'Hole',
        hole_number: t.hole_sponsor_hole ?? null,
        amount: 100,
        active: true,
      })
      if (insErr) return { created, alreadyPresent, error: `Failed on "${sponsorName}": ${insErr.message}` }

      existing.add(sponsorName.toLowerCase())
      created.push({ name: sponsorName })
    }

    return { created, alreadyPresent }
  } catch (err) {
    return { created: [], alreadyPresent: 0, error: err instanceof Error ? err.message : String(err) }
  }
}
