'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'
import { Icon } from '@/components/ui/Icon'
import styles from './GameCards.module.css'

type PurchaseRow = {
  id: string
  paid_status: 'paid' | 'unpaid' | 'partial'
  used: boolean
  player_id: string | null
  catalog_item: { name: string; tag: string | null } | null
}

type Player = { id: string; name: string }
type HoleContest = { number: number; contest_type: string; contest_label: string | null }

// "Holes 3 & 12" from a list of hole numbers.
const fmtHoles = (nums: number[]) =>
  nums.length ? `Holes ${nums.slice().sort((a, b) => a - b).join(' & ')}` : null

export function GameCards({ teamId }: { teamId: string }) {
  const [purchases, setPurchases] = useState<PurchaseRow[] | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [holeContests, setHoleContests] = useState<HoleContest[]>([])

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.from('purchase') as any)
        .select('id, paid_status, used, player_id, catalog_item:catalog_item_id(name, tag)')
        .eq('team_id', teamId),
      supabase.from('player').select('id, name').eq('team_id', teamId),
      // Real contest-hole assignments from the admin Course page — replaces
      // the old hardcoded "3 & 12 / 6 & 16" placeholder text.
      supabase.from('hole').select('number, contest_type, contest_label').eq('event_id', EVENT_ID).order('number'),
    ]).then(([pRes, plRes, hRes]: [{ data: PurchaseRow[] | null }, { data: Player[] | null }, { data: HoleContest[] | null }]) => {
      setPurchases(pRes.data ?? [])
      setPlayers(plRes.data ?? [])
      setHoleContests(hRes.data ?? [])
    })
  }, [teamId])

  async function markUsed(id: string, used: boolean) {
    setPurchases(prev => prev?.map(p => (p.id === id ? { ...p, used } : p)) ?? null)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('set_purchase_used', { p_id: id, p_used: used })
  }

  if (!purchases) return null

  const contest = purchases.filter(p => p.catalog_item?.tag === 'ctp' || p.catalog_item?.tag === 'ld')
  const advantages = purchases.filter(p => p.catalog_item && !p.catalog_item.tag)

  const nameOf = (id: string | null) => players.find(p => p.id === id)?.name ?? 'Your team'

  // Build "Closest-to-Pin · Holes 3 & 12 · Long Drive · Holes 6 & 16" from
  // real hole data, plus any custom challenges Eddie's added per hole.
  const ctpHoles = fmtHoles(holeContests.filter(h => h.contest_type === 'closest_to_pin').map(h => h.number))
  const ldHoles = fmtHoles(holeContests.filter(h => h.contest_type === 'long_drive').map(h => h.number))
  const customChallenges = holeContests.filter(h => h.contest_label)
  const holeMapParts = [
    ctpHoles && `Closest-to-Pin · ${ctpHoles}`,
    ldHoles && `Long Drive · ${ldHoles}`,
    ...customChallenges.map(h => `${h.contest_label} · Hole ${h.number}`),
  ].filter(Boolean)
  const holeMapText = holeMapParts.length > 0
    ? holeMapParts.join(' · ')
    : 'Ask at the tent for today’s challenge holes.'

  // One row per golfer that has any contest entry
  const challengeGolfers = Array.from(new Set(contest.map(c => c.player_id))).map(pid => {
    const rows = contest.filter(c => c.player_id === pid)
    return {
      pid,
      name: nameOf(pid),
      paid: rows.every(r => r.paid_status === 'paid'),
    }
  })

  return (
    <div className={styles.wrap}>
      {/* ── Skills Challenge ─────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Skills Challenge</div>
        <div className={styles.holeMap}>{holeMapText}</div>

        {challengeGolfers.length === 0 ? (
          <div className={styles.empty}>Not entered. Add it at the contest hole or the tent.</div>
        ) : (
          <div className={styles.rows}>
            {challengeGolfers.map(g => (
              <div key={g.pid ?? 'team'} className={styles.row}>
                <span className={styles.rowName}>{g.name}</span>
                {g.paid ? (
                  <span className={`${styles.status} ${styles.statusPaid}`}>
                    <Icon name="check" size={13} /> Paid &amp; in
                  </span>
                ) : (
                  <span className={`${styles.status} ${styles.statusUnpaid}`}>
                    In · settle at tent
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Your Advantages ──────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>Your Advantages</div>

        {advantages.length === 0 ? (
          <div className={styles.empty}>No advantage cards purchased.</div>
        ) : (
          <div className={styles.rows}>
            {advantages.map(a => (
              <div key={a.id} className={styles.row}>
                <span className={styles.rowName}>{a.catalog_item?.name}</span>
                {a.used ? (
                  <button
                    type="button"
                    className={`${styles.cardBtn} ${styles.cardBtnUsed}`}
                    onClick={() => markUsed(a.id, false)}
                  >
                    <Icon name="check" size={13} /> Used · undo
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.cardBtn}
                    onClick={() => markUsed(a.id, true)}
                  >
                    Mark used
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
