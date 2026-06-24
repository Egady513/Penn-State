import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { PlayerShell } from '@/components/player/PlayerShell'
import styles from './page.module.css'
import { Icon } from '@/components/ui/Icon'
import { StatTile } from '@/components/ui/StatTile'
import { EVENT_ID, FALLBACK_TEAM_ID } from '@/lib/eventId'
import { MoneyRaised } from '@/app/components/MoneyRaised'
import { GameCards } from './GameCards'

export default async function HomePage() {
  const cookieStore = await cookies()
  const teamId = cookieStore.get('golf_team_id')?.value ?? FALLBACK_TEAM_ID

  const supabase = await createClient()

  type TeamRow         = { id: string; name: string; group_id: string | null }
  type PlayerRow       = { name: string }
  type ScoreRow        = { hole_number: number; strokes: number }
  type HoleRow         = { number: number; par: number }
  type MulliganRow     = { count: number }
  type AnnouncementRow = { message: string; posted_at: string } | null
  type EventRow        = { schedule: unknown }
  type GroupRow        = { starting_hole: number }

  // Parallel fetch: team, players, scores, holes, mulligans, announcement, event schedule
  const [
    teamRes,
    playersRes,
    scoresRes,
    holesRes,
    mulligansRes,
    announcementRes,
    eventRes,
  ] = await Promise.all([
    supabase.from('team').select('id, name, group_id').eq('id', teamId).maybeSingle(),
    supabase.from('player').select('name').eq('team_id', teamId),
    supabase.from('score').select('hole_number, strokes').eq('team_id', teamId),
    supabase.from('hole').select('number, par').eq('event_id', EVENT_ID).order('number'),
    supabase.from('mulligan').select('count').eq('team_id', teamId),
    supabase
      .from('announcement')
      .select('message, posted_at')
      .eq('event_id', EVENT_ID)
      .eq('pinned', true)
      .order('posted_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('event').select('schedule').eq('id', EVENT_ID).maybeSingle(),
  ])

  const team         = teamRes.data         as TeamRow | null
  const players      = playersRes.data      as PlayerRow[] | null
  const scores       = scoresRes.data       as ScoreRow[] | null
  const holes        = holesRes.data        as HoleRow[] | null
  const mulligans    = mulligansRes.data    as MulliganRow[] | null
  const announcement = announcementRes.data as AnnouncementRow
  const event        = eventRes.data        as EventRow | null

  // Fetch group for starting hole (needs group_id from team)
  const groupRes = team?.group_id
    ? await supabase.from('group').select('starting_hole').eq('id', team.group_id).maybeSingle()
    : { data: null }
  const group = groupRes.data as GroupRow | null

  // Compute stats
  const parByHole: Record<number, number> = {}
  holes?.forEach(h => { parByHole[h.number] = h.par })

  const thru = scores?.length ?? 0
  const totalToPar = scores?.reduce((acc, s) => acc + (s.strokes - (parByHole[s.hole_number] ?? 4)), 0) ?? 0
  const toParDisplay = thru === 0 ? '—' : totalToPar === 0 ? 'E' : totalToPar > 0 ? `+${totalToPar}` : `${totalToPar}`
  const mulliganTotal = mulligans?.reduce((a, m) => a + m.count, 0) ?? 0
  const startingHole = group?.starting_hole ?? 7

  // Players with computed initials
  const playerList = (players ?? []).map(p => ({
    name: p.name,
    initials: p.name.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase(),
  }))

  // Schedule from event JSONB
  const schedule = (event?.schedule as Array<{ time: string; label: string }>) ?? []

  // Announcement posted time
  const announcedAt = announcement?.posted_at
    ? new Date(announcement.posted_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : ''

  return (
    <PlayerShell
      title={team?.name ?? 'Your team'}
      subtitle="Your team · checked in"
      syncStatus="synced"
    >
      {/* Announcement banner */}
      {announcement && (
        <div className={styles.announcementBanner}>
          <Icon name="bell" size={18} color="var(--psu-beaver)" />
          <div className={styles.announcementContent}>
            <div className={styles.announcementBody}>{announcement.message}</div>
            <div className={styles.announcementPosted}>{announcedAt} · Eddie</div>
          </div>
        </div>
      )}

      {/* Live money raised — motivation */}
      <MoneyRaised variant="banner" goal={10000} />

      {/* Stat tiles */}
      <div className={styles.statRow}>
        <StatTile
          label="Starting hole"
          value={startingHole}
          sub="Shotgun · 9:00 AM"
          accent="navy"
        />
        <StatTile
          label="To par"
          value={toParDisplay}
          sub={`Thru ${thru} of 18`}
          accent="pugh"
        />
      </div>

      {/* Team players */}
      <div className={styles.sectionWrap}>
        <div className={styles.sectionLabel}>Your team</div>
        <div className={styles.card}>
          {playerList.map(p => (
            <div key={p.name} className={styles.playerRow}>
              <div className={styles.avatar}>{p.initials}</div>
              <div>
                <div className={styles.playerName}>{p.name}</div>
                <div className={styles.playerSub}>2-person scramble</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Your game — challenge + advantage cards */}
      <GameCards teamId={teamId} />

      {/* Quick sub-tiles */}
      <div className={styles.sectionWrap}>
        <div className={styles.sectionLabel}>More</div>
        <div className={styles.subTileRow}>
          <SubTile
            href="/play/mulligans"
            icon="target"
            label="Mulligan tracker"
            sub={`${mulliganTotal} used · $${mulliganTotal * 2}`}
          />
          <SubTile
            href="/play/sponsors"
            icon="users"
            label="Sponsors"
            sub="Thank you to ours"
          />
        </div>
      </div>

      {/* Schedule */}
      <div className={styles.sectionWrap}>
        <div className={styles.sectionLabel}>Today&apos;s schedule</div>
        <div className={`${styles.card} ${styles.cardFlush}`}>
          {schedule.map((s, i) => (
            <div key={i} className={`${styles.schedRow} ${i > 0 ? styles.schedRowBorder : ''}`}>
              <div className={styles.schedTime}>{s.time}</div>
              <div className={styles.schedLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </PlayerShell>
  )
}

function SubTile({ href, icon, label, sub }: { href: string; icon: string; label: string; sub: string }) {
  return (
    <a href={href} className={styles.subTile}>
      <div className={styles.subTileIcon}>
        <Icon name={icon} size={20} color="var(--psu-beaver)" />
      </div>
      <div className={styles.subTileLabel}>{label}</div>
      <div className={styles.subTileSub}>{sub}</div>
    </a>
  )
}
