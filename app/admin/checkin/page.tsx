'use client'

import { useEffect, useState } from 'react'
import styles from './page.module.css'
import { Search, Check } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'
import { SINGLE_CONTEST_PRICE } from '@/lib/contestPricing'

type Golfer   = { id: string; name: string; arrived: boolean; dietary: string | null }
// `amount` is the PER-UNIT price. Always multiply by `quantity` for money —
// dropping it silently undercharged multi-quantity items at the check-in tent.
type Purchase = { id: string; label: string; amount: number; quantity: number; paid: boolean; catalogItemId: string; tag: string | null; playerId: string | null; playerName: string | null }
type Team = { id: string; name: string; pin: string; paid: boolean; startHole: number | null; pairing: string | null; golfers: Golfer[]; purchases: Purchase[]; mulligans: { unpaid: number; paid: number }; challengeNames: string[]; raffleItems: { name: string; qty: number; tickets: number | null }[] }
type CatalogItem = { id: string; name: string; price: number; tag: string | null; allow_multiple: boolean; per_person: boolean }

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
  const [busyChallenge, setBusyChallenge] = useState<string | null>(null)
  const [addForPlayer, setAddForPlayer] = useState('')
  const [busySettle, setBusySettle] = useState<string | null>(null)
  const [busyDelete, setBusyDelete] = useState<string | null>(null)
  const [owesOnly, setOwesOnly] = useState(false)
  const [actionError, setActionError] = useState('')

  async function load() {
    const supabase = createClient()
    const [teamsRes, playersRes, purchasesRes, catalogRes, mullRes] = await Promise.all([
      supabase.from('team').select('id, name, pin, payment_status, start_hole, pairing').eq('event_id', EVENT_ID).order('name'),
      supabase.from('player').select('id, team_id, name, arrived_at, dietary_notes'),
      supabase.from('purchase').select('id, team_id, amount, paid_status, catalog_item_id, player_id, quantity'),
      supabase.from('catalog_item').select('id, name, price, tag, allow_multiple, per_person').eq('event_id', EVENT_ID).eq('active', true).order('name'),
      supabase.from('mulligan').select('team_id, count, paid'),
    ])

    const rawTeams     = (teamsRes.data    ?? []) as { id: string; name: string; pin: string; payment_status: string; start_hole: number | null; pairing: string | null }[]
    const rawPlayers   = (playersRes.data  ?? []) as { id: string; team_id: string; name: string; arrived_at: string | null; dietary_notes: string | null }[]
    const rawPurchases = (purchasesRes.data ?? []) as { id: string; team_id: string; amount: number; paid_status: string; catalog_item_id: string; player_id: string | null; quantity: number }[]
    const rawCatalog   = (catalogRes.data  ?? []) as (CatalogItem & { tag: string | null })[]
    const rawMulls     = (mullRes.error ? [] : (mullRes.data ?? [])) as { team_id: string; count: number; paid: boolean }[]

    const catalogById: Record<string, string> = {}
    const tagById: Record<string, string | null> = {}
    rawCatalog.forEach(c => { catalogById[c.id] = c.name; tagById[c.id] = c.tag ?? null })

    const ctpLdIds  = new Set(rawCatalog.filter(c => c.tag === 'ctp' || c.tag === 'ld').map(c => c.id))
    const raffleIds = new Set(rawCatalog.filter(c => c.name.toLowerCase().includes('raffle')).map(c => c.id))

    setTeams(rawTeams.map(t => {
      const teamMulls = rawMulls.filter(m => m.team_id === t.id)
      return {
        id: t.id,
        name: t.name,
        pin: t.pin,
        paid: t.payment_status === 'paid',
        startHole: t.start_hole ?? null,
        pairing: t.pairing?.trim() || null,
        golfers: rawPlayers.filter(p => p.team_id === t.id).map(p => ({
          id: p.id, name: p.name, arrived: !!p.arrived_at,
          dietary: p.dietary_notes && p.dietary_notes.trim().toLowerCase() !== 'none'
            ? p.dietary_notes.trim() : null,
        })),
        purchases: rawPurchases.filter(p => p.team_id === t.id).map(p => ({
          id: p.id,
          label: catalogById[p.catalog_item_id] ?? 'Item',
          amount: Number(p.amount),
          quantity: Number(p.quantity) || 1,
          paid: p.paid_status === 'paid',
          catalogItemId: p.catalog_item_id,
          tag: tagById[p.catalog_item_id] ?? null,
          playerId: p.player_id,
          playerName: p.player_id ? (rawPlayers.find(x => x.id === p.player_id)?.name ?? null) : null,
        })),
        mulligans: {
          unpaid: teamMulls.filter(m => !m.paid).reduce((s, m) => s + m.count, 0),
          paid:   teamMulls.filter(m =>  m.paid).reduce((s, m) => s + m.count, 0),
        },
        challengeNames: (() => {
          const challengePurchases = rawPurchases.filter(p => p.team_id === t.id && ctpLdIds.has(p.catalog_item_id) && p.paid_status === 'paid')
          const uniquePlayerIds = [...new Set(challengePurchases.map(p => p.player_id).filter(Boolean) as string[])]
          if (uniquePlayerIds.length > 0) return uniquePlayerIds.map(pid => rawPlayers.find(p => p.id === pid)?.name ?? 'Unknown')
          return challengePurchases.length > 0 ? ['Whole team'] : []
        })(),
        raffleItems: rawPurchases
          .filter(p => p.team_id === t.id && raffleIds.has(p.catalog_item_id) && p.paid_status === 'paid')
          .map(p => {
            const name = catalogById[p.catalog_item_id] ?? 'Raffle tickets'
            const qty = Number(p.quantity) || 1
            // Tickets are sold in bundles ("10 Raffle Tickets"), so the real
            // number to hand over is the bundle size × how many were bought.
            const perBundle = Number(name.match(/^\s*(\d+)/)?.[1] ?? NaN)
            return { name, qty, tickets: Number.isFinite(perBundle) ? perBundle * qty : null }
          }),
      }
    }))
    setCatalog(rawCatalog as CatalogItem[])
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
    // Marking paid at the tent means cash or Venmo. Stripe never saw it, so
    // recording the method keeps the Stripe figure on Revenue honest.
    const { error } = await (supabase.rpc as any)('set_purchase_paid_status', { p_purchase_id: purchaseId, p_paid: !paid, p_method: !paid ? 'cash' : null })
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

  /**
   * Cash or Venmo at the tent: settle everything at once. Marking five
   * separate lines paid one at a time is how a line backs up.
   */
  async function settleAll(team: Team) {
    setActionError('')
    setBusySettle(team.id)
    const supabase = createClient()
    for (const p of team.purchases.filter(x => !x.paid)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('set_purchase_paid_status', { p_purchase_id: p.id, p_paid: true, p_method: 'cash' })
      if (error) { setActionError(`Couldn't settle: ${error.message}`); setBusySettle(null); load(); return }
    }
    if (team.mulligans.unpaid > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)('mark_mulligans_paid', { p_team_id: team.id })
      if (error) { setActionError(`Couldn't settle mulligans: ${error.message}`); setBusySettle(null); load(); return }
    }
    setBusySettle(null)
    load()
  }

  /** Remove an add-on put on by mistake. A client DELETE is silently
   *  filtered by RLS, so this goes through a SECURITY DEFINER RPC. */
  async function removePurchase(purchaseId: string, label: string) {
    if (!confirm(`Remove "${label}" from this team's tab?`)) return
    setActionError('')
    setBusyDelete(purchaseId)
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('delete_purchase', { p_purchase_id: purchaseId })
    setBusyDelete(null)
    if (error) { setActionError(`Couldn't remove: ${error.message}`); return }
    load()
  }

  /**
   * One path for every add, contests included. The two contests are normal
   * catalog rows, so they belong in the same list with the same golfer
   * picker: the old shortcut buttons could not attribute to a golfer.
   *
   * Pricing is the only special case. One contest on its own costs more
   * than half the pair, so the bundle stays the better deal.
   */
  async function addItem(teamId: string) {
    if (!selectedItem) return
    setActionError('')
    const supabase = createClient()
    const ctp = catalog.find(c => c.tag === 'ctp')
    const ld  = catalog.find(c => c.tag === 'ld')
    const player = addForPlayer && addForPlayer !== 'ALL' ? addForPlayer : null
    const teamGolfers = teams.find(t => t.id === teamId)?.golfers ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insert = async (itemId: string, amount: number, who: string | null) => await (supabase.from('purchase') as any).insert({
      team_id: teamId, catalog_item_id: itemId, player_id: who,
      quantity: 1, amount, paid_status: 'unpaid', channel: 'check_in',
    })

    // "Both golfers" writes one row per golfer. Contests are per person, so a
    // single team-level row would only enter one of them.
    const targets: (string | null)[] = addForPlayer === 'ALL'
      ? teamGolfers.map(g => g.id)
      : [player]

    let error = null
    if (selectedItem === 'BUNDLE' && ctp && ld) {
      for (const who of targets) {
        ;({ error } = await insert(ctp.id, ctp.price, who))
        if (error) break
        ;({ error } = await insert(ld.id, ld.price, who))
        if (error) break
      }
    } else if (selectedItem === ctp?.id || selectedItem === ld?.id) {
      for (const who of targets) {
        ;({ error } = await insert(selectedItem, SINGLE_CONTEST_PRICE, who))
        if (error) break
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;({ error } = await (supabase.rpc as any)('add_checkin_purchase', {
        p_team_id: teamId, p_catalog_item_id: selectedItem, p_player_id: player,
      }))
    }
    if (error) { setActionError(`Couldn't add item: ${error.message}`); return }
    setAddingTo(null)
    setSelectedItem('')
    setAddForPlayer('')
    load()
  }

  async function addChallenge(teamId: string, type: 'individual' | 'team') {
    const ctpItem = catalog.find(c => c.tag === 'ctp')
    const ldItem  = catalog.find(c => c.tag === 'ld')
    if (!ctpItem || !ldItem) { setActionError('Challenge catalog items not found.'); return }
    setBusyChallenge(teamId)
    setActionError('')
    const supabase = createClient()
    const entries = type === 'team' ? 2 : 1
    for (let i = 0; i < entries; i++) {
      for (const item of [ctpItem, ldItem]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.rpc as any)('add_checkin_purchase', { p_team_id: teamId, p_catalog_item_id: item.id })
        if (error) { setActionError(`Couldn't add challenge: ${error.message}`); setBusyChallenge(null); return }
      }
    }
    setBusyChallenge(null)
    setAddingTo(null)
    load()
  }

  /**
   * Add ONE contest on its own (someone walks up to just the closest-to-pin
   * hole). Priced above half the bundle so buying both stays the better deal.
   * Inserted directly rather than through add_checkin_purchase, because that
   * RPC always charges the catalog price.
   */
  async function addSingleContest(teamId: string, tag: 'ctp' | 'ld') {
    const item = catalog.find(c => c.tag === tag)
    if (!item) { setActionError(`${tag.toUpperCase()} catalog item not found.`); return }
    setBusyChallenge(teamId)
    setActionError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('purchase') as any).insert({
      team_id: teamId,
      catalog_item_id: item.id,
      quantity: 1,
      amount: SINGLE_CONTEST_PRICE,
      paid_status: 'unpaid',
      channel: 'check_in',
    })
    setBusyChallenge(null)
    if (error) { setActionError(`Couldn't add entry: ${error.message}`); return }
    setAddingTo(null)
    load()
  }

  const q = query.toLowerCase()
  const owedBy = (t: Team) =>
    t.purchases.filter(p => !p.paid).reduce((s2, p) => s2 + p.amount * p.quantity, 0) + t.mulligans.unpaid * 2

  const filtered = teams.filter(t => (!owesOnly || owedBy(t) > 0)).filter(t =>
    !q || t.name.toLowerCase().includes(q) || t.pin.includes(q) ||
    (t.startHole != null && String(t.startHole).includes(q)) ||
    (t.pairing != null && t.pairing.toLowerCase() === q) ||
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

      <div className={styles.filterRow}>
        <button
          className={`${styles.filterChip} ${!owesOnly ? styles.filterChipOn : ''}`}
          onClick={() => setOwesOnly(false)}
        >
          All teams ({teams.length})
        </button>
        <button
          className={`${styles.filterChip} ${owesOnly ? styles.filterChipOn : ''}`}
          onClick={() => setOwesOnly(true)}
        >
          Who owes ({teams.filter(t => owedBy(t) > 0).length})
        </button>
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
          const allArrived = team.golfers.length > 0 && team.golfers.every(g => g.arrived)
          // amount is per-unit — must multiply by quantity or multi-buys undercharge.
          const lineTotal = (p: Purchase) => p.amount * p.quantity
          const purchaseOwed = team.purchases.filter(p => !p.paid).reduce((s, p) => s + lineTotal(p), 0)
          // CTP + LD are two halves of one challenge entry and confuse people as
          // separate rows — they get their own combined section below instead.
          const isChallenge = (p: Purchase) => p.tag === 'ctp' || p.tag === 'ld'
          const otherPurchases = team.purchases.filter(p => !isChallenge(p))
          const challengePurchases = team.purchases.filter(isChallenge)
          const challengeTotal = challengePurchases.reduce((s, p) => s + lineTotal(p), 0)
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
                    {team.startHole != null && <span>Hole {team.startHole} · </span>}
                    {team.pairing && <span>Group {team.pairing} · </span>}
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
                  {outstanding > 0 && (
                    <div className={styles.owesBox}>
                      <div className={styles.owesHead}>
                        <div className={styles.owesTitle}>Owes ${outstanding.toFixed(0)}</div>
                        <button
                          className={styles.settleAllBtn}
                          onClick={() => settleAll(team)}
                          disabled={busySettle === team.id}
                          title="Cash or Venmo: mark every open line paid"
                        >
                          {busySettle === team.id ? 'Settling…' : `Settle all $${outstanding.toFixed(0)}`}
                        </button>
                      </div>
                      <div className={styles.owesHint}>
                        Or they pay by card themselves in the app: Owe tab, PIN {team.pin}.
                      </div>
                      {team.purchases.filter(p => !p.paid).map(p => (
                        <div key={p.id} className={styles.owesRow}>
                          <span className={styles.owesLabel}>
                            {p.label}{p.quantity > 1 ? ` × ${p.quantity}` : ''}
                            {p.playerName && <span className={styles.forWho}> for {p.playerName}</span>}
                          </span>
                          <span className={styles.owesAmt}>${lineTotal(p).toFixed(0)}</span>
                          <button
                            className={styles.paidToggle}
                            onClick={() => togglePurchasePaid(team.id, p.id, p.paid)}
                            disabled={busyPurchase === p.id}
                          >
                            {busyPurchase === p.id ? '…' : 'Mark paid'}
                          </button>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removePurchase(p.id, p.label)}
                            disabled={busyDelete === p.id}
                            title="Remove this item"
                          >
                            {busyDelete === p.id ? '…' : '✕'}
                          </button>
                        </div>
                      ))}
                      {team.mulligans.unpaid > 0 && (
                        <div className={styles.owesRow}>
                          <span className={styles.owesLabel}>Mulligans ({team.mulligans.unpaid} used)</span>
                          <span className={styles.owesAmt}>${team.mulligans.unpaid * 2}</span>
                          <button
                            className={styles.paidToggle}
                            onClick={() => markMulligansPaid(team.id)}
                            disabled={busyMulls === team.id}
                          >
                            {busyMulls === team.id ? '…' : 'Mark paid'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

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
                        <span className={styles.golferName}>
                          {g.name}
                          {g.dietary && <span className={styles.dietaryTag}>{g.dietary}</span>}
                        </span>
                        <span className={styles.golferStatus}>{g.arrived ? 'Arrived' : 'Not here yet'}</span>
                      </div>
                    ))}
                  </div>

                  {(() => {
                    const partners = team.pairing
                      ? teams.filter(t => t.pairing === team.pairing && t.id !== team.id)
                      : []
                    if (!team.pairing) return (
                      <div className={styles.pairBox}>
                        <span className={styles.pairLabel}>Group</span>
                        <span className={styles.pairNone}>Not assigned yet</span>
                      </div>
                    )
                    return (
                      <div className={styles.pairBox}>
                        <span className={styles.pairLabel}>Group {team.pairing}</span>
                        {partners.length === 0 ? (
                          <span className={styles.pairNone}>Playing as a twosome</span>
                        ) : (
                          <span className={styles.pairWith}>
                            with {partners.map(pt =>
                              `${pt.name} (${pt.golfers.map(g => g.name).join(', ')})`
                            ).join(' · ')}
                          </span>
                        )}
                      </div>
                    )
                  })()}

                  {(() => {
                    // What they could still buy, with prices, without opening
                    // the add menu. This is the upsell list at the tent.
                    const purchasedIds = new Set(team.purchases.map(p => p.catalogItemId))
                    const notYet = catalog.filter(c =>
                      c.tag !== 'ctp' && c.tag !== 'ld' && c.tag !== 'base' &&
                      c.tag !== 'hole_sponsor' && c.tag !== 'hole_sponsor_discount' &&
                      !purchasedIds.has(c.id)
                    )
                    const hasChallenge = team.purchases.some(isChallenge)
                    if (notYet.length === 0 && hasChallenge) return null
                    return (
                      <div className={styles.addons}>
                        <div className={styles.addonsLabel}>Not purchased yet</div>
                        {!hasChallenge && (
                          <div className={styles.notYetRow}>
                            <span>LD &amp; CTP Challenge</span>
                            <span className={styles.notYetPrice}>
                              ${SINGLE_CONTEST_PRICE} one · $
                              {(catalog.find(c => c.tag === 'ctp')?.price ?? 0) + (catalog.find(c => c.tag === 'ld')?.price ?? 0)} both
                            </span>
                          </div>
                        )}
                        {notYet.map(c => (
                          <div key={c.id} className={styles.notYetRow}>
                            <span>{c.name}</span>
                            <span className={styles.notYetPrice}>${c.price}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}

                  {otherPurchases.length > 0 && (
                    <div className={styles.addons}>
                      <div className={styles.addonsLabel}>Add-ons &amp; purchases</div>
                      {otherPurchases.map(p => (
                        <div key={p.id} className={styles.addonRow}>
                          <span>
                            {p.label}{p.quantity > 1 ? ` × ${p.quantity}` : ''}
                            {p.playerName && <span className={styles.forWho}> for {p.playerName}</span>}
                          </span>
                          <span className={styles.addonPrice}>${lineTotal(p).toFixed(0)}</span>
                          <button
                            className={`${styles.paidToggle} ${p.paid ? styles.paidToggleOn : ''}`}
                            onClick={() => togglePurchasePaid(team.id, p.id, p.paid)}
                            disabled={busyPurchase === p.id}
                          >
                            {p.paid ? 'Paid ✓' : 'Mark paid'}
                          </button>
                          <button
                            className={styles.removeBtn}
                            onClick={() => removePurchase(p.id, p.label)}
                            disabled={busyDelete === p.id}
                            title="Remove this item"
                          >
                            {busyDelete === p.id ? '…' : '✕'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {team.challengeNames.length > 0 && (
                    <div className={styles.addons}>
                      <div className={styles.addonsLabel}>
                        LD &amp; CTP Challenge{challengeTotal > 0 ? ` · $${challengeTotal.toFixed(0)} — enters both contests` : ''}
                      </div>
                      {team.challengeNames.map((name, i) => (
                        <div key={i} className={styles.golferRow}>
                          <span className={styles.golferName} style={{ fontSize: 14 }}>{name}</span>
                          <span className={styles.golferStatus} style={{ color: 'var(--success)', fontWeight: 600 }}>Entered ✓</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {team.raffleItems.length > 0 && (
                    <div className={styles.addons}>
                      <div className={styles.addonsLabel}>
                        Raffle Tickets · Give to {team.golfers[0]?.name ?? 'primary contact'}
                      </div>
                      {team.raffleItems.map((r, i) => (
                        <div key={i} className={styles.addonRow}>
                          <span>{r.tickets != null ? `${r.tickets} tickets` : r.name}{r.qty > 1 ? ` (${r.name} × ${r.qty})` : ''}</span>
                          <span className={styles.addonPrice} style={{ color: 'var(--success)', fontWeight: 600, marginLeft: 'auto' }}>Paid ✓</span>
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
                    <div>
                      {/* Regular items — CTP/LD excluded; already-bought single-buy items hidden */}
                      {(() => {
                        const purchasedIds = new Set(team.purchases.map(p => p.catalogItemId))
                        const ctp = catalog.find(c => c.tag === 'ctp')
                        const ld  = catalog.find(c => c.tag === 'ld')
                        const bundlePrice = (ctp?.price ?? 0) + (ld?.price ?? 0)
                        // The contests are ordinary rows now, listed first because
                        // they are the most common tent sale.
                        // NEVER hide a per-person contest because the TEAM already
                        // bought one. Closest-to-pin and long drive are per golfer:
                        // hiding on a team-level purchasedIds check meant that once
                        // one golfer entered, the second could not be added at all.
                        // That broke check-in on event day. These stay listed always.
                        const contestOpts: { value: string; label: string }[] = []
                        if (ctp && ld) {
                          contestOpts.push({ value: 'BUNDLE', label: `Closest to Pin + Long Drive · $${bundlePrice}` })
                          contestOpts.push({ value: ctp.id, label: `Closest to Pin only · $${SINGLE_CONTEST_PRICE}` })
                          contestOpts.push({ value: ld.id,  label: `Long Drive only · $${SINGLE_CONTEST_PRICE}` })
                        }
                        const available = catalog.filter(c =>
                          c.tag !== 'ctp' && c.tag !== 'ld' &&
                          (c.allow_multiple || !purchasedIds.has(c.id))
                        )
                        return (
                        <div className={styles.addItemRow}>
                          {(selectedItem === 'BUNDLE' || catalog.find(c => c.id === selectedItem)?.per_person) ? (
                            <select
                              className={styles.addItemSelect}
                              value={addForPlayer}
                              onChange={e => setAddForPlayer(e.target.value)}
                              title="Per-golfer item: charge it to one of them, or the whole team"
                            >
                                <option value="">Whole team</option>
                              {team.golfers.length > 1 && <option value="ALL">Both golfers</option>}
                              {team.golfers.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          ) : null}
                          <select
                            className={styles.addItemSelect}
                            value={selectedItem}
                            onChange={e => {
                              setSelectedItem(e.target.value)
                              const it = catalog.find(c => c.id === e.target.value)
                              if (e.target.value !== 'BUNDLE' && !it?.per_person) setAddForPlayer('')
                            }}
                            autoFocus
                          >
                            <option value="">
                              {available.length === 0 && contestOpts.length === 0 ? '— Nothing left to add —' : '— Add item —'}
                            </option>
                            {contestOpts.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                            {available.map(c => (
                              <option key={c.id} value={c.id}>{c.name} · ${c.price}</option>
                            ))}
                          </select>
                        <button className={styles.addBtn} onClick={() => addItem(team.id)} disabled={!selectedItem}>Add</button>
                        <button className={styles.cancelAddBtn} onClick={() => { setAddingTo(null); setSelectedItem(''); }}>Cancel</button>
                      </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <button className={styles.addItemTrigger} onClick={() => { setAddingTo(team.id); setSelectedItem(''); setAddForPlayer(''); }}>
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
