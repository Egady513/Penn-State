'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import styles from './page.module.css'
import { Icon } from '@/components/ui/Icon'
import { LogoRibbon } from '@/components/ui/LogoRibbon'

function ConfirmationContent() {
  const params = useSearchParams()
  const pin = params.get('pin') ?? '4821'
  const team = params.get('team') ?? 'Your Team'
  const method = params.get('method')

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.successIcon}>
          <Icon name="check-circle" size={36} color="var(--success)" />
        </div>

        <LogoRibbon height={40} className={styles.logo} />

        <h1 className={styles.headline}>You&apos;re in.</h1>
        <p className={styles.sub}>
          We&apos;ll see you August 30 at Beckett Ridge. Your team is on the
          leaderboard.
        </p>

        <div className={styles.teamName}>{decodeURIComponent(team)}</div>

        {method === 'venmo' && (
          <div className={styles.venmoNote}>
            Finish up in Venmo — pay <strong>@psucincy_treasurer</strong> if the app
            didn&apos;t open. Your spot is reserved; we&apos;ll confirm once it&apos;s received.
          </div>
        )}

        <div className={styles.pinBlock}>
          <div className={styles.pinLabel}>Team PIN</div>
          <div className={`${styles.pinNumber} num`}>{pin}</div>
          <div className={styles.pinNote}>You&apos;ll need this in the day-of app.</div>
        </div>

        <div className={styles.actions}>
          <Link href="/play/home" className={styles.btnPrimary}>
            Open the day-of app
          </Link>
          <Link href="/" className={styles.btnSecondary}>
            Back to the site
          </Link>
        </div>

        <div className={styles.taxNote}>
          Greater Cincinnati Penn State Alumni Association · 501(c)(3) · EIN 31-1100175.
          Your donation is tax-deductible to the extent permitted by law.
        </div>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className={styles.page}><div className={styles.card}>Loading…</div></div>}>
      <ConfirmationContent />
    </Suspense>
  )
}
