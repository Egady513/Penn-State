'use client'

import { forwardRef, useEffect, useState } from 'react'
import styles from './SponsorsSection.module.css'
import { SponsorLogo } from '@/components/ui/SponsorLogo'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'

type Sponsor = {
  id: string
  name: string
  tier: 'eagle' | 'birdie' | 'par' | null
  sponsorship_type: string | null
  hole_number: number | null
}

// Fallback if the sponsor query fails (e.g. before the sponsor migration runs).
const FALLBACK: Sponsor[] = [
  { id: 'a', name: 'Sponsor A', tier: 'eagle',  sponsorship_type: 'Hole', hole_number: 4 },
  { id: 'b', name: 'Sponsor B', tier: 'eagle',  sponsorship_type: null, hole_number: null },
  { id: 'c', name: 'Sponsor C', tier: 'birdie', sponsorship_type: null, hole_number: null },
  { id: 'd', name: 'Sponsor D', tier: 'birdie', sponsorship_type: null, hole_number: null },
  { id: 'e', name: 'Sponsor E', tier: 'birdie', sponsorship_type: null, hole_number: null },
  { id: 'f', name: 'Sponsor F', tier: 'par',    sponsorship_type: null, hole_number: null },
  { id: 'g', name: 'Sponsor G', tier: 'par',    sponsorship_type: null, hole_number: null },
]

const DONORS = [
  'Acme Family', 'Bechtel Group', 'Cincinnati Cellars',
  'Dunn Logistics', 'Elliott & Co.', 'Fields Auto',
  'Garrett Estates', 'Hopper Brewing', 'Indigo Print Co.',
  'Jensen Roofing', 'Kepler Marketing', 'Lamar Films',
]

const isHole = (s: Sponsor) => !!s.sponsorship_type?.toLowerCase().includes('hole')

export const SponsorsSection = forwardRef<HTMLElement>(function SponsorsSection(_, ref) {
  const [sponsors, setSponsors] = useState<Sponsor[]>(FALLBACK)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsor')
      .select('id, name, tier, sponsorship_type, hole_number, sort_order')
      .eq('event_id', EVENT_ID)
      .eq('active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        const rows = data as Sponsor[] | null
        if (!error && rows && rows.length > 0) setSponsors(rows)
      })
  }, [])

  // Group by what they sponsor: hole sponsors together, then each custom
  // category, then anyone uncategorized.
  const groups: { label: string; sponsors: Sponsor[] }[] = []

  const holeSponsors = sponsors.filter(isHole)
  if (holeSponsors.length > 0) groups.push({ label: 'Hole Sponsors', sponsors: holeSponsors })

  const otherTypes = Array.from(
    new Set(sponsors.filter(s => s.sponsorship_type && !isHole(s)).map(s => s.sponsorship_type as string))
  )
  for (const t of otherTypes) {
    groups.push({ label: t, sponsors: sponsors.filter(s => s.sponsorship_type === t) })
  }

  const uncategorized = sponsors.filter(s => !s.sponsorship_type)
  if (uncategorized.length > 0) groups.push({ label: 'Our Supporters', sponsors: uncategorized })

  return (
    <section id="sponsors" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Made possible by</div>
        <h2 className={styles.heading}>Sponsors &amp; donors</h2>

        {groups.map(g => (
          <div key={g.label} className={styles.tier} data-testid="sponsor-group">
            <div className={styles.tierHeader}>
              <span className={styles.tierLabel}>{g.label}</span>
            </div>
            <div className={styles.tierGrid} style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              {g.sponsors.map(s => (
                <div key={s.id} data-testid="sponsor-card">
                  <SponsorLogo name={s.name} size="md" />
                  {isHole(s) && s.hole_number && (
                    <div className={styles.sponsorTypeLabel}>Hole {s.hole_number}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className={styles.donors}>
          <h3 className={styles.donorsHead}>Raffle &amp; prize donors</h3>
          <div className={styles.donorGrid}>
            {DONORS.map(d => (
              <div key={d} className={styles.donorItem}>
                <span className={styles.donorDot} />
                {d}
              </div>
            ))}
          </div>
        </div>

        <div className={styles.becomeSponsor}>
          <div>
            <div className={styles.bronzeEyebrow}>Become a sponsor</div>
            <h3 className={styles.becomeHead}>
              Put your name on a hole — and on a few thousand meals.
            </h3>
            <p className={styles.becomeSub}>
              Hole, cart, and challenge sponsorships available, with recognition at dinner. We&apos;ll send the one-pager.
            </p>
          </div>
          <Button variant="bronze" size="lg" as="a" href="mailto:egady513@gmail.com?subject=Golf Outing Sponsorship">
            Get the one-pager <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </section>
  )
})
