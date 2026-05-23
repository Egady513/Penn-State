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
  const [pin, setPin] = useState(['', '', '', ''])
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

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    setPin(p => p.map((x, idx) => (idx === i ? d : x)))
    if (d && i < 3) {
      document.getElementById(`pin-${i + 1}`)?.focus()
    }
  }

  const allFilled = pin.every(d => d.length === 1)

  const handleEnter = async () => {
    if (!allFilled || !team) return
    setError('')
    setLoading(true)
    const pinStr = pin.join('')
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
      <div className={styles.pinRow}>
        {pin.map((d, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            value={d}
            onChange={e => setDigit(i, e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Backspace' && !d && i > 0) {
                document.getElementById(`pin-${i - 1}`)?.focus()
              }
            }}
            inputMode="numeric"
            maxLength={1}
            className={styles.pinInput}
            aria-label={`PIN digit ${i + 1}`}
          />
        ))}
      </div>

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
