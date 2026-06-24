'use client'

import Image from 'next/image'
import { ArrowRight, Heart, Calendar, MapPin, Flag } from 'lucide-react'
import styles from './HeroSection.module.css'
import { Button } from '@/components/ui/Button'
import { MoneyRaised } from './MoneyRaised'

interface HeroSectionProps {
  onJump: (id: string) => void
}

const SPOTS_TAKEN = 28
const SPOTS_TOTAL = 36

export function HeroSection({ onJump }: HeroSectionProps) {
  return (
    <section className={styles.hero}>
      <div className={styles.glowOrb} aria-hidden />

      <div className={styles.inner}>
        <div className={styles.causeBadge}>
          <Heart size={14} strokeWidth={2} />
          Benefits Last Mile Food Rescue
        </div>

        <h1 className={styles.headline}>
          Drive Out<br />Hunger 2026
        </h1>

        <p className={styles.sub}>
          Grab a partner. Walk eighteen at Beckett Ridge. Help us put two
          trucks' worth of food on Cincinnati tables this fall.
        </p>

        <div className={styles.facts}>
          <Fact icon={<Calendar size={20} />} label="Date"   value="Aug 30, 2026" />
          <Fact icon={<MapPin  size={20} />} label="Course" value="Beckett Ridge" />
          <Fact icon={<Flag   size={20} />} label="Format" value="2-person scramble" />
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
            <span className={styles.spotsNum}>{SPOTS_TAKEN}/{SPOTS_TOTAL}</span>
            team spots taken
          </div>
          <MoneyRaised variant="chip" />
        </div>
      </div>

      {/* Hero photo placeholder */}
      <div className={styles.photoWrap}>
        <div className={styles.photoPlaceholder} role="img" aria-label="Course photo — coming soon">
          <div>
            <div className={styles.placeholderLabel}>Hero photo</div>
            <div className={styles.placeholderSub}>Beckett Ridge · warm + sunlit</div>
          </div>
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
