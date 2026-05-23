import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { EVENT_ID, FALLBACK_TEAM_ID } from '@/lib/eventId'

export default async function LeaderboardPage() {
  const cookieStore = await cookies()
  const myTeamId = cookieStore.get('golf_team_id')?.value ?? FALLBACK_TEAM_ID

  const supabase = await createClient()

  // Fetch teams first so we can use their IDs for the score query
  const { data: teamsRaw } = await supabase
    .from('team').select('id, name').eq('event_id', EVENT_ID)
  const teams = teamsRaw as { id: string; name: string }[] | null

  const teamIds = (teams ?? []).map(t => t.id)

  const [{ data: holesRaw }, { data: allScoresRaw }] = await Promise.all([
    supabase.from('hole').select('number, par').eq('event_id', EVENT_ID),
    teamIds.length > 0
      ? supabase.from('score').select('team_id, hole_number, strokes').in('team_id', teamIds)
      : Promise.resolve({ data: [] }),
  ])

  const holes     = holesRaw     as { number: number; par: number }[] | null
  const allScores = allScoresRaw as { team_id: string; hole_number: number; strokes: number }[] | null

  // Build par lookup
  const parByHole: Record<number, number> = {}
  holes?.forEach(h => { parByHole[h.number] = h.par })

  // Build per-team score maps
  const scoresByTeam: Record<string, { hole: number; strokes: number }[]> = {}
  allScores?.forEach(s => {
    if (!scoresByTeam[s.team_id]) scoresByTeam[s.team_id] = []
    scoresByTeam[s.team_id].push({ hole: s.hole_number, strokes: s.strokes })
  })

  // Compute leaderboard entries
  const leaderboard = (teams ?? []).map(t => {
    const ts = scoresByTeam[t.id] ?? []
    const thru = ts.length
    const toPar = ts.reduce((acc, s) => acc + (s.strokes - (parByHole[s.hole] ?? 4)), 0)
    return { id: t.id, name: t.name, thru, toPar }
  })

  // Sort: most holes played first, then by toPar ascending
  leaderboard.sort((a, b) => {
    if (b.thru !== a.thru) return b.thru - a.thru
    return a.toPar - b.toPar
  })

  // Assign ranks (ties share rank)
  let currentRank = 1
  const ranked = leaderboard.map((t, i, arr) => {
    if (i > 0 && (t.toPar !== arr[i - 1].toPar || t.thru !== arr[i - 1].thru)) {
      currentRank = i + 1
    }
    return { ...t, rank: i === 0 ? 1 : currentRank }
  })

  return (
    <PlayerShell
      title="Leaderboard"
      subtitle={`Live · ${ranked.length} teams`}
      syncStatus="synced"
    >
      <div className={styles.wrap}>
        <div className={styles.sectionLabel}>Top of the field</div>
        <div className={styles.table}>
          {ranked.map((t, i) => {
            const isLeader = t.rank === 1
            const isYou = t.id === myTeamId
            const toParDisplay = t.thru === 0 ? '—' : t.toPar === 0 ? 'E' : t.toPar > 0 ? `+${t.toPar}` : `${t.toPar}`
            const toParColor =
              t.toPar < 0 ? (isLeader ? 'var(--psu-pugh)' : 'var(--score-birdie)')
              : t.toPar > 0 ? (isLeader ? '#fff' : 'var(--score-bogey)')
              : (isLeader ? '#fff' : 'var(--ink-700)')

            return (
              <div
                key={t.id}
                data-testid="lb-row"
                className={`
                  ${styles.row}
                  ${isLeader ? styles.rowLeader : ''}
                  ${isYou && !isLeader ? styles.rowYou : ''}
                  ${i > 0 ? styles.rowBorder : ''}
                `}
              >
                <div className={`${styles.rank} num`}>{t.rank}</div>
                <div className={styles.teamInfo}>
                  <div className={styles.teamNameRow}>
                    {isLeader && <span data-testid="trophy-icon"><Icon name="trophy" size={14} color="var(--psu-pugh)" /></span>}
                    <span className={styles.teamName}>{t.name}</span>
                    {isYou && <Badge tone="pugh" size="sm">YOU</Badge>}
                  </div>
                  <div className={styles.players}>thru {t.thru}</div>
                </div>
                <div className={styles.thru}>thru {t.thru}</div>
                <div
                  className={`${styles.toPar} num`}
                  style={{ color: toParColor }}
                >
                  {toParDisplay}
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.hint}>
          Scores update as teams enter them.
        </div>
      </div>
    </PlayerShell>
  )
}
