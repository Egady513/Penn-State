'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './page.module.css'
import { LogoRibbon } from '@/components/ui/LogoRibbon'
import { createClient } from '@/lib/supabase/client'
import { loginWithPin } from './actions'
import { EVENT_ID } from '@/lib/eventId'

type Team = { id: string; name: string; pin: string }
type PlayerOpt = { id: string; name: string; team_id: string }

export default function PlayerEntryPage() {
  const router = useRouter()
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<PlayerOpt[]>([])
  const [team, setTeam] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('team').select('id, name, pin').eq('event_id', EVENT_ID).order('name'),
      supabase.from('player').select('id, name, team_id'),
    ]).then(([teamsRes, playersRes]) => {
      const rows = (teamsRes.data ?? []) as Team[]
      const pls = (playersRes.data ?? []) as PlayerOpt[]
      setPlayers([...pls].sort((a, b) => a.name.localeCompare(b.name)))
      if (rows.length > 0) {
        setTeams(rows)
        setTeam(rows[0].id)
        setPin(rows[0].pin ?? '')
      }
    })
  }, [])

  // Selecting a team — directly or via a player's name — fills in its PIN.
  function selectTeam(teamId: string, teamList: Team[] = teams) {
    setTeam(teamId)
    setPin(teamList.find(t => t.id === teamId)?.pin ?? '')
    setError('')
  }

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
        onChange={e => selectTeam(e.target.value)}
        className={styles.teamSelect}
      >
        {teams.map(t => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>

      <label className={styles.fieldLabel} style={{ marginTop: 16 }}>…or find your team by your name</label>
      <select
        value=""
        onChange={e => { if (e.target.value) selectTeam(e.target.value) }}
        className={styles.teamSelect}
      >
        <option value="">Select your name…</option>
        {players.map(p => {
          const tname = teams.find(t => t.id === p.team_id)?.name
          return (
            <option key={p.id} value={p.team_id}>
              {p.name}{tname ? ` — ${tname}` : ''}
            </option>
          )
        })}
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
          Filled in for your team — or type the 4-digit PIN from your confirmation email.
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
