'use client'

import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import sheet from '@/components/admin/sheet.module.css'

type Cat = { count: number; dollars: number }
type Expense = { id: string; description: string; amount: number; category: string; created_at: string }
type Outside = { id: string; description: string; amount: number; method: string; created_at: string }

// Income categories (everything except expenses), in display order.
const INCOME: [string, string][] = [
  ['registration', 'Registration fees'],
  ['donations', 'Donations'],
  ['fee_coverage', 'Processing fee covered by registrants'],
  ['challenge', 'LD & CTP Challenge'],
  ['raffles', 'Raffle tickets'],
  ['mulligans', 'Mulligans'],
  ['other_addons', 'Other add-ons'],
]

// Money that never went through the app. Sponsor dollars are typed in by
// hand on the Sponsors tab, so they belong here, not in the Stripe section.
const OUTSIDE_APP: [string, string][] = [
  ['sponsorships', 'Sponsorships (recorded by hand)'],
  ['outside', 'Checks, cash & Venmo'],
]

export default function RevenuePage() {
  const [cats, setCats] = useState<Record<string, Cat>>({})
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [outside, setOutside] = useState<Outside[]>([])
  const [oDesc, setODesc] = useState('')
  const [oAmount, setOAmount] = useState('')
  const [oMethod, setOMethod] = useState('cash')
  const [oSaving, setOSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('other')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const supabase = createClient()
    const [brRes, exRes, oiRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('revenue_breakdown'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('list_expenses'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('list_outside_income'),
    ])
    const br = (brRes.data ?? []) as { category: string; item_count: number; dollars: number }[]
    const map: Record<string, Cat> = {}
    br.forEach(r => { map[r.category] = { count: Number(r.item_count) || 0, dollars: Number(r.dollars) || 0 } })
    setCats(map)
    setExpenses((exRes.data ?? []) as Expense[])
    // Migration may not have run yet — treat a missing table as empty.
    setOutside((oiRes?.error ? [] : (oiRes?.data ?? [])) as Outside[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Everything charged through the app. This is what should line up with
  // Stripe, minus its fees and anything already paid out.
  const inAppTotal   = INCOME.reduce((s, [k]) => s + (cats[k]?.dollars ?? 0), 0)
  const outsideTotal = OUTSIDE_APP.reduce((s, [k]) => s + (cats[k]?.dollars ?? 0), 0)
  const expensesTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const gross = inAppTotal + outsideTotal
  const net   = gross - expensesTotal

  async function addExpense() {
    const amt = Number(amount)
    if (!desc.trim() || !(amt > 0)) { setError('Enter a description and a positive amount.'); return }
    setSaving(true); setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.rpc as any)('save_expense', { p_id: null, p_description: desc.trim(), p_amount: amt, p_category: category })
    setSaving(false)
    if (e) { setError(e.message); return }
    setDesc(''); setAmount(''); setCategory('other')
    load()
  }

  async function addOutside() {
    const amt = Number(oAmount)
    if (!oDesc.trim() || !(amt > 0)) { setError('Enter a description and a positive amount.'); return }
    setOSaving(true); setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.rpc as any)('save_outside_income', {
      p_id: null, p_description: oDesc.trim(), p_amount: amt, p_method: oMethod,
    })
    setOSaving(false)
    if (e) { setError(`Couldn't add: ${e.message}`); return }
    setODesc(''); setOAmount(''); setOMethod('cash')
    load()
  }

  async function removeOutside(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('delete_outside_income', { p_id: id })
    setOutside(prev => prev.filter(o => o.id !== id))
    load()
  }

  async function removeExpense(id: string) {
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('delete_expense', { p_id: id })
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className={sheet.page}>
      <div className={sheet.head}>
        <div>
          <h1 className={sheet.title}>Revenue</h1>
          <p className={sheet.sub}>
            Internal only, never shown publicly. Expenses subtract for net to Last Mile.
          </p>
          <p className={sheet.sub} style={{ marginTop: 4 }}>
            <strong>Collected through the app</strong> is what should line up with Stripe, before Stripe
            takes its fees and before any payout. It will drift once you start marking things paid at
            check-in for cash, since those land in the same categories.{' '}
            <strong>Stripe fees are not subtracted automatically</strong> &mdash; add them as an expense
            from your Stripe dashboard.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }} className={sheet.noPrint}>
          <button onClick={load} style={{ height: 38, padding: '0 14px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--bg)', color: 'var(--fg)', fontSize: 14, cursor: 'pointer' }}>↻ Refresh</button>
          <button className={sheet.printBtn} onClick={() => window.print()}>Print</button>
        </div>
      </div>

      {loading ? <div className={sheet.empty}>Loading…</div> : (
        <>
          <table className={sheet.table}>
            <thead><tr><th>Source</th><th className={sheet.right}>Count</th><th className={sheet.right}>Amount</th></tr></thead>
            <tbody>
              {INCOME.map(([k, label]) => (
                <tr key={k}>
                  <td>{label}</td>
                  <td className={sheet.right}>{cats[k]?.count ?? 0}</td>
                  <td className={sheet.right}>${(cats[k]?.dollars ?? 0).toLocaleString()}</td>
                </tr>
              ))}
              <tr className={sheet.totalRow}>
                <td>Collected through the app</td>
                <td></td>
                <td className={sheet.right}>${inAppTotal.toLocaleString()}</td>
              </tr>

              <tr><td colSpan={3} style={{ height: 14, border: 'none' }} /></tr>

              <tr className={sheet.subtotalRow}>
                <td>Less expenses</td>
                <td></td>
                <td className={sheet.right}>&minus;${expensesTotal.toLocaleString()}</td>
              </tr>

              {OUTSIDE_APP.map(([k, label]) => (
                <tr key={k}>
                  <td>Plus {label.charAt(0).toLowerCase() + label.slice(1)}</td>
                  <td className={sheet.right}>{cats[k]?.count ?? 0}</td>
                  <td className={sheet.right}>${(cats[k]?.dollars ?? 0).toLocaleString()}</td>
                </tr>
              ))}

              <tr className={sheet.totalRow}>
                <td>Total to Last Mile Food Rescue</td>
                <td></td>
                <td className={sheet.right}>${net.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className={sheet.group} style={{ marginTop: 28 }}>
            <div className={sheet.groupHead}>Expenses</div>
            <table className={sheet.table}>
              <tbody>
                {expenses.length === 0 && <tr><td className={sheet.empty} colSpan={3}>No expenses logged yet.</td></tr>}
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>{e.description}<span style={{ color: 'var(--fg-muted)', fontSize: 12 }}> · {e.category === 'greens_fees' ? 'Greens fees' : 'Other'}</span></td>
                    <td className={sheet.right}>−${(Number(e.amount) || 0).toLocaleString()}</td>
                    <td className={sheet.right} style={{ width: 36 }}>
                      <button className={sheet.noPrint} onClick={() => removeExpense(e.id)} style={delBtn} title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
                {expenses.length > 0 && (
                  <tr className={sheet.totalRow}>
                    <td>Total expenses</td>
                    <td className={sheet.right}>−${expensesTotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className={sheet.noPrint} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Expense (e.g. Putting-green alcohol)" value={desc} onChange={e => setDesc(e.target.value)} style={{ ...inputStyle, minWidth: 240, flex: 1 }} />
              <input type="number" min={0} placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} style={{ ...inputStyle, width: 120 }} />
              <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
                <option value="other">Other</option>
                <option value="greens_fees">Greens fees</option>
              </select>
              <button onClick={addExpense} disabled={saving} style={addBtn}>{saving ? 'Adding…' : 'Add expense'}</button>
            </div>
            {error && <div style={{ color: '#C0392B', fontSize: 13, marginTop: 6 }}>{error}</div>}
          </div>

          <div style={{ marginTop: 28 }}>
            <h2 className={sheet.h2}>Collected outside Stripe</h2>
            <p className={sheet.sub}>
              Checks, cash and Venmo. Counts toward gross and net, same as everything else.
              Zero the matching sponsor amount so the money is not counted twice.
            </p>
            <table className={sheet.table}>
              <tbody>
                {outside.length === 0 ? (
                  <tr><td style={{ color: 'var(--fg-muted)', fontSize: 13 }}>Nothing recorded yet.</td></tr>
                ) : outside.map(o => (
                  <tr key={o.id}>
                    <td>
                      {o.description}
                      <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}> · {o.method}</span>
                    </td>
                    <td className={sheet.right}>${Number(o.amount).toLocaleString()}</td>
                    <td className={sheet.noPrint} style={{ width: 34, textAlign: 'right' }}>
                      <button
                        onClick={() => removeOutside(o.id)}
                        title="Remove"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14 }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
                <tr className={sheet.totalRow}>
                  <td>Total cash &amp; Venmo</td>
                  <td className={sheet.right}>${outside.reduce((s, o) => s + Number(o.amount || 0), 0).toLocaleString()}</td>
                  <td className={sheet.noPrint} />
                </tr>
              </tbody>
            </table>

            <div className={sheet.noPrint} style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="What was it? (e.g. Bucket golf, hole 1)" value={oDesc} onChange={e => setODesc(e.target.value)} style={{ ...inputStyle, minWidth: 240, flex: 1 }} />
              <input type="number" min={0} placeholder="Amount" value={oAmount} onChange={e => setOAmount(e.target.value)} style={{ ...inputStyle, width: 120 }} />
              <select value={oMethod} onChange={e => setOMethod(e.target.value)} style={inputStyle}>
                <option value="cash">Cash</option>
                <option value="venmo">Venmo</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
              <button onClick={addOutside} disabled={oSaving} style={addBtn}>{oSaving ? 'Adding…' : 'Add'}</button>
            </div>
          </div>

          <table className={sheet.table} style={{ marginTop: 16 }}>
            <tbody>
              <tr className={sheet.totalRow}>
                <td style={{ fontSize: 18 }}>Net to Last Mile Food Rescue</td>
                <td className={sheet.right} style={{ fontSize: 18, color: net >= 0 ? 'var(--success, #137a4b)' : '#C0392B' }}>${net.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = { height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--fg)' }
const addBtn: CSSProperties = { height: 38, padding: '0 16px', border: 'none', borderRadius: 8, background: 'var(--psu-navy)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
const delBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14 }
