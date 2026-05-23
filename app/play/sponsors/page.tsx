import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { EVENT_ID } from '@/lib/eventId'

type SponsorRow = { name: string; amount: number; hole_id: string | null }

export default async function SponsorsPage() {
  const supabase = await createClient()

  const { data: rawSponsors } = await supabase
    .from('sponsor')
    .select('name, tier, amount, hole_id')
    .eq('event_id', EVENT_ID)
    .order('amount', { ascending: false })

  const sponsors = rawSponsors as { name: string; tier: string; amount: number; hole_id: string | null }[] | null

  const eagle  = (sponsors ?? []).filter(s => s.tier === 'eagle')
  const birdie = (sponsors ?? []).filter(s => s.tier === 'birdie')
  const par    = (sponsors ?? []).filter(s => s.tier === 'par')

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

        <TierGroup label="Eagle" sub="$2,500" sponsors={eagle} large />
        <TierGroup label="Birdie" sub="$1,000" sponsors={birdie} large={false} />
        <TierGroup label="Par" sub="$500" sponsors={par} large={false} />
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
  sponsors: SponsorRow[]
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
                {s.amount ? `$${s.amount.toLocaleString()}` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
