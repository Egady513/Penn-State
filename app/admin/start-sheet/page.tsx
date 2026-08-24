'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'
import sheet from '@/components/admin/sheet.module.css'

type Team = { id: string; name: string; start_hole: number | null; pairing: string | null; players: string[] }
type View = 'group' | 'hole'

export default function StartSheetPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('group')

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase.from('team').select('id, name, start_hole, pairing')
        .eq('event_id', EVENT_ID).eq('payment_status', 'paid').order('name'),
      supabase.from('player').select('team_id, name'),
    ]).then(([tRes, pRes]) => {
      const ts = (tRes.data ?? []) as { id: string; name: string; start_hole: number | null; pairing: string | null }[]
      const ps = (pRes.data ?? []) as { team_id: string; name: string }[]
      setTeams(ts.map(t => ({ ...t, players: ps.filter(p => p.team_id === t.id).map(p => p.name) })))
      setLoading(false)
    })
  }, [])

  // ── Group by pairing (a foursome = 2 teams) ──────────────────────
  const byGroup = new Map<string, Team[]>()
  const ungrouped: Team[] = []
  for (const t of teams) {
    const g = (t.pairing ?? '').trim()
    if (!g) { ungrouped.push(t); continue }
    const arr = byGroup.get(g) ?? []; arr.push(t); byGroup.set(g, arr)
  }
  // Numeric groups sort numerically; any legacy text label sorts after.
  const groupKeys = Array.from(byGroup.keys()).sort((a, b) => {
    const na = Number(a), nb = Number(b)
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb
    if (Number.isFinite(na)) return -1
    if (Number.isFinite(nb)) return 1
    return a.localeCompare(b)
  })

  const byHole = new Map<number, Team[]>()
  const noHole: Team[] = []
  for (const t of teams) {
    if (t.start_hole == null) noHole.push(t)
    else { const arr = byHole.get(t.start_hole) ?? []; arr.push(t); byHole.set(t.start_hole, arr) }
  }
  const holes = Array.from(byHole.keys()).sort((a, b) => a - b)

  /** Flat CSV for the course: one row per team, ordered by group. */
  function exportCsv() {
    const rows: string[][] = [['Group', 'Start hole', 'Team', 'Players', 'Golfers']]
    for (const g of groupKeys) {
      for (const t of byGroup.get(g)!) {
        rows.push([g, t.start_hole != null ? String(t.start_hole) : '', t.name, t.players.join(' / '), String(t.players.length)])
      }
    }
    for (const t of ungrouped) {
      rows.push(['UNASSIGNED', t.start_hole != null ? String(t.start_hole) : '', t.name, t.players.join(' / '), String(t.players.length)])
    }
    const csv = rows.map(r => r.map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'drive-out-hunger-pairings.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const Block = ({ label, list, note }: { label: string; list: Team[]; note?: string }) => (
    <div className={sheet.group}>
      <div className={sheet.groupHead}>
        {label}
        {note && <span style={{ fontWeight: 400, color: 'var(--fg-muted)' }}> · {note}</span>}
      </div>
      <table className={sheet.table}>
        <thead><tr><th>Team</th><th>Players</th><th>{view === 'group' ? 'Start hole' : 'Group'}</th></tr></thead>
        <tbody>
          {list.map(t => (
            <tr key={t.id}>
              <td><strong>{t.name}</strong></td>
              <td>{t.players.join(', ') || '—'}</td>
              <td>{view === 'group' ? (t.start_hole ?? '—') : (t.pairing || '—')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const golfers = teams.reduce((s, t) => s + t.players.length, 0)
  const incomplete = groupKeys.filter(g => byGroup.get(g)!.length < 2)

  return (
    <div className={sheet.page}>
      <div className={sheet.head}>
        <div>
          <h1 className={sheet.title}>Start sheet &amp; pairings</h1>
          <p className={sheet.sub}>
            Drive Out Hunger 2026 · Beckett Ridge · {teams.length} teams · {golfers} golfers ·{' '}
            {groupKeys.length} group{groupKeys.length === 1 ? '' : 's'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className={sheet.printBtn} onClick={() => setView(v => (v === 'group' ? 'hole' : 'group'))}>
            {view === 'group' ? 'By start hole' : 'By group'}
          </button>
          <button className={sheet.printBtn} onClick={exportCsv}>Export CSV</button>
          <button className={sheet.printBtn} onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {!loading && ungrouped.length > 0 && (
        <div className={sheet.noPrint} style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#92400E', fontSize: 13 }}>
          {ungrouped.length} team{ungrouped.length === 1 ? '' : 's'} not assigned to a group yet — set it on the Teams tab.
        </div>
      )}
      {!loading && incomplete.length > 0 && (
        <div className={sheet.noPrint} style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#E6F0FB', border: '1px solid #96BEE6', color: '#1E3A5F', fontSize: 13 }}>
          Group{incomplete.length === 1 ? '' : 's'} {incomplete.join(', ')} only ha{incomplete.length === 1 ? 's' : 've'} one team — fine if that&apos;s intentional (33 teams won&apos;t split evenly).
        </div>
      )}

      {loading ? (
        <div className={sheet.empty}>Loading…</div>
      ) : teams.length === 0 ? (
        <div className={sheet.empty}>No paid teams yet.</div>
      ) : view === 'group' ? (
        <>
          {groupKeys.map(g => {
            const list = byGroup.get(g)!
            const hole = list.find(t => t.start_hole != null)?.start_hole
            return (
              <Block
                key={g}
                label={`Group ${g}`}
                list={list}
                note={`${list.reduce((s, t) => s + t.players.length, 0)} golfers${hole != null ? ` · hole ${hole}` : ''}`}
              />
            )
          })}
          {ungrouped.length > 0 && <Block label={`No group assigned (${ungrouped.length})`} list={ungrouped} />}
        </>
      ) : (
        <>
          {holes.map(h => <Block key={h} label={`Hole ${h}`} list={byHole.get(h)!} />)}
          {noHole.length > 0 && <Block label={`No starting hole assigned (${noHole.length})`} list={noHole} />}
        </>
      )}
    </div>
  )
}
