'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Stepper } from '@/components/ui/Stepper'
import { Icon } from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client'
import { getTeamId } from '@/lib/getTeamId'
import { EVENT_ID } from '@/lib/eventId'
import { SINGLE_CONTEST_PRICE } from '@/lib/contestPricing'

type HoleInfo    = { n: number; par: number; contest: 'ctp' | 'ld' | null }
type SponsorMap  = Record<number, { name: string; amount: number; logoUrl: string | null }>
type ContestEntries = { ctp: boolean; ld: boolean }
/** A catalog item pinned to a hole, e.g. Bucket Golf on Hole 1. */
type HoleItem = { id: string; name: string; price: number; unit: string | null; description: string | null; hole: number }

export default function ScorecardPage() {
  const [holes, setHoles] = useState<HoleInfo[]>([])
  const [scores, setScores] = useState<Record<number, number>>({})
  const [mulligans, setMulligans] = useState<Record<number, number>>({})
  const [sponsorByHole, setSponsorByHole] = useState<SponsorMap>({})
  const [contestEntries, setContestEntries] = useState<ContestEntries>({ ctp: false, ld: false })
  const [activeHole, setActiveHole] = useState(1)
  const [draftScore, setDraftScore] = useState(4)
  const [loaded, setLoaded] = useState(false)
  const [joiningContest, setJoiningContest] = useState(false)
  const [holeItems, setHoleItems] = useState<HoleItem[]>([])
  const [itemQty, setItemQty] = useState<Record<string, number>>({})
  const [busyItem, setBusyItem] = useState<string | null>(null)
  const miniRef = useRef<HTMLDivElement>(null)

  const router = useRouter()

  const cookieTeamId = getTeamId()

  // No cookie means they never entered a PIN — send them to the login

  // screen rather than silently loading another team's data.

  useEffect(() => { if (!cookieTeamId) router.replace('/play') }, [cookieTeamId, router])

  const teamId = cookieTeamId ?? ''
  const supabase = createClient()

  // Load all initial data on mount
  useEffect(() => {
    async function load() {
      const [holeRes, scoreRes, mullRes, sponsorRes, purchRes, holeItemRes] = await Promise.all([
        supabase.from('hole').select('number, par, contest_type').eq('event_id', EVENT_ID).order('number'),
        supabase.from('score').select('hole_number, strokes').eq('team_id', teamId),
        supabase.from('mulligan').select('hole_number, count').eq('team_id', teamId),
        supabase.from('sponsor').select('name, amount, hole_number, logo_url').eq('event_id', EVENT_ID).eq('active', true).not('hole_number', 'is', null),
        supabase.from('purchase').select('catalog_item_id, quantity, paid_status, catalog_item:catalog_item_id(name, tag)').eq('team_id', teamId),
        supabase.from('catalog_item').select('id, name, price, unit, description, hole_number').eq('event_id', EVENT_ID).eq('active', true).not('hole_number', 'is', null),
      ])

      const holeRows    = holeRes.data    as { number: number; par: number; contest_type: string }[] | null
      const scoreRows   = scoreRes.data   as { hole_number: number; strokes: number }[] | null
      const mullRows    = mullRes.data    as { hole_number: number; count: number }[] | null
      const sponsorRows = sponsorRes.data as { name: string; amount: number; hole_number: number | null; logo_url: string | null }[] | null
      const purchRows   = purchRes.data   as { catalog_item_id: string; quantity: number; paid_status: string; catalog_item: { name: string; tag: string | null } | null }[] | null
      const itemRows    = holeItemRes.data as { id: string; name: string; price: number; unit: string | null; description: string | null; hole_number: number }[] | null

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

      // Sponsors are assigned to a hole by hole_number (set on the admin
      // Sponsors page). Map them directly — no hole_id join needed.
      const sponsMap: SponsorMap = {}
      sponsorRows?.forEach(s => {
        if (s.hole_number) sponsMap[s.hole_number] = { name: s.name, amount: s.amount, logoUrl: s.logo_url }
      })

      // Build contest entry flags from purchase TAGS. Name matching was
      // wrong: the CTP item is literally called "Closest To The Pin & Long
      // Drive Entry", so it contains "long drive" and buying CTP alone also
      // marked long-drive as entered, hiding that hole's Join button.
      const purchTags = (purchRows ?? []).map(p =>
        (p.catalog_item as { tag: string | null } | null)?.tag ?? null
      )
      const entries: ContestEntries = {
        ctp: purchTags.includes('ctp'),
        ld:  purchTags.includes('ld'),
      }

      setHoleItems((itemRows ?? []).map(r => ({
        id: r.id, name: r.name, price: r.price, unit: r.unit, description: r.description, hole: r.hole_number,
      })))

      // Only UNPAID lines are still on the tab. Once a team settles at
      // the tent the counter resets, so a second round of shots opens a
      // fresh line instead of reviving a paid one.
      const qtyMap: Record<string, number> = {}
      purchRows?.forEach(pr => {
        if (pr.paid_status !== 'unpaid') return
        qtyMap[pr.catalog_item_id] = (qtyMap[pr.catalog_item_id] ?? 0) + (pr.quantity ?? 0)
      })
      setItemQty(qtyMap)

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

  /**
   * Add or remove one unit of a hole-pinned item (Bucket Golf).
   * Goes through an RPC that increments ONE open line rather than
   * inserting a row per tap, so check-in shows "Bucket Golf x3",
   * not three separate $5 rows.
   */
  async function changeHoleItem(item: HoleItem, delta: 1 | -1) {
    if (busyItem) return
    const current = itemQty[item.id] ?? 0
    if (delta === -1 && current === 0) return
    setBusyItem(item.id)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)(
        delta === 1 ? 'add_hole_purchase' : 'remove_hole_purchase',
        delta === 1
          ? { p_team_id: teamId, p_catalog_item_id: item.id, p_qty: 1 }
          : { p_team_id: teamId, p_catalog_item_id: item.id },
      )
      if (error) {
        alert("Couldn't update that. Please see the volunteer at the hole.")
        return
      }
      setItemQty(q => ({
        ...q,
        [item.id]: typeof data === 'number' ? data : Math.max(0, current + delta),
      }))
    } finally {
      setBusyItem(null)
    }
  }

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
    } else {
      // Backing a mulligan down to 0 has to DELETE the row. Previously this
      // only skipped the write, so the old count stayed in the database and
      // the player kept getting charged $2 for a mulligan they undid.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('mulligan') as any)
        .delete()
        .eq('team_id', teamId)
        .eq('hole_number', activeHole)
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
              <div className={styles.sponsorThumb}>
                {sponsor.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={sponsor.logoUrl}
                    alt={sponsor.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'inherit' }}
                  />
                )}
              </div>
              <div className={styles.sponsorInfo}>
                <div className={styles.sponsorLabel}>This hole brought to you by</div>
                <div className={styles.sponsorName}>{sponsor.name}</div>
              </div>
            </div>
          )}

          {holeContest && (
            <ContestBanner
              kind={holeContest}
              name={contestName!}
              entered={holeContest === 'ctp' ? contestEntries.ctp : contestEntries.ld}
              onJoin={async () => {
                // Guard against a double-tap creating two charges — state
                // updates are async, so `entered` alone isn't enough.
                if (joiningContest || contestEntries[holeContest]) return
                setJoiningContest(true)
                try {
                  // Look the item up by TAG, not by name. Name matching broke
                  // silently the moment an item was renamed, and it also had
                  // no active filter, so an inactive duplicate would make
                  // maybeSingle() error and the button do nothing.
                  const { data: item, error: lookupErr } = await (supabase.from('catalog_item') as any)
                    .select('id, price')
                    .eq('event_id', EVENT_ID)
                    .eq('active', true)
                    .eq('tag', holeContest)
                    .limit(1)
                    .maybeSingle()
                  if (lookupErr || !item) {
                    alert("Couldn't find that contest entry in the catalog. Please see Eddie at the tent.")
                    return
                  }
                  const { error: insErr } = await (supabase.from('purchase') as any).insert({
                    team_id: teamId,
                    catalog_item_id: item.id,
                    quantity: 1,
                    // Buying one contest on its own costs more than half the
                    // bundle — the bundle stays the better deal.
                    amount: SINGLE_CONTEST_PRICE,
                    paid_status: 'unpaid',
                    channel: 'during_round',
                  })
                  if (insErr) {
                    alert("Couldn't add the entry. Please see Eddie at the tent.")
                    return
                  }
                  setContestEntries(e => ({ ...e, [holeContest]: true }))
                } finally {
                  setJoiningContest(false)
                }
              }}
            />
          )}

          {holeItems.filter(it => it.hole === activeHole).map(it => {
            const qty  = itemQty[it.id] ?? 0
            const busy = busyItem === it.id
            const unit = it.unit || 'shot'
            return (
              <div
                key={it.id}
                className={`${styles.contestBanner} ${qty > 0 ? styles.contestBannerPaid : styles.contestBannerUnpaid}`}
              >
                <div className={`${styles.contestIcon} ${qty > 0 ? styles.contestIconPaid : styles.contestIconUnpaid}`}>
                  <Icon name={qty > 0 ? 'check' : 'target'} size={16} color="#fff" />
                </div>
                <div className={styles.contestInfo}>
                  <div className={`${styles.contestLabel} ${qty > 0 ? styles.contestLabelPaid : styles.contestLabelUnpaid}`}>
                    {it.name}
                  </div>
                  <div className={styles.contestDesc}>
                    {qty > 0
                      ? `${qty} ${unit}${qty === 1 ? '' : 's'} · $${qty * it.price} on your tab.`
                      : `$${it.price} a ${unit}, no cap. Goes on your tab.`}
                  </div>
                </div>
                <div className={styles.holeItemBtns}>
                  {qty > 0 && (
                    <button
                      type="button"
                      onClick={() => changeHoleItem(it, -1)}
                      disabled={busy}
                      className={styles.holeItemMinus}
                      aria-label={`Remove one ${unit}`}
                    >
                      &minus;
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => changeHoleItem(it, 1)}
                    disabled={busy}
                    className={styles.contestJoinBtn}
                  >
                    {busy ? '…' : qty > 0 ? `+ $${it.price}` : `Add $${it.price} to tab`}
                  </button>
                </div>
              </div>
            )
          })}

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

function ContestBanner({
  kind, name, entered, onJoin,
}: {
  kind: 'ctp' | 'ld'
  name: string
  entered: boolean
  onJoin: () => void
}) {
  const [joining, setJoining] = React.useState(false)

  const handleJoin = async () => {
    setJoining(true)
    await onJoin()
    setJoining(false)
  }

  return (
    <div className={`${styles.contestBanner} ${entered ? styles.contestBannerPaid : styles.contestBannerUnpaid}`}>
      <div className={`${styles.contestIcon} ${entered ? styles.contestIconPaid : styles.contestIconUnpaid}`}>
        <Icon name={entered ? 'check' : 'target'} size={16} color="#fff" />
      </div>
      <div className={styles.contestInfo}>
        <div className={`${styles.contestLabel} ${entered ? styles.contestLabelPaid : styles.contestLabelUnpaid}`}>
          {kind === 'ctp' ? 'Closest-to-pin hole' : 'Long-drive hole'}
        </div>
        <div className={styles.contestDesc}>
          {entered
            ? `You're in the ${name.toLowerCase()} contest. Good luck.`
            : `Enter now for $${SINGLE_CONTEST_PRICE}. Goes on your tab.`}
        </div>
      </div>
      {!entered && (
        <button
          onClick={handleJoin}
          disabled={joining}
          className={styles.contestJoinBtn}
        >
          {joining ? '…' : `Add $${SINGLE_CONTEST_PRICE} to tab`}
        </button>
      )}
    </div>
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
