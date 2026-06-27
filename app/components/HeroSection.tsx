'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Heart, Calendar, MapPin, Flag, Ticket } from 'lucide-react'
import styles from './HeroSection.module.css'
import { Button } from '@/components/ui/Button'
import { MoneyRaised } from './MoneyRaised'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'

interface HeroSectionProps {
  onJump: (id: string) => void
}

const SPOTS_TOTAL = 36

export function HeroSection({ onJump }: HeroSectionProps) {
  const [spotsTaken, setSpotsTaken] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('team')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', EVENT_ID)
      .eq('payment_status', 'paid')
      .then(({ count }) => setSpotsTaken(count ?? 0))
  }, [])

  return (
    <section className={styles.hero}>
      <div className={styles.glowOrb} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.content}>
          <div className={styles.causeBadge}>
            <Heart size={14} strokeWidth={2} />
            Benefits Last Mile Food Rescue
          </div>

          <h1 className={styles.headline}>
            Drive Out<br />Hunger 2026
          </h1>

          <p className={styles.sub}>
            Registration for the annual Drive Out Hunger Charity Golf Outing
            supporting Last Mile Food Rescue. Help us raise money to provide
            food for families in need here in Cincinnati
          </p>

          <div className={styles.facts}>
            <Fact icon={<Calendar size={20} />} label="Date"   value="Aug 30, 2026" />
            <Fact icon={<MapPin  size={20} />} label="Course" value="Beckett Ridge" />
            <Fact icon={<Flag    size={20} />} label="Format" value="2-person scramble" />
            <Fact icon={<Ticket  size={20} />} label="Entry"  value="$200/team" />
          </div>

          <div className={styles.ctas}>
            <Button size="lg" variant="pugh" onClick={() => onJump('register')}>
              Register your team <ArrowRight size={18} />
            </Button>
            <Button size="lg" variant="secondaryLight" onClick={() => onJump('details')}>
              See what&apos;s included
            </Button>
          </div>

          <div className={styles.chipRow}>
            <div className={styles.spotsChip}>
              <span className={styles.spotsNum}>{spotsTaken ?? '—'}/{SPOTS_TOTAL}</span>
              team spots taken
            </div>
            <MoneyRaised variant="chip" />
          </div>
        </div>

        <div className={styles.imageRight} aria-hidden>
          <Image
            src="/lastmile-hero.png"
            alt="Last Mile Food Rescue"
            width={380}
            height={380}
            className={styles.heroImg}
            priority
          />
        </div>
      </div>

    </section>
  )
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className={styles.fact}>
      <div className={styles.factIcon}>{icon}</div>
      <div>
        <div className={styles.factLabel}>{label}</div>
        <div className={styles.factValue}>{value}</div>
      </div>
    </div>
  )
}
