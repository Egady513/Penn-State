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

// Tags that should never show in the game-day shop
const SKIP_TAGS = new Set(['base', 'hole_sponsor', 'hole_sponsor_discount', 'ctp', 'ld'])

export default function ShopPage() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [qtys, setQtys] = useState<Record<string, number>>({})
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
      const rows = (catRes.data as CatalogItem[] | null) ?? []
      setCatalog(rows.filter(i => !SKIP_TAGS.has(i.tag ?? '')))

      // Track which catalog items the team already has (paid) so we can
      // hide single-purchase items they've already bought.
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

  const selectedItems = catalog.filter(i => (qtys[i.id] ?? 0) > 0)
  const total = selectedItems.reduce((s, i) => s + i.price * (qtys[i.id] ?? 0), 0)

  async function handleBuy() {
    if (!selectedItems.length) return
    setBuying(true)
    setError('')

    const items = selectedItems.map(i => ({
      catalogItemId: i.id,
      name: i.name,
      price: i.price,
      quantity: qtys[i.id] ?? 1,
    }))

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

  const shopItems = catalog.filter(item => item.allow_multiple || !ownedIds.has(item.id))
  if (shopItems.length === 0) {
    return (
      <PlayerShell title="Buy add-ons" subtitle="Game day purchases" syncStatus="synced" liftBar>
        <div className={styles.empty}>
          <div className={styles.emptyTitle}>Nothing here yet</div>
          <div className={styles.emptySub}>Eddie will add items (raffle tickets, etc.) when they're available.</div>
        </div>
      </PlayerShell>
    )
  }

  return (
    <PlayerShell title="Buy add-ons" subtitle="Game day purchases · card only" syncStatus="synced" liftBar>
      <div className={styles.itemList}>
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

      {selectedItems.length > 0 && (
        <div className={styles.footer}>
          <div className={styles.orderSummary}>
            {selectedItems.map(i => (
              <div key={i.id} className={styles.summaryLine}>
                <span>{qtys[i.id] > 1 ? `${i.name} × ${qtys[i.id]}` : i.name}</span>
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
