import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { EVENT_ID } from '@/lib/eventId'

type SponsorRow = {
  id: string
  name: string
  sponsorship_type: string | null
  hole_number: number | null
  logo_url: string | null
}

const isHole = (s: SponsorRow) =>
  !!s.sponsorship_type?.toLowerCase().includes('hole')

export default async function SponsorsPage() {
  const supabase = await createClient()

  const { data: rawSponsors } = await supabase
    .from('sponsor')
    .select('id, name, sponsorship_type, hole_number, logo_url, sort_order')
    .eq('event_id', EVENT_ID)
    .eq('active', true)
    .order('sort_order')

  const sponsors = (rawSponsors ?? []) as SponsorRow[]

  // Group the same way as the public registration page — by sponsorship_type,
  // hole sponsors last.
  const groups: { label: string; sponsors: SponsorRow[] }[] = []

  const otherTypes = Array.from(
    new Set(
      sponsors
        .filter(s => s.sponsorship_type && !isHole(s))
        .map(s => s.sponsorship_type as string)
    )
  )
  for (const t of otherTypes) {
    groups.push({ label: t, sponsors: sponsors.filter(s => s.sponsorship_type === t) })
  }

  const uncategorized = sponsors.filter(s => !s.sponsorship_type)
  if (uncategorized.length > 0) groups.push({ label: 'Our Supporters', sponsors: uncategorized })

  const holeSponsors = sponsors.filter(isHole)
  if (holeSponsors.length > 0) groups.push({ label: 'Hole Sponsors', sponsors: holeSponsors })

  return (
    <PlayerShell
      title="Our sponsors"
      subtitle="Today's outing is made possible by"
      syncStatus="synced"
    >
      <div className={styles.wrap}>
        {groups.length === 0 && (
          <p className={styles.empty}>Sponsor list coming soon.</p>
        )}

        {groups.map(g => (
          <div key={g.label} className={styles.group}>
            <div className={styles.groupLabel}>{g.label}</div>
            <div className={styles.grid}>
              {g.sponsors.map(s => (
                <div key={s.id} className={styles.card}>
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={s.name} className={styles.logo} />
                  ) : (
                    <div className={styles.initials}>
                      {s.name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className={styles.name}>{s.name}</div>
                  {isHole(s) && s.hole_number && (
                    <div className={styles.holeBadge}>Hole {s.hole_number}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </PlayerShell>
  )
}
