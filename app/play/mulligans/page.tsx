'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Icon } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'
import { getTeamId } from '@/lib/getTeamId'
import { EVENT_ID } from '@/lib/eventId'

type HoleInfo = { n: number; par: number }

export default function MulligansPage() {
  const [holes, setHoles] = useState<HoleInfo[]>([])
  const [mulligans, setMulligans] = useState<Record<number, number>>({})
  const [loaded, setLoaded] = useState(false)

  const teamId = getTeamId()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [holeRes, mullRes] = await Promise.all([
        supabase.from('hole').select('number, par').eq('event_id', EVENT_ID).order('number'),
        supabase.from('mulligan').select('hole_number, count').eq('team_id', teamId),
      ])

      const holeRows = holeRes.data as { number: number; par: number }[] | null
      const mullRows = mullRes.data as { hole_number: number; count: number }[] | null

      const mullMap: Record<number, number> = {}
      mullRows?.forEach(m => { mullMap[m.hole_number] = m.count })

      setHoles((holeRows ?? []).map(h => ({ n: h.number, par: h.par })))
      setMulligans(mullMap)
      setLoaded(true)
    }
    load()
  }, [])

  const total = Object.values(mulligans).reduce((a, b) => a + b, 0)

  const setMull = async (hole: number, count: number) => {
    const clamped = Math.max(0, Math.min(2, count))
    setMulligans(m => ({ ...m, [hole]: clamped }))

    // Persist to Supabase
    if (clamped > 0) {
      // Reset paid=false on any change so mulligans added after a card
      // settlement get re-billed (the webhook only marks existing unpaid ones).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('mulligan') as any).upsert(
        { team_id: teamId, hole_number: hole, count: clamped, paid: false },
        { onConflict: 'team_id,hole_number' }
      )
    } else {
      await supabase
        .from('mulligan')
        .delete()
        .eq('team_id', teamId)
        .eq('hole_number', hole)
    }
  }

  if (!loaded) {
    return (
      <PlayerShell title="Mulligans" subtitle="Max 2 per hole · $2 each" syncStatus="synced" liftBar>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-subtle)' }}>Loading…</div>
      </PlayerShell>
    )
  }

  return (
    <PlayerShell
      title="Mulligans"
      subtitle="Max 2 per hole · $2 each"
      syncStatus="synced"
      liftBar
    >
      {/* Summary card */}
      <div className={styles.summaryCard}>
        <div>
          <div className={styles.summaryLabel}>Used today</div>
          <div className={`${styles.summaryValue} num`}>{total}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className={styles.summaryLabel}>You owe</div>
          <div className={`${styles.oweValue} num`}>${total * 2}</div>
        </div>
      </div>

      {/* Per-hole list */}
      <div className={styles.holeList}>
        {holes.map(h => {
          const m = mulligans[h.n] ?? 0
          const atMax = m >= 2
          return (
            <div key={h.n} className={styles.holeRow}>
              <div className={styles.holeNum}>{h.n}</div>
              <div className={styles.holeInfo}>
                <div className={styles.holeLabel}>
                  {m} mulligan{m === 1 ? '' : 's'}
                  {atMax && <span className={styles.maxTag}>· max reached</span>}
                </div>
                <div className={styles.holeSub}>
                  Par {h.par}{m > 0 ? ` · $${m * 2}` : ''}
                </div>
              </div>
              <div className={styles.holeControls}>
                <button
                  onClick={() => setMull(h.n, m - 1)}
                  disabled={m === 0}
                  className={styles.stepBtn}
                  aria-label="Remove mulligan"
                >
                  <Icon name="minus" size={16} />
                </button>
                <button
                  onClick={() => setMull(h.n, m + 1)}
                  disabled={atMax}
                  className={`${styles.stepBtn} ${!atMax ? styles.stepBtnAdd : styles.stepBtnDisabled}`}
                  aria-label="Add mulligan"
                >
                  <Icon name="plus" size={16} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </PlayerShell>
  )
}
