'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import styles from './page.module.css'
import { createSettleBalanceCheckout } from '@/app/actions/settle-balance'

export function SettleButton({ teamId, amount }: { teamId: string; amount: number }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function go() {
    setLoading(true)
    setError('')
    const res = await createSettleBalanceCheckout(teamId, window.location.origin)
    if (res.error || !res.url) {
      setError(res.error ?? 'Could not start checkout. Please try again.')
      setLoading(false)
      return
    }
    window.location.href = res.url
  }

  return (
    <>
      <button className={styles.payBtn} onClick={go} disabled={loading}>
        {loading
          ? <><Loader2 size={16} className={styles.spinner} /> Starting…</>
          : <>Pay ${amount} with card</>}
      </button>
      {error && <div className={styles.payError}>{error}</div>}
    </>
  )
}
