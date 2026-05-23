import { forwardRef } from 'react'
import styles from './SponsorsSection.module.css'
import { SponsorLogo } from '@/components/ui/SponsorLogo'
import { Button } from '@/components/ui/Button'
import { ExternalLink } from 'lucide-react'

const SPONSORS = {
  eagle:  [{ id: 's1', name: 'Sponsor A' }, { id: 's2', name: 'Sponsor B' }],
  birdie: [{ id: 's3', name: 'Sponsor C' }, { id: 's4', name: 'Sponsor D' }, { id: 's5', name: 'Sponsor E' }],
  par:    [
    { id: 's6', name: 'Sponsor F' }, { id: 's7', name: 'Sponsor G' },
    { id: 's8', name: 'Sponsor H' }, { id: 's9', name: 'Sponsor I' },
    { id: 's10', name: 'Sponsor J' }, { id: 's11', name: 'Sponsor K' },
  ],
}

const DONORS = [
  'Acme Family', 'Bechtel Group', 'Cincinnati Cellars',
  'Dunn Logistics', 'Elliott & Co.', 'Fields Auto',
  'Garrett Estates', 'Hopper Brewing', 'Indigo Print Co.',
  'Jensen Roofing', 'Kepler Marketing', 'Lamar Films',
]

export const SponsorsSection = forwardRef<HTMLElement>(function SponsorsSection(_, ref) {
  return (
    <section id="sponsors" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>Made possible by</div>
        <h2 className={styles.heading}>Sponsors &amp; donors</h2>

        <SponsorTier label="Eagle"  sub="$2,500+" sponsors={SPONSORS.eagle}  cols={2} size="lg" />
        <SponsorTier label="Birdie" sub="$1,000"  sponsors={SPONSORS.birdie} cols={3} size="md" />
        <SponsorTier label="Par"    sub="$500"    sponsors={SPONSORS.par}    cols={6} size="sm" />

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
              Three tiers, hole signage, and recognition at dinner. We&apos;ll send the one-pager.
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
  label, sub, sponsors, cols, size,
}: {
  label: string
  sub: string
  sponsors: { id: string; name: string }[]
  cols: number
  size: 'lg' | 'md' | 'sm'
}) {
  return (
    <div className={styles.tier} data-testid={`tier-${label.toLowerCase()}`}>
      <div className={styles.tierHeader}>
        <span className={styles.tierLabel}>{label}</span>
        <span className={styles.tierSub}>{sub}</span>
      </div>
      <div className={styles.tierGrid} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {sponsors.map(s => (
          <div key={s.id} data-testid="sponsor-card">
            <SponsorLogo name={s.name} size={size} />
          </div>
        ))}
      </div>
    </div>
  )
}
