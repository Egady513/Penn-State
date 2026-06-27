'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'
import sheet from '@/components/admin/sheet.module.css'

type Team = { id: string; name: string; start_hole: number | null; pairing: string | null; players: string[] }

export default function StartSheetPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('team').select('id, name, start_hole, pairing').eq('event_id', EVENT_ID).order('name'),
      supabase.from('player').select('team_id, name'),
    ]).then(([tRes, pRes]) => {
      const ts = (tRes.data ?? []) as { id: string; name: string; start_hole: number | null; pairing: string | null }[]
      const ps = (pRes.data ?? []) as { team_id: string; name: string }[]
      setTeams(ts.map(t => ({ ...t, players: ps.filter(p => p.team_id === t.id).map(p => p.name) })))
      setLoading(false)
    })
  }, [])

  const byHole = new Map<number, Team[]>()
  const unassigned: Team[] = []
  for (const t of teams) {
    if (t.start_hole == null) unassigned.push(t)
    else { const arr = byHole.get(t.start_hole) ?? []; arr.push(t); byHole.set(t.start_hole, arr) }
  }
  const holes = Array.from(byHole.keys()).sort((a, b) => a - b)

  const Group = ({ label, list }: { label: string; list: Team[] }) => (
    <div className={sheet.group}>
      <div className={sheet.groupHead}>{label}</div>
      <table className={sheet.table}>
        <thead><tr><th>Team</th><th>Players</th><th>Pairing</th></tr></thead>
        <tbody>
          {list.map(t => (
            <tr key={t.id}>
              <td><strong>{t.name}</strong></td>
              <td>{t.players.join(', ') || '—'}</td>
              <td>{t.pairing || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className={sheet.page}>
      <div className={sheet.head}>
        <div>
          <h1 className={sheet.title}>Shotgun start sheet</h1>
          <p className={sheet.sub}>Drive Out Hunger 2026 · Beckett Ridge · {teams.length} teams</p>
        </div>
        <button className={sheet.printBtn} onClick={() => window.print()}>Print</button>
      </div>

      {loading ? (
        <div className={sheet.empty}>Loading…</div>
      ) : teams.length === 0 ? (
        <div className={sheet.empty}>No teams yet.</div>
      ) : (
        <>
          {holes.map(h => <Group key={h} label={`Hole ${h}`} list={byHole.get(h)!} />)}
          {unassigned.length > 0 && <Group label={`No starting hole assigned (${unassigned.length})`} list={unassigned} />}
        </>
      )}
    </div>
  )
}
