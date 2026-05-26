'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { LogoRibbon } from '@/components/ui/LogoRibbon'
import { createClient } from '@/lib/supabase/client'
import { loginWithPin } from './actions'
import { EVENT_ID } from '@/lib/eventId'

type Team = { id: string; name: string }

export default function PlayerEntryPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [team, setTeam] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('team')
      .select('id, name')
      .eq('event_id', EVENT_ID)
      .order('name')
      .then(({ data }) => {
        const rows = data as Team[] | null
        if (rows && rows.length > 0) {
          setTeams(rows)
          setTeam(rows[0].id)
        }
      })
  }, [])

  const allFilled = pin.length === 4

  const handleEnter = async () => {
    if (!allFilled || !team) return
    setError('')
    setLoading(true)
    const pinStr = pin
    const result = await loginWithPin(team, pinStr)
    setLoading(false)
    if (result.error) {
      setError(result.error)
    } else {
      router.push('/play/home')
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.logo}>
        <LogoRibbon height={168 / 3} />
      </div>

      <div className={styles.eventDate}>August 30, 2026 · Beckett Ridge</div>
      <h1 className={styles.eventTitle}>Drive Out Hunger</h1>
      <div className={styles.eventCause}>Supporting Last Mile Food Rescue</div>

      <label className={styles.fieldLabel}>Pick your team</label>
      <select
        value={team}
        onChange={e => setTeam(e.target.value)}
        className={styles.teamSelect}
      >
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <label className={styles.fieldLabel} style={{ marginTop: 22 }}>Team PIN</label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        value={pin}
        onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="0000"
        className={styles.pinInput}
        aria-label="4-digit team PIN"
        autoComplete="one-time-code"
      />

      {error ? (
        <div className={styles.pinHint} style={{ color: 'var(--score-bogey)' }}>{error}</div>
      ) : (
        <div className={styles.pinHint}>
          From your registration confirmation. Try <span className={styles.pinSample}>4821</span>.
        </div>
      )}

      <div className={styles.spacer} />

      <button
        onClick={handleEnter}
        disabled={!allFilled || loading}
        className={`${styles.enterBtn} ${allFilled ? styles.enterBtnActive : ''}`}
      >
        {loading ? 'Checking…' : 'Enter the app'}
      </button>

      <div className={styles.pwaHint}>
        Tip: tap &quot;Add to Home Screen&quot; to install as a PWA.
      </div>
    </div>
  )
}
