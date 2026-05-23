'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Stepper } from '@/components/ui/Stepper'
import { ScoreGlyph } from '@/components/ui/ScoreGlyph'
import { Icon } from '@/components/ui/Icon'
import { MY_TEAM, PLAYER_HOLES, PLAYER_SPONSORS } from '@/lib/mockData'

// Build a hole→sponsor lookup
const sponsorByHole: Record<number, { name: string; amount: number }> = {}
;['eagle', 'birdie', 'par'].forEach(tier => {
  (PLAYER_SPONSORS[tier as keyof typeof PLAYER_SPONSORS] || []).forEach((s: { name: string; amount: number; hole: number }) => {
    if (s.hole) sponsorByHole[s.hole] = s
  })
})

export default function ScorecardPage() {
  const [scores, setScores] = useState<Record<number, number>>({ ...MY_TEAM.scores })
  const [mulligans, setMulligans] = useState<Record<number, number>>({ ...MY_TEAM.mulligans })

  const firstUnscored = PLAYER_HOLES.find(h => scores[h.n] == null)?.n ?? PLAYER_HOLES[PLAYER_HOLES.length - 1].n
  const [activeHole, setActiveHole] = useState(firstUnscored)
  const [draftScore, setDraftScore] = useState(scores[activeHole] ?? PLAYER_HOLES[activeHole - 1].par)

  const miniRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftScore(scores[activeHole] ?? PLAYER_HOLES[activeHole - 1].par)
  }, [activeHole])

  useEffect(() => {
    if (!miniRef.current) return
    const el = miniRef.current.querySelector(`[data-hole="${activeHole}"]`) as HTMLElement | null
    if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeHole])

  const scoredEntries = Object.entries(scores).filter(([, v]) => v != null)
  const through = scoredEntries.length
  const totalScore = scoredEntries.reduce((a, [, v]) => a + v, 0)
  const totalToPar = scoredEntries.reduce((acc, [hole, score]) => {
    const par = PLAYER_HOLES[Number(hole) - 1].par
    return acc + (score - par)
  }, 0)
  const toParDisplay = through === 0 ? '—' : totalToPar === 0 ? 'E' : (totalToPar > 0 ? `+${totalToPar}` : `${totalToPar}`)

  const completeHole = () => {
    setScores(prev => ({ ...prev, [activeHole]: draftScore }))
    // Advance to next unscored
    const updatedScores = { ...scores, [activeHole]: draftScore }
    const startIdx = PLAYER_HOLES.findIndex(h => h.n === activeHole)
    const order = [
      ...PLAYER_HOLES.slice(startIdx + 1),
      ...PLAYER_HOLES.slice(0, startIdx),
    ]
    const next = order.find(h => updatedScores[h.n] == null)
    if (next) setActiveHole(next.n)
  }

  const holeObj = PLAYER_HOLES[activeHole - 1]
  const sponsor = sponsorByHole[activeHole]
  const holeContest = holeObj.contest
  const contestName = holeContest === 'ctp' ? 'Closest to pin' : holeContest === 'ld' ? 'Long drive' : null
  const diff = draftScore - holeObj.par
  const scoreColor =
    diff <= -2 ? 'var(--score-eagle)'  :
    diff === -1 ? 'var(--score-birdie)' :
    diff === 0  ? '#fff'                :
    diff === 1  ? 'var(--score-bogey)'  :
    'var(--score-double)'

  const holeMultigans = mulligans[activeHole] ?? 0
  const isScored = scores[activeHole] != null

  return (
    <PlayerShell
      title="Scorecard"
      subtitle={`Through ${through} of 18`}
      syncStatus="synced"
      liftBar
    >
      {/* Floating stat strip */}
      <div className={styles.statStrip}>
        <StatCell label="Total" value={totalScore || '—'} testId="stat-total" />
        <StatCell label="To par" value={toParDisplay} accent testId="stat-topar" />
        <StatCell label="Thru" value={through} testId="stat-thru" />
      </div>

      {/* Mini scorecard — horizontal scroll */}
      <div className={styles.miniCardSection}>
        <div className={styles.miniCardHeader}>
          <span>Card</span>
          <span className={styles.miniCardHint}>Tap any hole to enter</span>
        </div>
        <div className={styles.miniCardScroll} ref={miniRef}>
          {PLAYER_HOLES.map(h => {
            const s = scores[h.n]
            const isActive = h.n === activeHole
            const isScored = s != null
            const d = isScored ? s - h.par : null
            const scoreColor =
              !isScored ? 'var(--fg-subtle)' :
              d! < 0 ? 'var(--score-birdie)' :
              d === 0 ? 'var(--fg)' :
              d === 1 ? 'var(--score-bogey)' :
              'var(--score-double)'
            return (
              <button
                key={h.n}
                data-hole={h.n}
                onClick={() => setActiveHole(h.n)}
                className={`${styles.miniTile} ${isActive ? styles.miniTileActive : ''}`}
              >
                <div className={`${styles.miniHoleLabel} ${isActive ? styles.miniHoleLabelActive : ''}`}>H{h.n}</div>
                <div className={`${styles.miniPar} ${isActive ? styles.miniParActive : ''}`}>par {h.par}</div>
                <div
                  className={`${styles.miniScore} num`}
                  style={{ color: isActive ? '#fff' : scoreColor }}
                >
                  {isScored ? s : '—'}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Active hole editor */}
      <div className={styles.editorWrap}>
        <div className={styles.holeEditor}>
          {sponsor && (
            <div className={styles.sponsorBanner}>
              <div className={styles.sponsorThumb} />
              <div className={styles.sponsorInfo}>
                <div className={styles.sponsorLabel}>This hole brought to you by</div>
                <div className={styles.sponsorName}>{sponsor.name}</div>
              </div>
            </div>
          )}

          {holeContest && (
            <div className={styles.contestBanner}>
              <div className={styles.contestIcon}>
                <Icon name="target" size={16} color="#fff" />
              </div>
              <div className={styles.contestInfo}>
                <div className={styles.contestLabel}>{holeContest === 'ctp' ? 'Closest-to-pin hole' : 'Long-drive hole'}</div>
                <div className={styles.contestDesc}>{contestName} contest on this hole</div>
              </div>
            </div>
          )}

          <div className={styles.holeHeader}>
            <div>
              <div className={styles.holeOverline}>You&apos;re playing</div>
              <div className={styles.holeNumber}>Hole {holeObj.n}</div>
              <div className={styles.holePar}>
                Par {holeObj.par}{contestName ? ` · ${contestName}` : ''}
              </div>
            </div>
            {isScored && (
              <div className={styles.savedBadge}>
                <Icon name="check" size={11} color="var(--psu-pugh)" />
                Already saved
              </div>
            )}
          </div>

          <div className={styles.scoreRow}>
            <div>
              <div className={styles.scoreLabel}>Team score</div>
              <div
                className={`${styles.bigScore} num`}
                style={{ color: scoreColor }}
              >
                {draftScore}
              </div>
              <div className={styles.relScore}>
                {diff === 0 ? 'Even' : diff > 0 ? `+${diff} to par` : `${diff} to par`}
              </div>
            </div>
            <Stepper value={draftScore} onChange={setDraftScore} min={1} max={12} dark />
          </div>

          <div className={styles.mulliganRow}>
            <div>
              <div className={styles.mulliganLabel}>Mulligans this hole</div>
              <div className={styles.mulliganSub}>Max 2 · $2 each</div>
            </div>
            <div className={styles.mulliganSlots}>
              {[1, 2].map(slot => {
                const filled = holeMultigans >= slot
                return (
                  <button
                    key={slot}
                    onClick={() => setMulligans(m => ({ ...m, [activeHole]: filled ? slot - 1 : slot }))}
                    aria-label={filled ? `Remove mulligan ${slot}` : `Add mulligan ${slot}`}
                    className={`${styles.mulliganSlot} ${filled ? styles.mulliganSlotFilled : ''}`}
                  >
                    {filled ? slot : '+'}
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.editorFooter}>
            <button className={styles.completeBtn} onClick={completeHole}>
              {isScored ? 'Update & go to next hole' : 'Complete hole'}
              <Icon name="chevron-right" size={20} color="var(--psu-navy)" />
            </button>
          </div>
        </div>
      </div>
    </PlayerShell>
  )
}

function StatCell({ label, value, accent, testId }: { label: string; value: string | number; accent?: boolean; testId?: string }) {
  return (
    <div className={styles.statCell} data-testid={testId}>
      <div className={styles.statLabel}>{label}</div>
      <div className={`${styles.statValue} num`} style={{ color: accent ? 'var(--psu-beaver)' : 'var(--fg)' }}>
        {value}
      </div>
    </div>
  )
}
