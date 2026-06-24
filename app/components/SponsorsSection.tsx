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

function typeLabel(s: Sponsor): string | null {
  if (!s.sponsorship_type) return null
  if (s.sponsorship_type.toLowerCase().includes('hole')) {
    return s.hole_number ? `Hole ${s.hole_number}` : 'Hole sponsor'
  }
  return s.sponsorship_type
}

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

  const eagle = sponsors.filter(s => s.tier === 'eagle')
  const birdie = sponsors.filter(s => s.tier === 'birdie')
  const par = sponsors.filter(s => s.tier === 'par')
  const untiered = sponsors.filter(s => !s.tier)

  return (
    <section id="sponsors" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Made possible by</div>
        <h2 className={styles.heading}>Sponsors &amp; donors</h2>

        {eagle.length > 0 && <SponsorTier label="Eagle"  sponsors={eagle}  cols={2} size="lg" />}
        {birdie.length > 0 && <SponsorTier label="Birdie" sponsors={birdie} cols={3} size="md" />}
        {par.length > 0 && <SponsorTier label="Par"    sponsors={par}    cols={6} size="sm" />}
        {untiered.length > 0 && <SponsorTier label="Our supporters" sponsors={untiered} cols={4} size="md" />}

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

function SponsorTier({
  label, sponsors, cols, size,
}: {
  label: string
  sponsors: Sponsor[]
  cols: number
  size: 'lg' | 'md' | 'sm'
}) {
  return (
    <div className={styles.tier} data-testid={`tier-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className={styles.tierHeader}>
        <span className={styles.tierLabel}>{label}</span>
      </div>
      <div className={styles.tierGrid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {sponsors.map(s => {
          const lbl = typeLabel(s)
          return (
            <div key={s.id} data-testid="sponsor-card">
              <SponsorLogo name={s.name} size={size} />
              {lbl && <div className={styles.sponsorTypeLabel}>{lbl}</div>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
