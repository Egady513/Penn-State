'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Stepper } from '@/components/ui/Stepper'
import { Icon } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'
import { getTeamId } from '@/lib/getTeamId'
import { EVENT_ID } from '@/lib/eventId'

type HoleInfo    = { n: number; par: number; contest: 'ctp' | 'ld' | null }
type SponsorMap  = Record<number, { name: string; amount: number }>
type ContestEntries = { ctp: boolean; ld: boolean }

export default function ScorecardPage() {
  const [holes, setHoles] = useState<HoleInfo[]>([])
  const [scores, setScores] = useState<Record<number, number>>({})
  const [mulligans, setMulligans] = useState<Record<number, number>>({})
  const [sponsorByHole, setSponsorByHole] = useState<SponsorMap>({})
  const [contestEntries, setContestEntries] = useState<ContestEntries>({ ctp: false, ld: false })
  const [activeHole, setActiveHole] = useState(1)
  const [draftScore, setDraftScore] = useState(4)
  const [loaded, setLoaded] = useState(false)
  const miniRef = useRef<HTMLDivElement>(null)

  const teamId = getTeamId()
  const supabase = createClient()

  // Load all initial data on mount
  useEffect(() => {
    async function load() {
      const [holeRes, scoreRes, mullRes, sponsorRes, purchRes] = await Promise.all([
        supabase.from('hole').select('number, par, contest_type').eq('event_id', EVENT_ID).order('number'),
        supabase.from('score').select('hole_number, strokes').eq('team_id', teamId),
        supabase.from('mulligan').select('hole_number, count').eq('team_id', teamId),
        supabase.from('sponsor').select('name, amount, hole_id').eq('event_id', EVENT_ID).not('hole_id', 'is', null),
        supabase.from('purchase').select('catalog_item:catalog_item_id(name)').eq('team_id', teamId),
      ])

      const holeRows    = holeRes.data    as { number: number; par: number; contest_type: string }[] | null
      const scoreRows   = scoreRes.data   as { hole_number: number; strokes: number }[] | null
      const mullRows    = mullRes.data    as { hole_number: number; count: number }[] | null
      const sponsorRows = sponsorRes.data as { name: string; amount: number; hole_id: string | null }[] | null
      const purchRows   = purchRes.data   as { catalog_item: { name: string } | null }[] | null

      const mappedHoles: HoleInfo[] = (holeRows ?? []).map(h => ({
        n: h.number,
        par: h.par,
        contest: h.contest_type === 'closest_to_pin' ? 'ctp'
               : h.contest_type === 'long_drive' ? 'ld'
               : null,
      }))

      const scoreMap: Record<number, number> = {}
      scoreRows?.forEach(s => { scoreMap[s.hole_number] = s.strokes })

      const mullMap: Record<number, number> = {}
      mullRows?.forEach(m => { mullMap[m.hole_number] = m.count })

      // Build hole_id → hole_number map to join sponsors
      const holeIdToNum: Record<string, number> = {}
      holeRows?.forEach(h => { if ((h as any).id) holeIdToNum[(h as any).id] = h.number })

      // Re-fetch holes with id for sponsor join
      const holesWithIdRes = await supabase
        .from('hole')
        .select('id, number')
        .eq('event_id', EVENT_ID)
      const holesWithId = holesWithIdRes.data as { id: string; number: number }[] | null
      holesWithId?.forEach(h => { holeIdToNum[h.id] = h.number })

      const sponsMap: SponsorMap = {}
      sponsorRows?.forEach(s => {
        const num = holeIdToNum[s.hole_id!]
        if (num) sponsMap[num] = { name: s.name, amount: s.amount }
      })

      // Build contest entry flags from purchases
      const purchNames = (purchRows ?? []).map(p =>
        (p.catalog_item as { name: string } | null)?.name?.toLowerCase() ?? ''
      )
      const entries: ContestEntries = {
        ctp: purchNames.some(n => n.includes('closest')),
        ld:  purchNames.some(n => n.includes('long-drive') || n.includes('long drive')),
      }

      setHoles(mappedHoles)
      setScores(scoreMap)
      setMulligans(mullMap)
      setSponsorByHole(sponsMap)
      setContestEntries(entries)

      // Set active hole to first unscored
      const firstUnscored = mappedHoles.find(h => scoreMap[h.n] == null)?.n
        ?? mappedHoles[mappedHoles.length - 1]?.n ?? 1
      setActiveHole(firstUnscored)
      setDraftScore(scoreMap[firstUnscored] ?? (mappedHoles.find(h => h.n === firstUnscored)?.par ?? 4))
      setLoaded(true)
    }
    load()
  }, [])

  useEffect(() => {
    if (!loaded) return
    setDraftScore(scores[activeHole] ?? (holes.find(h => h.n === activeHole)?.par ?? 4))
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
    const par = holes.find(h => h.n === Number(hole))?.par ?? 4
    return acc + (score - par)
  }, 0)
  const toParDisplay = through === 0 ? '—' : totalToPar === 0 ? 'E' : (totalToPar > 0 ? `+${totalToPar}` : `${totalToPar}`)

  const completeHole = async () => {
    const newScores = { ...scores, [activeHole]: draftScore }
    setScores(newScores)

    // Persist to Supabase (as any: Supabase recursive Insert types confuse TS inference)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from('score') as any).upsert(
      { team_id: teamId, hole_number: activeHole, strokes: draftScore },
      { onConflict: 'team_id,hole_number' }
    )

    // Also persist current mulligan count for this hole
    const mullCount = mulligans[activeHole] ?? 0
    if (mullCount > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('mulligan') as any).upsert(
        { team_id: teamId, hole_number: activeHole, count: mullCount },
        { onConflict: 'team_id,hole_number' }
      )
    }

    // Advance to next unscored hole
    const startIdx = holes.findIndex(h => h.n === activeHole)
    const order = [...holes.slice(startIdx + 1), ...holes.slice(0, startIdx)]
    const next = order.find(h => newScores[h.n] == null)
    if (next) setActiveHole(next.n)
  }

  const setMulligan = async (count: number) => {
    const clamped = Math.max(0, Math.min(2, count))
    setMulligans(m => ({ ...m, [activeHole]: clamped }))
    if (clamped > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('mulligan') as any).upsert(
        { team_id: teamId, hole_number: activeHole, count: clamped },
        { onConflict: 'team_id,hole_number' }
      )
    }
  }

  const holeObj = holes.find(h => h.n === activeHole) ?? { n: activeHole, par: 4, contest: null }
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
  const holeMulligans = mulligans[activeHole] ?? 0
  const isScored = scores[activeHole] != null

  if (!loaded) {
    return (
      <PlayerShell title="Scorecard" subtitle="Loading…" syncStatus="synced" liftBar>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--fg-subtle)' }}>Loading your card…</div>
      </PlayerShell>
    )
  }

  return (
    <PlayerShell
      title="Scorecard"
      subtitle={`Through ${through} of 18`}
      syncStatus="synced"
      liftBar
    >
      {/* Stat strip */}
      <div className={styles.statStrip}>
        <StatCell label="Total" value={totalScore || '—'} testId="stat-total" />
        <StatCell label="To par" value={toParDisplay} accent testId="stat-topar" />
        <StatCell label="Thru" value={through} testId="stat-thru" />
      </div>

      {/* Mini scorecard */}
      <div className={styles.miniCardSection}>
        <div className={styles.miniCardHeader}>
          <span>Card</span>
          <span className={styles.miniCardHint}>Tap any hole to enter</span>
        </div>
        <div className={styles.miniCardScroll} ref={miniRef}>
          {holes.map(h => {
            const s = scores[h.n]
            const isActive = h.n === activeHole
            const isHoleScored = s != null
            const d = isHoleScored ? s - h.par : null
            const tileColor =
              !isHoleScored ? 'var(--fg-subtle)' :
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
                  style={{ color: isActive ? '#fff' : tileColor }}
                >
                  {isHoleScored ? s : '—'}
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

          {holeContest && (() => {
            const entered = holeContest === 'ctp' ? contestEntries.ctp : contestEntries.ld
            return (
              <div className={styles.contestBanner}>
                <div className={styles.contestIcon}>
                  <Icon name="target" size={16} color="#fff" />
                </div>
                <div className={styles.contestInfo}>
                  <div className={styles.contestLabel}>{holeContest === 'ctp' ? 'Closest-to-pin hole' : 'Long-drive hole'}</div>
                  <div className={styles.contestDesc}>{contestName} contest on this hole</div>
                </div>
                <div className={entered ? styles.contestEntered : styles.contestNotEntered}>
                  {entered ? '✓ Entered' : 'Not entered'}
                </div>
              </div>
            )
          })()}

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
              <div className={`${styles.bigScore} num`} style={{ color: scoreColor }}>
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
                const filled = holeMulligans >= slot
                return (
                  <button
                    key={slot}
                    onClick={() => setMulligan(filled ? slot - 1 : slot)}
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
