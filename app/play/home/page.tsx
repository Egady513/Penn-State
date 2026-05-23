import { PlayerShell } from '@/components/player/PlayerShell'
import styles from './page.module.css'
import { Icon } from '@/components/ui/Icon'
import { StatTile } from '@/components/ui/StatTile'
import { Badge } from '@/components/ui/Badge'
import { MY_TEAM, MY_FOURSOME, SCHEDULE, ANNOUNCEMENT, PLAYER_HOLES } from '@/lib/mockData'

export default function HomePage() {
  // Compute toPar from existing scores
  const scoredEntries = Object.entries(MY_TEAM.scores)
  const totalToPar = scoredEntries.reduce((acc, [hole, score]) => {
    const holeObj = PLAYER_HOLES[Number(hole) - 1]
    return acc + (score - holeObj.par)
  }, 0)
  const thru = scoredEntries.length

  const toParDisplay = totalToPar === 0 ? 'E' : (totalToPar > 0 ? `+${totalToPar}` : `${totalToPar}`)
  const mulliganTotal = Object.values(MY_TEAM.mulligans).reduce((a, b) => a + b, 0)

  return (
    <PlayerShell
      title={MY_TEAM.name}
      subtitle="Your team · checked in"
      syncStatus="synced"
    >
      {/* Announcement banner */}
      <div className={styles.announcementBanner}>
        <Icon name="bell" size={18} color="var(--psu-beaver)" />
        <div className={styles.announcementContent}>
          <div className={styles.announcementBody}>{ANNOUNCEMENT.body}</div>
          <div className={styles.announcementPosted}>{ANNOUNCEMENT.posted}</div>
        </div>
      </div>

      {/* Stat tiles */}
      <div className={styles.statRow}>
        <StatTile
          label="Starting hole"
          value={MY_TEAM.startingHole}
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
          {MY_TEAM.players.map(p => (
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

      {/* Foursome */}
      <div className={styles.sectionWrap}>
        <div className={styles.sectionLabel}>Your foursome</div>
        <div className={`${styles.card} ${styles.cardFlush}`}>
          {MY_FOURSOME.map((t, i) => (
            <div
              key={t.name}
              className={`${styles.foursomeRow} ${t.you ? styles.foursomeRowYou : ''} ${i > 0 ? styles.foursomeRowBorder : ''}`}
            >
              <Icon name="users" size={18} color="var(--psu-beaver)" />
              <div className={styles.foursomeName}>
                <div className={styles.foursomeTeam}>{t.name}</div>
                <div className={styles.foursomePlayers}>{t.players}</div>
              </div>
              {t.you && <Badge tone="info">You</Badge>}
            </div>
          ))}
        </div>
      </div>

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
          {SCHEDULE.map((s, i) => (
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
