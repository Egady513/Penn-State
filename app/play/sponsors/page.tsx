import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { PLAYER_SPONSORS } from '@/lib/mockData'

type SponsorEntry = { name: string; amount: number; hole: number }

export default function SponsorsPage() {
  return (
    <PlayerShell
      title="Our sponsors"
      subtitle="Thanks to these folks"
      syncStatus="synced"
    >
      <div className={styles.wrap}>
        <p className={styles.intro}>
          Today&apos;s outing is possible because of the businesses below.
          Stop by their hole signs and say hi.
        </p>

        <TierGroup label="Eagle" sub="$2,500" sponsors={PLAYER_SPONSORS.eagle} large />
        <TierGroup label="Birdie" sub="$1,000" sponsors={PLAYER_SPONSORS.birdie} large={false} />
        <TierGroup label="Par" sub="$500" sponsors={PLAYER_SPONSORS.par} large={false} />
      </div>
    </PlayerShell>
  )
}

function TierGroup({
  label,
  sub,
  sponsors,
  large,
}: {
  label: string
  sub: string
  sponsors: SponsorEntry[]
  large: boolean
}) {
  return (
    <div className={styles.tier} data-testid={`tier-${label.toLowerCase()}`}>
      <div className={styles.tierHeader}>
        <span className={styles.tierLabel}>{label}</span>
        <span className={styles.tierSub}>{sub}</span>
      </div>
      <div className={`${styles.tierGrid} ${large ? styles.tierGridLarge : ''}`}>
        {sponsors.map((s, i) => (
          <div key={i} className={styles.sponsorCard} data-testid="sponsor-card">
            <div
              className={styles.sponsorThumb}
              style={{ width: large ? 60 : 44, height: large ? 60 : 44 }}
            />
            <div className={styles.sponsorInfo}>
              <div className={styles.sponsorName}>{s.name}</div>
              <div className={styles.sponsorMeta}>
                {s.hole ? `Hole ${s.hole}` : ''}
                {s.hole && s.amount ? ' · ' : ''}
                {s.amount ? `$${s.amount.toLocaleString()}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
