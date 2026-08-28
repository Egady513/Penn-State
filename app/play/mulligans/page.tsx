'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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

  const router = useRouter()

  const cookieTeamId = getTeamId()

  // No cookie means they never entered a PIN — send them to the login

  // screen rather than silently loading another team's data.

  useEffect(() => { if (!cookieTeamId) router.replace('/play') }, [cookieTeamId, router])

  const teamId = cookieTeamId ?? ''
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
    const prev = mulligans[hole] ?? 0
    setMulligans(m => ({ ...m, [hole]: clamped }))

    // One RPC for both directions. A plain client DELETE reported success
    // while RLS filtered every row, so backing down to 0 left the count in
    // the database and kept billing $2 for a mulligan that was removed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('set_mulligan', {
      p_team_id: teamId, p_hole_number: hole, p_count: clamped,
    })
    if (error) {
      setMulligans(m => ({ ...m, [hole]: prev }))
      alert("Couldn't save that mulligan. Check your signal and try again.")
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
