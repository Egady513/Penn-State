'use client'

import { useState } from 'react'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Icon } from '@/components/ui/Icon'
import { MY_TEAM, PLAYER_HOLES } from '@/lib/mockData'

export default function MulligansPage() {
  const [mulligans, setMulligans] = useState<Record<number, number>>({ ...MY_TEAM.mulligans })

  const total = Object.values(mulligans).reduce((a, b) => a + b, 0)

  const setMull = (hole: number, count: number) => {
    setMulligans(m => ({ ...m, [hole]: Math.max(0, Math.min(2, count)) }))
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
        {PLAYER_HOLES.map(h => {
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
