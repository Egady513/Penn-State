'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './MoneyRaised.module.css'

interface MoneyRaisedProps {
  /** 'chip' = compact pill (hero); 'banner' = card with goal progress (player app) */
  variant?: 'chip' | 'banner'
  goal?: number
}

export function MoneyRaised({ variant = 'chip', goal = 10000 }: MoneyRaisedProps) {
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // total_raised() is a security-definer RPC returning the aggregate only.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.rpc as any)('total_raised').then(
      ({ data }: { data: number | null }) => {
        if (data != null && !Number.isNaN(Number(data))) setTotal(Number(data))
      }
    )
  }, [])

  const amount = total == null ? null : `$${Math.round(total).toLocaleString()}`
  const pct = total == null ? 0 : Math.min(Math.round((total / goal) * 100), 100)

  if (variant === 'chip') {
    return (
      <div className={styles.chip}>
        <Heart size={14} strokeWidth={2.2} />
        <span className={styles.chipNum}>{amount ?? '—'}</span>
        raised so far
      </div>
    )
  }

  return (
    <div className={styles.banner}>
      <div className={styles.bannerTop}>
        <span className={styles.bannerLabel}>Raised so far</span>
        <span className={styles.bannerGoal}>Goal ${goal.toLocaleString()}</span>
      </div>
      <div className={styles.bannerAmount}>{amount ?? '—'}</div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.bannerSub}>
        Every dollar helps Last Mile Food Rescue put food on Cincinnati tables.
      </div>
    </div>
  )
}
