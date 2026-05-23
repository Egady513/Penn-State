import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { FALLBACK_TEAM_ID } from '@/lib/eventId'

type OweItem = {
  id: string
  label: string
  total: number
  paid: boolean
  via?: string
}

export default async function OwePage() {
  const cookieStore = await cookies()
  const teamId = cookieStore.get('golf_team_id')?.value ?? FALLBACK_TEAM_ID

  const supabase = await createClient()

  type RegRow      = { fee_amount: number; payment_status: string; payment_method: string | null }
  type PurchaseRow = { id: string; amount: number; paid_status: string; payment_method: string | null; catalog_item: { name: string } | null; quantity: number }
  type MullRow     = { count: number }

  const [regRes, purchRes, mullRes] = await Promise.all([
    supabase
      .from('registration')
      .select('fee_amount, payment_status, payment_method')
      .eq('team_id', teamId)
      .maybeSingle(),
    supabase
      .from('purchase')
      .select('id, amount, paid_status, payment_method, catalog_item:catalog_item_id(name), quantity')
      .eq('team_id', teamId),
    supabase
      .from('mulligan')
      .select('count')
      .eq('team_id', teamId),
  ])

  const registration = regRes.data    as RegRow | null
  const purchases    = purchRes.data  as PurchaseRow[] | null
  const mulligans    = mullRes.data   as MullRow[] | null

  const items: OweItem[] = []

  // Registration line
  if (registration) {
    items.push({
      id: 'reg',
      label: `Registration · ${registration.fee_amount === 100 ? '1 golfer' : '2 golfers'}`,
      total: registration.fee_amount,
      paid: registration.payment_status === 'paid',
      via: registration.payment_method ?? undefined,
    })
  } else {
    // Fallback if no registration row (shouldn't happen with seed data)
    items.push({ id: 'reg', label: 'Registration · 2 golfers', total: 200, paid: true, via: 'Zeffy' })
  }

  // Mulligans line
  const mullTotal = mulligans?.reduce((a, m) => a + m.count, 0) ?? 0
  if (mullTotal > 0) {
    items.push({
      id: 'mull',
      label: `Mulligans · ${mullTotal} used`,
      total: mullTotal * 2,
      paid: false,
    })
  }

  // Purchase lines
  purchases?.forEach(p => {
    const itemName = (p.catalog_item as { name: string } | null)?.name ?? 'Add-on'
    items.push({
      id: p.id,
      label: p.quantity > 1 ? `${itemName} · ${p.quantity}` : itemName,
      total: p.amount,
      paid: p.paid_status === 'paid',
      via: p.payment_method ?? undefined,
    })
  })

  const unpaidTotal = items.filter(i => !i.paid).reduce((a, i) => a + i.total, 0)
  const paidTotal   = items.filter(i =>  i.paid).reduce((a, i) => a + i.total, 0)

  return (
    <PlayerShell
      title="What you owe"
      subtitle={unpaidTotal > 0 ? 'Settle at the tent' : 'All settled'}
      syncStatus="synced"
      liftBar
    >
      {/* Total due */}
      <div className={styles.totalCard}>
        <div className={styles.totalLabel}>Total due</div>
        <div
          className={`${styles.totalAmount} num`}
          style={{ color: unpaidTotal > 0 ? 'var(--score-bogey)' : 'var(--score-birdie)' }}
        >
          ${unpaidTotal}
        </div>
        <div className={styles.totalSub}>
          ${paidTotal} already paid · {items.length} line items
        </div>
        {unpaidTotal > 0 && (
          <div className={styles.settleNote}>
            Settle at the registration tent or with Eddie.
          </div>
        )}
      </div>

      {/* Line items */}
      <div className={styles.itemsSection}>
        <div className={styles.sectionLabel}>Line items</div>
        <div className={styles.itemsCard}>
          {items.map((it, i) => (
            <div key={it.id} className={`${styles.itemRow} ${i > 0 ? styles.itemRowBorder : ''}`}>
              <div className={styles.itemInfo}>
                <div className={styles.itemLabel}>{it.label}</div>
                {it.via && <div className={styles.itemVia}>via {it.via}</div>}
              </div>
              <Badge tone={it.paid ? 'paid' : 'unpaid'} size="sm">
                {it.paid ? <Icon name="check" size={11} /> : null}
                {it.paid ? 'Paid' : 'Unpaid'}
              </Badge>
              <div className={`${styles.itemAmount} num`}>${it.total}</div>
            </div>
          ))}
        </div>
      </div>
    </PlayerShell>
  )
}
