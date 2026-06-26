'use client'
import { forwardRef, useState } from 'react'
import Image from 'next/image'
import { ExternalLink } from 'lucide-react'
import styles from './CauseSection.module.css'
import { Button } from '@/components/ui/Button'

export const CauseSection = forwardRef<HTMLElement>(function CauseSection(_, ref) {
  const [logoMissing, setLogoMissing] = useState(false)
  return (
    <section id="cause" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        {!logoMissing && (
          <div className={styles.logoWrap}>
            <Image
              src="/lastmile-hero.png"
              alt="Last Mile Food Rescue"
              width={160}
              height={60}
              style={{ objectFit: 'contain' }}
              onError={() => setLogoMissing(true)}
            />
          </div>
        )}
        <div className={styles.eyebrow}>The cause</div>
        <h2 className={styles.heading}>Last Mile Food Rescue</h2>
        <p className={styles.body}>
          Using volunteer drivers and a dispatch app, Last Mile rescues
          surplus food from grocers, restaurants, and kitchens and delivers it
          the same day — before it&apos;s wasted — to the food pantries, shelters,
          and partner agencies (like La Soupe) that get it to neighbors in need.
          Every dollar you spend on this outing helps cover that last mile.
        </p>
        <div className={styles.ctas}>
          <Button
            variant="pugh"
            size="md"
            as="a"
            href="https://lastmilefood.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more about Last Mile <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </section>
  )
})
