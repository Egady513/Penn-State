'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { Search, Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'

type Golfer   = { id: string; name: string; arrived: boolean }
type Purchase = { id: string; label: string; amount: number; paid: boolean }
type Team = { id: string; name: string; pin: string; paid: boolean; golfers: Golfer[]; purchases: Purchase[]; mulligans: { unpaid: number; paid: number } }
type CatalogItem = { id: string; name: string; price: number }

export default function CheckinPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState('')
  const [busyPurchase, setBusyPurchase] = useState<string | null>(null)
  const [busyMulls, setBusyMulls] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  async function load() {
    const supabase = createClient()
    const [teamsRes, playersRes, purchasesRes, catalogRes, mullRes] = await Promise.all([
      supabase.from('team').select('id, name, pin, payment_status').eq('event_id', EVENT_ID).order('name'),
      supabase.from('player').select('id, team_id, name, arrived_at'),
      supabase.from('purchase').select('id, team_id, amount, paid_status, catalog_item_id'),
      supabase.from('catalog_item').select('id, name, price').eq('event_id', EVENT_ID).eq('active', true).order('name'),
      supabase.from('mulligan').select('team_id, count, paid'),
    ])

    const rawTeams     = (teamsRes.data    ?? []) as { id: string; name: string; pin: string; payment_status: string }[]
    const rawPlayers   = (playersRes.data  ?? []) as { id: string; team_id: string; name: string; arrived_at: string | null }[]
    const rawPurchases = (purchasesRes.data ?? []) as { id: string; team_id: string; amount: number; paid_status: string; catalog_item_id: string }[]
    const rawCatalog   = (catalogRes.data  ?? []) as CatalogItem[]
    const rawMulls     = (mullRes.error ? [] : (mullRes.data ?? [])) as { team_id: string; count: number; paid: boolean }[]

    const catalogById: Record<string, string> = {}
    rawCatalog.forEach(c => { catalogById[c.id] = c.name })

    setTeams(rawTeams.map(t => {
      const teamMulls = rawMulls.filter(m => m.team_id === t.id)
      return {
        id: t.id,
        name: t.name,
        pin: t.pin,
        paid: t.payment_status === 'paid',
        golfers: rawPlayers.filter(p => p.team_id === t.id).map(p => ({
          id: p.id, name: p.name, arrived: !!p.arrived_at,
        })),
        purchases: rawPurchases.filter(p => p.team_id === t.id).map(p => ({
          id: p.id,
          label: catalogById[p.catalog_item_id] ?? 'Item',
          amount: Number(p.amount),
          paid: p.paid_status === 'paid',
        })),
        mulligans: {
          unpaid: teamMulls.filter(m => !m.paid).reduce((s, m) => s + m.count, 0),
          paid:   teamMulls.filter(m =>  m.paid).reduce((s, m) => s + m.count, 0),
        },
      }
    }))
    setCatalog(rawCatalog)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function toggleArrived(teamId: string, golferId: string, arrived: boolean) {
    setActionError('')
    setTeams(prev => prev.map(t =>
      t.id === teamId
        ? { ...t, golfers: t.golfers.map(g => g.id === golferId ? { ...g, arrived: !arrived } : g) }
        : t
    ))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('set_player_arrived', { p_player_id: golferId, p_arrived: !arrived })
    // On failure, re-load from the DB so the UI can't show a state that didn't save.
    if (error) { setActionError(`Couldn't update arrival: ${error.message}`); load() }
  }

  async function togglePurchasePaid(teamId: string, purchaseId: string, paid: boolean) {
    setActionError('')
    setBusyPurchase(purchaseId)
    setTeams(prev => prev.map(t =>
      t.id === teamId
        ? { ...t, purchases: t.purchases.map(p => p.id === purchaseId ? { ...p, paid: !paid } : p) }
        : t
    ))
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('set_purchase_paid_status', { p_purchase_id: purchaseId, p_paid: !paid })
    setBusyPurchase(null)
    if (error) { setActionError(`Couldn't update payment: ${error.message}`); load() }
  }

  async function markMulligansPaid(teamId: string) {
    setActionError('')
    setBusyMulls(teamId)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('mark_mulligans_paid', { p_team_id: teamId })
    setBusyMulls(null)
    if (error) { setActionError(`Couldn't mark mulligans paid: ${error.message}`); return }
    setTeams(prev => prev.map(t =>
      t.id === teamId
        ? { ...t, mulligans: { unpaid: 0, paid: t.mulligans.unpaid + t.mulligans.paid } }
        : t
    ))
  }

  async function addItem(teamId: string) {
    if (!selectedItem) return
    setActionError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('add_checkin_purchase', { p_team_id: teamId, p_catalog_item_id: selectedItem })
    if (error) { setActionError(`Couldn't add item: ${error.message}`); return }
    setAddingTo(null)
    setSelectedItem('')
    load()
  }

  const q = query.toLowerCase()
  const filtered = teams.filter(t =>
    !q || t.name.toLowerCase().includes(q) || t.pin.includes(q) ||
    t.golfers.some(g => g.name.toLowerCase().includes(q))
  )

  const checkedIn = teams.filter(t => t.golfers.length > 0 && t.golfers.every(g => g.arrived)).length

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Check-in</h1>
          <p className={styles.sub}>
            {loading ? 'Loading…' : `${checkedIn} of ${teams.length} teams fully arrived`}
          </p>
        </div>
      </div>

      {actionError && <div className={styles.actionError}>{actionError}</div>}

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
          const allArrived = team.golfers.length > 0 && team.golfers.every(g => g.arrived)
          const purchaseOwed = team.purchases.filter(p => !p.paid).reduce((s, p) => s + p.amount, 0)
          const mulliganOwed = team.mulligans.unpaid * 2
          const outstanding  = purchaseOwed + mulliganOwed
          const isOpen = expanded === team.id
          const isAdding = addingTo === team.id

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
                      <span className={styles.outstanding}> · ${outstanding.toFixed(0)} outstanding</span>
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
                          onClick={() => toggleArrived(team.id, g.id, g.arrived)}
                          aria-label={g.arrived ? 'Mark not arrived' : 'Mark arrived'}
                        >
                          <Check size={16} />
                        </button>
                        <span className={styles.golferName}>{g.name}</span>
                        <span className={styles.golferStatus}>{g.arrived ? 'Arrived' : 'Not here yet'}</span>
                      </div>
                    ))}
                  </div>

                  {team.purchases.length > 0 && (
                    <div className={styles.addons}>
                      <div className={styles.addonsLabel}>Add-ons &amp; purchases</div>
                      {team.purchases.map(p => (
                        <div key={p.id} className={styles.addonRow}>
                          <span>{p.label}</span>
                          <span className={styles.addonPrice}>${p.amount.toFixed(0)}</span>
                          <button
                            className={`${styles.paidToggle} ${p.paid ? styles.paidToggleOn : ''}`}
                            onClick={() => togglePurchasePaid(team.id, p.id, p.paid)}
                            disabled={busyPurchase === p.id}
                          >
                            {p.paid ? 'Paid ✓' : 'Mark paid'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {(team.mulligans.unpaid > 0 || team.mulligans.paid > 0) && (
                    <div className={styles.addons}>
                      <div className={styles.addonsLabel}>Mulligans</div>
                      <div className={styles.addonRow}>
                        <span>
                          {team.mulligans.unpaid > 0
                            ? `${team.mulligans.unpaid} used · $${team.mulligans.unpaid * 2} owed`
                            : `${team.mulligans.paid} used · all paid`}
                        </span>
                        {team.mulligans.unpaid > 0 && (
                          <>
                            <span className={styles.addonPrice}>${team.mulligans.unpaid * 2}</span>
                            <button
                              className={`${styles.paidToggle} ${busyMulls === team.id ? '' : ''}`}
                              onClick={() => markMulligansPaid(team.id)}
                              disabled={busyMulls === team.id}
                            >
                              {busyMulls === team.id ? 'Saving…' : 'Mark paid'}
                            </button>
                          </>
                        )}
                        {team.mulligans.unpaid === 0 && team.mulligans.paid > 0 && (
                          <span className={styles.paidToggleOn} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Paid ✓</span>
                        )}
                      </div>
                    </div>
                  )}

                  {outstanding > 0 && (
                    <div className={styles.outstandingRow}>
                      <span>Outstanding balance</span>
                      <span className={styles.outstandingAmt}>${outstanding.toFixed(0)}</span>
                    </div>
                  )}

                  {isAdding ? (
                    <div className={styles.addItemRow}>
                      <select
                        className={styles.addItemSelect}
                        value={selectedItem}
                        onChange={e => setSelectedItem(e.target.value)}
                        autoFocus
                      >
                        <option value="">— Select item —</option>
                        {catalog.map(c => (
                          <option key={c.id} value={c.id}>{c.name} · ${c.price}</option>
                        ))}
                      </select>
                      <button className={styles.addBtn} onClick={() => addItem(team.id)} disabled={!selectedItem}>Add</button>
                      <button className={styles.cancelAddBtn} onClick={() => { setAddingTo(null); setSelectedItem(''); }}>Cancel</button>
                    </div>
                  ) : (
                    <button className={styles.addItemTrigger} onClick={() => { setAddingTo(team.id); setSelectedItem(''); }}>
                      + Add item to tab
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!loading && filtered.length === 0 && (
          <div className={styles.empty}>
            {query ? `No teams match "${query}"` : 'No teams registered yet.'}
          </div>
        )}
      </div>
    </div>
  )
}
