'use server'

import { createClient } from '@/lib/supabase/server'
import { EVENT_ID } from '@/lib/eventId'

export interface GolferData {
  name: string
  email: string
  phone: string
  shirt: string
  dietary: string
}

export interface RegisterPayload {
  teamName: string
  isSingle: boolean
  golfers: GolferData[]
  feeAmount: number
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

/**
 * Save a new team registration to Supabase.
 * Called from RegisterSection before the Zeffy redirect.
 * Returns { teamId, pin } on success or { error } on failure.
 */
export async function registerTeam(payload: RegisterPayload): Promise<RegisterResult> {
  const supabase = await createClient()

  // Try up to 5 PINs in case of collision (unique constraint on event_id + pin)
  for (let attempt = 0; attempt < 5; attempt++) {
    const pin = randomPin()

    // 1 ── Insert team (registration_id stays NULL until step 3)
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

    // 2 ── Insert players
    const playerRows = payload.golfers.map(g => ({
      team_id:       teamId,
      name:          g.name.trim(),
      email:         g.email.trim(),
      phone:         g.phone.trim() || null,
      shirt_size:    g.shirt,
      dietary_notes: g.dietary.trim() || null,
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: playerError } = await (supabase.from('player') as any).insert(playerRows)
    if (playerError) {
      // Roll back by deleting the team we just created
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('team') as any).delete().eq('id', teamId)
      return { error: `Could not save player info: ${playerError.message}` }
    }

    // 3 ── Insert registration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: regError } = await (supabase.from('registration') as any).insert({
      team_id:        teamId,
      fee_amount:     payload.feeAmount,
      payment_method: 'zeffy',
      payment_status: 'unpaid',   // Zeffy webhook / admin will mark paid
    })
    if (regError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('team') as any).delete().eq('id', teamId)
      return { error: `Could not create registration: ${regError.message}` }
    }

    return { teamId, pin }
  }

  return { error: 'Could not assign a unique PIN. Please try again.' }
}
