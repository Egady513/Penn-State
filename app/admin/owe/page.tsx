'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import sheet from '@/components/admin/sheet.module.css'

type Balance = { teamId: string; team: string; reg: number; addons: number; mulligans: number; total: number }

export default function OwePage() {
  const [rows, setRows] = useState<Balance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.rpc as any)('team_balances').then(({ data }: { data: unknown }) => {
      const raw = (data ?? []) as { team_id: string; team_name: string; reg_unpaid: number; purchases_unpaid: number; mulligans_unpaid: number }[]
      const mapped: Balance[] = raw
        .map(r => {
          const reg = Number(r.reg_unpaid) || 0
          const addons = Number(r.purchases_unpaid) || 0
          const mulligans = Number(r.mulligans_unpaid) || 0
          return { teamId: r.team_id, team: r.team_name, reg, addons, mulligans, total: reg + addons + mulligans }
        })
        .filter(b => b.total > 0)
        .sort((a, b) => b.total - a.total)
      setRows(mapped)
      setLoading(false)
    })
  }, [])

  const grand = rows.reduce((s, r) => s + r.total, 0)

  return (
    <div className={sheet.page}>
      <div className={sheet.head}>
        <div>
          <h1 className={sheet.title}>Who owes what</h1>
          <p className={sheet.sub}>Outstanding balances to settle at the tent · {rows.length} team{rows.length === 1 ? '' : 's'}</p>
        </div>
        <button className={sheet.printBtn} onClick={() => window.print()}>Print</button>
      </div>

      {loading ? (
        <div className={sheet.empty}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={sheet.empty}>Everyone&apos;s settled up — no outstanding balances.</div>
      ) : (
        <table className={sheet.table}>
          <thead>
            <tr>
              <th>Team</th>
              <th className={sheet.right}>Registration</th>
              <th className={sheet.right}>Add-ons</th>
              <th className={sheet.right}>Mulligans</th>
              <th className={sheet.right}>Total owed</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.teamId}>
                <td><strong>{r.team}</strong></td>
                <td className={sheet.right}>{r.reg > 0 ? `$${r.reg}` : '—'}</td>
                <td className={sheet.right}>{r.addons > 0 ? `$${r.addons}` : '—'}</td>
                <td className={sheet.right}>{r.mulligans > 0 ? `$${r.mulligans}` : '—'}</td>
                <td className={sheet.right}><strong>${r.total}</strong></td>
              </tr>
            ))}
            <tr className={sheet.totalRow}>
              <td>Total outstanding</td>
              <td></td><td></td><td></td>
              <td className={sheet.right}>${grand}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  )
}
