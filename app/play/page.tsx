'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { LogoRibbon } from '@/components/ui/LogoRibbon'
import { PLAYER_TEAMS } from '@/lib/mockData'

export default function PlayerEntryPage() {
  const router = useRouter()
  const [team, setTeam] = useState('t07')
  const [pin, setPin] = useState(['', '', '', ''])

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    setPin(p => p.map((x, idx) => (idx === i ? d : x)))
    // Auto-advance focus
    if (d && i < 3) {
      const next = document.getElementById(`pin-${i + 1}`)
      next?.focus()
    }
  }

  const allFilled = pin.every(d => d.length === 1)

  const handleEnter = () => {
    if (allFilled) router.push('/play/home')
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
        {PLAYER_TEAMS.map(t => (
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
      <div className={styles.pinHint}>
        From your registration confirmation. Try <span className={styles.pinSample}>4821</span>.
      </div>

      <div className={styles.spacer} />

      <button
        onClick={handleEnter}
        disabled={!allFilled}
        className={`${styles.enterBtn} ${allFilled ? styles.enterBtnActive : ''}`}
      >
        Enter the app
      </button>

      <div className={styles.pwaHint}>
        Tip: tap &quot;Add to Home Screen&quot; to install as a PWA.
      </div>
    </div>
  )
}
