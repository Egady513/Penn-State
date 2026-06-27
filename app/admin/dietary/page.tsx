'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'
import sheet from '@/components/admin/sheet.module.css'

type Row = { name: string; team: string; need: string }

export default function DietaryPage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('team').select('id, name').eq('event_id', EVENT_ID),
      supabase.from('player').select('team_id, name, dietary_notes'),
    ]).then(([tRes, pRes]) => {
      const teamName = new Map(((tRes.data ?? []) as { id: string; name: string }[]).map(t => [t.id, t.name]))
      const ps = (pRes.data ?? []) as { team_id: string; name: string; dietary_notes: string | null }[]
      setRows(
        ps
          .filter(p => p.dietary_notes && p.dietary_notes.trim() && p.dietary_notes.trim().toLowerCase() !== 'none')
          .map(p => ({ name: p.name, team: teamName.get(p.team_id) ?? '—', need: p.dietary_notes!.trim() }))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      setLoading(false)
    })
  }, [])

  return (
    <div className={sheet.page}>
      <div className={sheet.head}>
        <div>
          <h1 className={sheet.title}>Dietary needs</h1>
          <p className={sheet.sub}>For the caterer · {rows.length} golfer{rows.length === 1 ? '' : 's'} with notes</p>
        </div>
        <button className={sheet.printBtn} onClick={() => window.print()}>Print</button>
      </div>

      {loading ? (
        <div className={sheet.empty}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={sheet.empty}>No golfers have entered dietary needs.</div>
      ) : (
        <table className={sheet.table}>
          <thead><tr><th>Golfer</th><th>Team</th><th>Dietary need</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td><strong>{r.name}</strong></td>
                <td>{r.team}</td>
                <td>{r.need}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
