'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import styles from './MoneyRaised.module.css'

interface MoneyRaisedProps {
  /** 'chip' = compact pill (hero); 'banner' = card with goal progress (player app) */
  variant?: 'chip' | 'banner'
  goal?: number
  /**
   * 'gross' = every dollar collected.
   * 'net'   = what actually reaches Last Mile, after greens fees, drink
   *           tickets and the rest of the event's costs.
   */
  metric?: 'gross' | 'net'
}

type BreakdownRow = { category: string; dollars: number | string }

export function MoneyRaised({ variant = 'chip', goal = 10000, metric = 'gross' }: MoneyRaisedProps) {
  const [total, setTotal] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()
    // revenue_breakdown() is the single source of truth: total_raised()
    // delegates to it. Reading it directly is what lets us net out expenses
    // instead of showing a gross figure that overstates the charity's cut.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.rpc as any)('revenue_breakdown').then(
      ({ data }: { data: BreakdownRow[] | null }) => {
        if (!data) return
        let income = 0, expenses = 0
        for (const r of data) {
          const d = Number(r.dollars)
          if (Number.isNaN(d)) continue
          // card_fees is Stripe's cut: money out, same as any other expense.
          if (r.category === 'expenses' || r.category === 'card_fees') expenses += d
          else income += d
        }
        setTotal(metric === 'net' ? income - expenses : income)
      }
    )
  }, [metric])

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
        <span className={styles.bannerLabel}>
          {metric === 'net' ? 'To Last Mile Food Rescue' : 'Raised so far'}
        </span>
        <span className={styles.bannerGoal}>Goal ${goal.toLocaleString()}</span>
      </div>
      <div className={styles.bannerAmount}>{amount ?? '—'}</div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.bannerSub}>
        {metric === 'net'
          ? 'What the outing clears after costs. Every dollar puts food on Cincinnati tables.'
          : 'Every dollar helps Last Mile Food Rescue put food on Cincinnati tables.'}
      </div>
    </div>
  )
}
