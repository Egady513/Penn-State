'use client'

import { useState } from 'react'
import styles from './page.module.css'
import { Search, Check, Plus, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'

interface Golfer { id: string; name: string; arrived: boolean }
interface Team {
  id: string; name: string; pin: string; paid: boolean
  golfers: Golfer[]
  addons: { label: string; price: number; paid: boolean }[]
}

const MOCK_TEAMS: Team[] = [
  {
    id: 't1', name: 'Nittany Drivers', pin: '4821', paid: true,
    golfers: [
      { id: 'g1', name: 'James Paterno', arrived: false },
      { id: 'g2', name: 'Sarah White',   arrived: false },
    ],
    addons: [
      { label: 'Gimme rope', price: 10, paid: true },
      { label: 'Closest-to-pin', price: 10, paid: false },
    ],
  },
  {
    id: 't2', name: 'Lions of Cincy', pin: '7734', paid: false,
    golfers: [
      { id: 'g3', name: 'Mike Chen',    arrived: false },
      { id: 'g4', name: 'Lisa Nguyen',  arrived: false },
    ],
    addons: [],
  },
  {
    id: 't3', name: 'Beaver Stadium Boys', pin: '2291', paid: true,
    golfers: [
      { id: 'g5', name: 'Tom Bradley',  arrived: true },
      { id: 'g6', name: 'Chris Harper', arrived: true },
    ],
    addons: [{ label: 'Long-drive contest', price: 10, paid: true }],
  },
]

export default function CheckinPage() {
  const [query, setQuery] = useState('')
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS)
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = teams.filter(t =>
    t.name.toLowerCase().includes(query.toLowerCase()) ||
    t.pin.includes(query) ||
    t.golfers.some(g => g.name.toLowerCase().includes(query.toLowerCase()))
  )

  const toggleArrived = (teamId: string, golferId: string) => {
    setTeams(prev => prev.map(t =>
      t.id === teamId
        ? { ...t, golfers: t.golfers.map(g => g.id === golferId ? { ...g, arrived: !g.arrived } : g) }
        : t
    ))
  }

  const checkedIn = teams.filter(t => t.golfers.every(g => g.arrived)).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Check-in</h1>
          <p className={styles.sub}>{checkedIn} of {teams.length} teams arrived</p>
        </div>
      </div>

      <div className={styles.searchWrap}>
        <Search size={18} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="Search team name, golfer name, or PIN…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className={styles.list}>
        {filtered.map(team => {
          const allArrived = team.golfers.every(g => g.arrived)
          const outstanding = team.addons.filter(a => !a.paid).reduce((s, a) => s + a.price, 0)
          const isOpen = expanded === team.id

          return (
            <div key={team.id} className={`${styles.card} ${allArrived ? styles.cardArrived : ''}`}>
              <button className={styles.cardHeader} onClick={() => setExpanded(isOpen ? null : team.id)}>
                <div className={styles.cardLeft}>
                  <div className={styles.teamName}>{team.name}</div>
                  <div className={styles.teamMeta}>
                    PIN {team.pin} ·{' '}
                    <Badge tone={team.paid ? 'paid' : 'unpaid'} size="sm">
                      {team.paid ? 'Paid' : 'Unpaid'}
                    </Badge>
                    {outstanding > 0 && (
                      <span className={styles.outstanding}> · ${outstanding} outstanding</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardStatus}>
                  {allArrived
                    ? <span className={styles.arrivedChip}><Check size={14} /> Here</span>
                    : <span className={styles.awaitingChip}>{team.golfers.filter(g => g.arrived).length}/{team.golfers.length} arrived</span>
                  }
                </div>
              </button>

              {isOpen && (
                <div className={styles.cardBody}>
                  <div className={styles.golferList}>
                    {team.golfers.map(g => (
                      <div key={g.id} className={styles.golferRow}>
                        <button
                          className={`${styles.arrivedBtn} ${g.arrived ? styles.arrivedBtnOn : ''}`}
                          onClick={() => toggleArrived(team.id, g.id)}
                          aria-label={g.arrived ? 'Mark not arrived' : 'Mark arrived'}
                        >
                          <Check size={16} />
                        </button>
                        <span className={styles.golferName}>{g.name}</span>
                        <span className={styles.golferStatus}>{g.arrived ? 'Arrived' : 'Not here yet'}</span>
                      </div>
                    ))}
                  </div>

                  {team.addons.length > 0 && (
                    <div className={styles.addons}>
                      <div className={styles.addonsLabel}>Add-ons</div>
                      {team.addons.map((a, i) => (
                        <div key={i} className={styles.addonRow}>
                          <span>{a.label}</span>
                          <span className={styles.addonPrice}>${a.price}</span>
                          <Badge tone={a.paid ? 'paid' : 'unpaid'} size="sm">{a.paid ? 'Paid' : 'Unpaid'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}

                  {outstanding > 0 && (
                    <div className={styles.outstandingRow}>
                      <span>Outstanding balance</span>
                      <span className={styles.outstandingAmt}>${outstanding}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className={styles.empty}>No teams match &ldquo;{query}&rdquo;</div>
        )}
      </div>
    </div>
  )
}
