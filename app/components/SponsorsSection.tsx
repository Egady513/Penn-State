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
  logo_url: string | null
}

type DonorRow = { id: string; name: string; donated_item: string | null; logo_url: string | null }

const isHole = (s: Sponsor) => !!s.sponsorship_type?.toLowerCase().includes('hole')

export const SponsorsSection = forwardRef<HTMLElement>(function SponsorsSection(_, ref) {
  // Start empty and render only REAL sponsors from the DB. No placeholder
  // "Sponsor A/B/C" — fake names must never show on the public page.
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [donors, setDonors] = useState<DonorRow[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsor')
      .select('id, name, tier, sponsorship_type, hole_number, logo_url, sort_order')
      .eq('event_id', EVENT_ID)
      .eq('active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        const rows = data as Sponsor[] | null
        if (!error && rows) setSponsors(rows)
      })

    supabase
      .from('donor')
      .select('id, name, donated_item, logo_url')
      .eq('event_id', EVENT_ID)
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) setDonors(data as DonorRow[])
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
                  {s.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logo_url} alt={s.name} className={styles.sponsorImg} title={s.name} />
                  ) : (
                    <SponsorLogo name={s.name} size="md" />
                  )}
                  {isHole(s) && s.hole_number && (
                    <div className={styles.sponsorTypeLabel}>Hole {s.hole_number}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {donors.length > 0 && (
          <div className={styles.donors}>
            <h3 className={styles.donorsHead}>Raffle &amp; prize donors</h3>
            <div className={styles.donorGrid}>
              {donors.map(d => (
                <div key={d.id} className={styles.donorItem}>
                  {d.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.logo_url} alt={d.name} className={styles.donorLogo} />
                  ) : (
                    <span className={styles.donorDot} />
                  )}
                  <div className={styles.donorInfo}>
                    <span className={styles.donorName}>{d.name}</span>
                    {d.donated_item && (
                      <span className={styles.donorItem2}>{d.donated_item}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
