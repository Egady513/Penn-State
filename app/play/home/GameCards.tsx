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
  used_count: number | null
  quantity: number | null
  player_id: string | null
  catalog_item: { name: string; tag: string | null; uses_per_unit: number | null } | null
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
        .select('id, paid_status, used, used_count, quantity, player_id, catalog_item:catalog_item_id(name, tag, uses_per_unit)')
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

  /** Total uses a purchase is worth: 5 throws per Ball Toss card, 1 for the rest. */
  const totalUses = (p: PurchaseRow) =>
    Math.max(1, p.catalog_item?.uses_per_unit ?? 1) * Math.max(1, p.quantity ?? 1)

  const usedOf = (p: PurchaseRow) => p.used_count ?? (p.used ? totalUses(p) : 0)

  /** Tap a use up or down. The RPC clamps to what was actually bought. */
  async function changeUses(p: PurchaseRow, delta: 1 | -1) {
    const next = Math.min(totalUses(p), Math.max(0, usedOf(p) + delta))
    if (next === usedOf(p)) return
    setPurchases(prev => prev?.map(x =>
      x.id === p.id ? { ...x, used_count: next, used: next >= totalUses(p) } : x) ?? null)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('set_purchase_uses', { p_id: p.id, p_delta: delta })
  }

  if (!purchases) return null

  const contest = purchases.filter(p => p.catalog_item?.tag === 'ctp' || p.catalog_item?.tag === 'ld')
  // "Advantages" = things you actually play during the round. Everything
  // untagged used to land here, which wrongly listed raffle tickets as an
  // advantage card you could "mark used".
  const advantages = purchases.filter(p =>
    p.catalog_item &&
    !p.catalog_item.tag &&
    !p.catalog_item.name.toLowerCase().includes('raffle')
  )

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

  // A row per GOLFER on the team, with closest-to-pin and long-drive shown
  // separately. They used to be collapsed into one "Paid & in" line, which
  // stopped making sense once each could be bought on its own for $12.
  const entryFor = (pid: string | null, tag: 'ctp' | 'ld') =>
    contest.find(c => c.catalog_item?.tag === tag && (c.player_id === pid || c.player_id === null))

  const challengeGolfers = players.map(pl => ({
    pid: pl.id,
    name: pl.name,
    ctp: entryFor(pl.id, 'ctp'),
    ld: entryFor(pl.id, 'ld'),
  }))

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
              <div key={g.pid} className={styles.challengeRow}>
                <span className={styles.rowName}>{g.name}</span>
                <span className={styles.pills}>
                  {([['CTP', g.ctp], ['LD', g.ld]] as const).map(([label, entry]) => (
                    <span
                      key={label}
                      className={`${styles.pill} ${
                        !entry ? styles.pillOut
                          : entry.paid_status === 'paid' ? styles.pillPaid
                          : styles.pillOwed
                      }`}
                    >
                      {label}{' '}
                      {!entry ? 'not in' : entry.paid_status === 'paid' ? 'paid' : 'on tab'}
                    </span>
                  ))}
                </span>
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
            {advantages.map(a => {
              const total = totalUses(a)
              const used = usedOf(a)
              if (total > 1) {
                return (
                  <div key={a.id} className={styles.row}>
                    <span className={styles.rowName}>
                      {a.catalog_item?.name}
                      <span className={styles.useCount}>{used} of {total} used</span>
                    </span>
                    <span className={styles.stepper}>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        disabled={used === 0}
                        onClick={() => changeUses(a, -1)}
                        aria-label={`Undo one ${a.catalog_item?.name ?? 'use'}`}
                      >
                        &minus;
                      </button>
                      <button
                        type="button"
                        className={styles.stepBtn}
                        disabled={used >= total}
                        onClick={() => changeUses(a, 1)}
                        aria-label={`Use one ${a.catalog_item?.name ?? 'use'}`}
                      >
                        +
                      </button>
                    </span>
                  </div>
                )
              }
              return (
                <div key={a.id} className={styles.row}>
                  <span className={styles.rowName}>{a.catalog_item?.name}</span>
                  {used > 0 ? (
                    <button
                      type="button"
                      className={`${styles.cardBtn} ${styles.cardBtnUsed}`}
                      onClick={() => changeUses(a, -1)}
                    >
                      <Icon name="check" size={13} /> Used · undo
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.cardBtn}
                      onClick={() => changeUses(a, 1)}
                    >
                      Mark used
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
