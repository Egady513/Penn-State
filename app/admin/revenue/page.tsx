'use client'

import { useEffect, useState, useCallback, type CSSProperties } from 'react'
import { createClient } from '@/lib/supabase/client'
import sheet from '@/components/admin/sheet.module.css'

type Cat = { count: number; dollars: number }
type Expense = { id: string; description: string; amount: number; category: string; created_at: string }
type Outside = { id: string; description: string; amount: number; method: string; created_at: string }
type Balance = { team_name: string; reg_unpaid: number; purchases_unpaid: number; mulligans_unpaid: number }
type CardVol = { volume: number; registrations: number; purchases: number }

// Stripe's standard rate. Verified against the real dashboard on 2026-08-28:
// 2.9% x $7,813 + $0.30 x 35 charges = $237.08 against an actual $237.07.
const STRIPE_PCT = 0.029
const STRIPE_PER_CHARGE = 0.30

/** Every dollar figure on this page, always two decimals. */
const money = (n: number) =>
  Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// Income categories (everything except expenses), in display order.
const INCOME: [string, string][] = [
  ['registration', 'Registration fees'],
  ['donations', 'Donations'],
  ['fee_coverage', 'Processing fee covered by registrants'],
  ['challenge', 'LD & CTP Challenge'],
  ['raffles', 'Raffle tickets'],
  ['mulligans', 'Mulligans'],
  ['other_addons', 'Other add-ons'],
  ['hole_sponsorships', 'Hole sponsorships (bought at registration)'],
]

// Money that never went through the app. Sponsor dollars are typed in by
// hand on the Sponsors tab, so they belong here, not in the Stripe section.
const OUTSIDE_APP: [string, string][] = [
  ['sponsorships', 'Sponsorships recorded by hand'],
  ['outside', 'Checks, cash & Venmo'],
]

export default function RevenuePage() {
  const [cats, setCats] = useState<Record<string, Cat>>({})
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [outside, setOutside] = useState<Outside[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [cardVol, setCardVol] = useState<CardVol | null>(null)
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
    const [brRes, exRes, oiRes, tbRes, cvRes] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('revenue_breakdown'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('list_expenses'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('list_outside_income'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('team_balances'),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase.rpc as any)('card_volume'),
    ])
    const br = (brRes.data ?? []) as { category: string; item_count: number; dollars: number }[]
    const map: Record<string, Cat> = {}
    br.forEach(r => { map[r.category] = { count: Number(r.item_count) || 0, dollars: Number(r.dollars) || 0 } })
    setCats(map)
    setExpenses((exRes.data ?? []) as Expense[])
    // Migration may not have run yet — treat a missing table as empty.
    setOutside((oiRes?.error ? [] : (oiRes?.data ?? [])) as Outside[])
    setBalances((tbRes?.error ? [] : (tbRes?.data ?? [])) as Balance[])
    const cv = (cvRes?.error ? null : (cvRes?.data ?? null)) as CardVol[] | CardVol | null
    setCardVol(Array.isArray(cv) ? (cv[0] ?? null) : cv)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Everything charged through the app. This is what should line up with
  // Stripe, minus its fees and anything already paid out.
  const inAppTotal   = INCOME.reduce((s, [k]) => s + (cats[k]?.dollars ?? 0), 0)
  const outsideTotal = OUTSIDE_APP.reduce((s, [k]) => s + (cats[k]?.dollars ?? 0), 0)
  // Card fees are real money out. Estimated rather than logged, so it can
  // never be forgotten. If a fee expense IS logged by hand, that one wins
  // and this is suppressed, otherwise the same cost lands twice.
  const feeLogged = expenses.some(e => /stripe|processing fee|card fee|cc fee/i.test(e.description))
  // Prefer the value from revenue_breakdown so the play app and this page
  // can never disagree. Falls back to the local sum until that migration runs.
  const estimatedFee = feeLogged
    ? 0
    : (cats['card_fees']?.dollars ?? (cardVol
        ? Number(cardVol.volume) * STRIPE_PCT + Number(cardVol.registrations) * STRIPE_PER_CHARGE
        : 0))
  const loggedExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const expensesTotal = loggedExpenses + estimatedFee
  const gross = inAppTotal + outsideTotal
  const net   = gross - expensesTotal

  // Committed but not in hand: on-course tabs, unsettled mulligans, any
  // registration still unpaid. Deliberately NOT part of the total above.
  const owedRows = balances
    .map(b => ({
      name: b.team_name,
      owed: Number(b.reg_unpaid || 0) + Number(b.purchases_unpaid || 0) + Number(b.mulligans_unpaid || 0),
    }))
    .filter(b => b.owed > 0)
    .sort((a, b) => b.owed - a.owed)
  const owedTotal = owedRows.reduce((s2, b) => s2 + b.owed, 0)

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
            <strong>Collected through the app</strong> should equal Stripe&apos;s gross volume exactly,
            before Stripe takes its fees and before any payout. Anything settled at check-in for cash
            is tagged as cash and stays out of it.{' '}
            <strong>Card fees are estimated</strong> at Stripe&apos;s 2.9% + $0.30, which matched the real
            dashboard to a penny. For the exact figure, log an expense named &ldquo;Stripe fees&rdquo;
            (gross volume minus net volume) and the estimate steps aside.
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
              {/* 1 ── Collected through the app (ties to Stripe) */}
              <tr className={sheet.sectionRow}><td colSpan={3}>Collected through the app</td></tr>
              {INCOME.map(([k, label]) => (
                <tr key={k}>
                  <td className={sheet.indent}>{label}</td>
                  <td className={sheet.right}>{cats[k]?.count ?? 0}</td>
                  <td className={sheet.right}>${money(cats[k]?.dollars ?? 0)}</td>
                </tr>
              ))}
              <tr className={sheet.subtotalRow}>
                <td>Subtotal</td><td />
                <td className={sheet.right}>${money(inAppTotal)}</td>
              </tr>

              {/* 2 ── Collected outside Stripe */}
              <tr className={sheet.sectionRow}><td colSpan={3}>Collected outside Stripe</td></tr>
              {OUTSIDE_APP.map(([k, label]) => (
                <tr key={k}>
                  <td className={sheet.indent}>{label}</td>
                  <td className={sheet.right}>{cats[k]?.count ?? 0}</td>
                  <td className={sheet.right}>${money(cats[k]?.dollars ?? 0)}</td>
                </tr>
              ))}
              <tr className={sheet.subtotalRow}>
                <td>Subtotal</td><td />
                <td className={sheet.right}>${money(outsideTotal)}</td>
              </tr>

              {/* 3 ── Still to collect. Shown here, deliberately NOT in the total. */}
              <tr className={sheet.sectionRow}><td colSpan={3}>Still to collect</td></tr>
              {owedRows.length === 0 ? (
                <tr><td className={sheet.indent} colSpan={3} style={{ color: 'var(--fg-muted)' }}>Nothing outstanding.</td></tr>
              ) : owedRows.slice(0, 8).map(b => (
                <tr key={b.name}>
                  <td className={sheet.indent}>{b.name}</td><td />
                  <td className={sheet.right}>${money(b.owed)}</td>
                </tr>
              ))}
              {owedRows.length > 8 && (
                <tr>
                  <td className={sheet.indent} style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                    and {owedRows.length - 8} more &middot; see Check-in, &ldquo;Who owes&rdquo;
                  </td><td /><td />
                </tr>
              )}
              <tr className={sheet.subtotalRow}>
                <td>Subtotal <span style={{ fontWeight: 400, fontSize: 12 }}>&middot; not in the total below</span></td>
                <td className={sheet.right}>{owedRows.length}</td>
                <td className={sheet.right} style={{ color: owedTotal > 0 ? '#92400E' : undefined }}>${money(owedTotal)}</td>
              </tr>

              {/* 4 ── Expenses */}
              <tr className={sheet.sectionRow}><td colSpan={3}>Expenses</td></tr>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td className={sheet.indent}>{e.description}</td><td />
                  <td className={sheet.right}>&minus;${money(Number(e.amount) || 0)}</td>
                </tr>
              ))}
              {estimatedFee > 0 && (
                <tr>
                  <td className={sheet.indent}>
                    Card processing fees
                    <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}> &middot; estimated</span>
                  </td><td />
                  <td className={sheet.right}>&minus;${money(estimatedFee)}</td>
                </tr>
              )}
              <tr className={sheet.subtotalRow}>
                <td>Subtotal</td><td />
                <td className={sheet.right}>&minus;${money(expensesTotal)}</td>
              </tr>

              {/* 5 ── The only number that matters */}
              <tr className={sheet.totalRow}>
                <td>Total to Last Mile Food Rescue</td><td />
                <td className={sheet.right}>${money(net)}</td>
              </tr>
            </tbody>
          </table>

        <div className={sheet.group} style={{ marginTop: 28 }}>
            <div className={sheet.groupHead}>Add or remove an expense</div>
            <table className={sheet.table}>
              <tbody>
                {expenses.length === 0 && estimatedFee === 0 && <tr><td className={sheet.empty} colSpan={3}>No expenses logged yet.</td></tr>}
                {estimatedFee > 0 && (
                  <tr>
                    <td>
                      Card processing fees
                      <span style={{ color: 'var(--fg-muted)', fontSize: 12 }}>
                        {' '}· estimated · 2.9% of ${money(cardVol?.volume ?? 0)} plus $0.30 × {cardVol?.registrations ?? 0} charges
                      </span>
                    </td>
                    <td className={sheet.right}>−${money(estimatedFee)}</td>
                    <td className={sheet.right} style={{ width: 36 }} />
                  </tr>
                )}
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>{e.description}<span style={{ color: 'var(--fg-muted)', fontSize: 12 }}> · {e.category === 'greens_fees' ? 'Greens fees' : 'Other'}</span></td>
                    <td className={sheet.right}>−${money(Number(e.amount) || 0)}</td>
                    <td className={sheet.right} style={{ width: 36 }}>
                      <button className={sheet.noPrint} onClick={() => removeExpense(e.id)} style={delBtn} title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
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
            <h2 className={sheet.h2}>Add or remove outside money</h2>
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
                    <td className={sheet.right}>${money(Number(o.amount))}</td>
                    <td className={sheet.noPrint} style={{ width: 34, textAlign: 'right' }}>
                      <button
                        onClick={() => removeOutside(o.id)}
                        title="Remove"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14 }}
                      >✕</button>
                    </td>
                  </tr>
                ))}
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

        </>
      )}
    </div>
  )
}

const inputStyle: CSSProperties = { height: 38, padding: '0 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, fontFamily: 'var(--font-sans)', color: 'var(--fg)' }
const addBtn: CSSProperties = { height: 38, padding: '0 16px', border: 'none', borderRadius: 8, background: 'var(--psu-navy)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
const delBtn: CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-muted)', fontSize: 14 }
