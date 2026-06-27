'use client'

import { useState, useEffect } from 'react'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { createClient } from '@/lib/supabase/client'
import { getTeamId } from '@/lib/getTeamId'
import { EVENT_ID } from '@/lib/eventId'
import { createGameDayCheckout } from '@/app/actions/game-day-checkout'
import { Loader2 } from 'lucide-react'

type CatalogItem = {
  id: string
  name: string
  price: number
  description: string | null
  allow_multiple: boolean
  tag: string | null
}

// Tags handled specially (ctp/ld → the combined challenge card) or hidden.
const SKIP_TAGS = new Set(['base', 'hole_sponsor', 'hole_sponsor_discount', 'ctp', 'ld'])

type Challenge = 'individual' | 'team' | null

export default function ShopPage() {
  const [allItems, setAllItems] = useState<CatalogItem[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [challenge, setChallenge] = useState<Challenge>(null)
  const [loaded, setLoaded] = useState(false)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState('')

  const teamId = getTeamId()
  const supabase = createClient()

  useEffect(() => {
    Promise.all([
      supabase
        .from('catalog_item')
        .select('id, name, price, description, allow_multiple, tag')
        .eq('event_id', EVENT_ID)
        .eq('active', true)
        .order('sort_order'),
      supabase
        .from('purchase')
        .select('catalog_item_id')
        .eq('team_id', teamId)
        .eq('paid_status', 'paid'),
    ]).then(([catRes, purchRes]) => {
      setAllItems((catRes.data as CatalogItem[] | null) ?? [])
      const ids = new Set((purchRes.data ?? []).map((p: { catalog_item_id: string }) => p.catalog_item_id))
      setOwnedIds(ids)
      setLoaded(true)
    })
  }, [])

  function setQty(id: string, qty: number) {
    const clamped = Math.max(0, Math.min(99, Math.floor(qty)))
    setQtys(prev => {
      const next = { ...prev }
      if (clamped === 0) delete next[id]
      else next[id] = clamped
      return next
    })
  }

  // ── LD + CTP challenge (same combined format as the registration page) ──
  const ctpItem = allItems.find(i => i.tag === 'ctp')
  const ldItem = allItems.find(i => i.tag === 'ld')
  const challengeAvailable = !!ctpItem && !!ldItem
  const alreadyEntered =
    (!!ctpItem && ownedIds.has(ctpItem.id)) || (!!ldItem && ownedIds.has(ldItem.id))
  const challengeUnit = (ctpItem?.price ?? 0) + (ldItem?.price ?? 0)
  const challengePrices = { individual: challengeUnit, team: challengeUnit * 2 }
  const challengeTotal = challenge ? challengePrices[challenge] : 0

  // ── Regular add-ons (exclude special tags + single-buys already owned) ──
  const shopItems = allItems
    .filter(i => !SKIP_TAGS.has(i.tag ?? '') && (i.allow_multiple || !ownedIds.has(i.id)))
    .sort((a, b) => {
      const aR = a.name.toLowerCase().includes('raffle')
      const bR = b.name.toLowerCase().includes('raffle')
      if (aR && !bR) return 1
      if (!aR && bR) return -1
      return 0
    })
  const selectedItems = shopItems.filter(i => (qtys[i.id] ?? 0) > 0)
  const itemsTotal = selectedItems.reduce((s, i) => s + i.price * (qtys[i.id] ?? 0), 0)

  const total = itemsTotal + challengeTotal
  const hasSelection = selectedItems.length > 0 || challenge !== null

  async function handleBuy() {
    if (!hasSelection) return
    setBuying(true)
    setError('')

    const items = selectedItems.map(i => ({
      catalogItemId: i.id, name: i.name, price: i.price, quantity: qtys[i.id] ?? 1,
    }))

    // Challenge = CTP + LD entries. Individual = 1 of each, Team = 2 of each —
    // mirrors the registration page (one golfer vs both golfers).
    if (challenge && ctpItem && ldItem) {
      const q = challenge === 'team' ? 2 : 1
      items.push({ catalogItemId: ctpItem.id, name: ctpItem.name, price: ctpItem.price, quantity: q })
      items.push({ catalogItemId: ldItem.id, name: ldItem.name, price: ldItem.price, quantity: q })
    }

    const result = await createGameDayCheckout(teamId, items, window.location.origin)
    if (result.error || !result.url) {
      setError(result.error ?? 'Something went wrong. Please try again.')
      setBuying(false)
      return
    }
    window.location.href = result.url
  }

  if (!loaded) {
    return (
      <PlayerShell title="Buy add-ons" subtitle="Game day purchases" syncStatus="synced" liftBar>
        <div className={styles.loading}>Loading…</div>
      </PlayerShell>
    )
  }

  const nothingToSell = shopItems.length === 0 && !(challengeAvailable && !alreadyEntered)
  if (nothingToSell) {
    return (
      <PlayerShell title="Buy add-ons" subtitle="Game day purchases" syncStatus="synced" liftBar>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Nothing here yet</div>
          <div className={styles.emptySub}>Eddie will add items (raffle tickets, etc.) when they&apos;re available.</div>
        </div>
      </PlayerShell>
    )
  }

  return (
    <PlayerShell title="Buy add-ons" subtitle="Game day purchases · card only" syncStatus="synced" liftBar>
      <div className={styles.itemList}>
        {/* LD + CTP challenge — combined card, same as registration */}
        {challengeAvailable && (
          alreadyEntered ? (
            <div className={styles.enteredCard}>
              <div className={styles.enteredTitle}>You&apos;re in the LD &amp; CTP Challenge ✓</div>
              <div className={styles.enteredSub}>Your team is already entered in both contests.</div>
            </div>
          ) : (
            <div className={styles.challengeCard}>
              <div className={styles.challengeTitle}>Long-Drive &amp; Closest-to-Pin Challenge</div>
              <div className={styles.challengeDesc}>Pay once — you&apos;re entered in both contests.</div>
              <div className={styles.pillRow}>
                <button
                  type="button"
                  className={`${styles.pill} ${challenge === 'individual' ? styles.pillActive : ''}`}
                  onClick={() => setChallenge(c => (c === 'individual' ? null : 'individual'))}
                >
                  Individual <span className={styles.pillPrice}>${challengePrices.individual}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.pill} ${challenge === 'team' ? styles.pillActive : ''}`}
                  onClick={() => setChallenge(c => (c === 'team' ? null : 'team'))}
                >
                  Team <span className={styles.pillPrice}>${challengePrices.team}</span>
                </button>
              </div>
            </div>
          )
        )}

        {shopItems.map(item => {
          const qty = qtys[item.id] ?? 0
          const selected = qty > 0
          return (
            <div key={item.id} className={`${styles.itemCard} ${selected ? styles.itemCardOn : ''}`}>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{item.name}</div>
                {item.description && <div className={styles.itemDesc}>{item.description}</div>}
                <div className={styles.itemPrice}>${item.price}</div>
              </div>
              <div className={styles.itemActions}>
                {item.allow_multiple ? (
                  <div className={styles.stepper} role="group" aria-label={`${item.name} quantity`}>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => setQty(item.id, qty - 1)}
                      disabled={qty === 0}
                      aria-label="Decrease"
                    >−</button>
                    <span className={styles.stepNum}>{qty}</span>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => setQty(item.id, qty + 1)}
                      aria-label="Increase"
                    >+</button>
                  </div>
                ) : (
                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={e => setQty(item.id, e.target.checked ? 1 : 0)}
                    />
                    <span>{selected ? 'Added' : 'Add'}</span>
                  </label>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {hasSelection && (
        <div className={styles.footer}>
          <div className={styles.orderSummary}>
            {challenge && (
              <div className={styles.summaryLine}>
                <span>LD &amp; CTP Challenge ({challenge === 'individual' ? 'Individual' : 'Team'})</span>
                <span className={styles.summaryAmt}>${challengePrices[challenge]}</span>
              </div>
            )}
            {selectedItems.map(i => (
              <div key={i.id} className={styles.summaryLine}>
                <span>{(qtys[i.id] ?? 0) > 1 ? `${i.name} × ${qtys[i.id]}` : i.name}</span>
                <span className={styles.summaryAmt}>${i.price * (qtys[i.id] ?? 1)}</span>
              </div>
            ))}
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span>${total}</span>
            </div>
          </div>

          {error && <div className={styles.errorBar}>{error}</div>}

          <button
            className={styles.buyBtn}
            onClick={handleBuy}
            disabled={buying}
          >
            {buying
              ? <><Loader2 size={16} className={styles.spinner} /> Processing…</>
              : <>Pay ${total} with card</>}
          </button>
          <p className={styles.note}>Secure Stripe checkout — cards &amp; wallets accepted</p>
        </div>
      )}
    </PlayerShell>
  )
}
