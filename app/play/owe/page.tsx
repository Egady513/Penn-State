import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { requireTeamId } from '@/lib/requireTeamId'
import { SettleButton } from './SettleButton'

type OweItem = {
  id: string
  label: string
  total: number
  paid: boolean
  via?: string
}

export default async function OwePage() {
  const teamId = await requireTeamId()

  const supabase = await createClient()

  type RegRow      = { fee_amount: number; donation_amount: number | null; payment_status: string; payment_method: string | null }
  type PurchaseRow = { id: string; amount: number; paid_status: string; payment_method: string | null; catalog_item: { name: string } | null; quantity: number; player_id: string | null }
  type MullRow     = { count: number; paid: boolean }

  const [regRes, purchRes, mullRes, playerRes] = await Promise.all([
    supabase
      .from('registration')
      .select('fee_amount, donation_amount, payment_status, payment_method')
      .eq('team_id', teamId)
      .maybeSingle(),
    supabase
      .from('purchase')
      .select('id, amount, paid_status, payment_method, catalog_item:catalog_item_id(name), quantity, player_id')
      .eq('team_id', teamId),
    supabase
      .from('mulligan')
      .select('count, paid')
      .eq('team_id', teamId),
    // Names for per-golfer lines, so a team can see who ran up what and
    // square up between themselves at the end of the round.
    supabase
      .from('player')
      .select('id, name')
      .eq('team_id', teamId),
  ])

  const registration = regRes.data    as RegRow | null
  const purchases    = purchRes.data  as PurchaseRow[] | null
  // `paid` column may not exist before the migration runs — treat as unpaid.
  const mulligans    = (mullRes.error ? [] : (mullRes.data ?? [])).map(
    (m: { count: number; paid?: boolean }) => ({ count: m.count, paid: m.paid ?? false }),
  ) as MullRow[]

  const playerName = new Map(
    ((playerRes.data ?? []) as { id: string; name: string }[]).map(p => [p.id, p.name]),
  )

  const items: OweItem[] = []

  // Registration line (+ a separate donation line if they gave one). No
  // fabricated fallback — if there's no registration row, we show no line
  // rather than inventing a paid amount.
  if (registration) {
    const regPaid = registration.payment_status === 'paid'
    items.push({
      id: 'reg',
      label: `Registration · ${registration.fee_amount === 100 ? '1 golfer' : '2 golfers'}`,
      total: registration.fee_amount,
      paid: regPaid,
      via: registration.payment_method ?? undefined,
    })
    if ((registration.donation_amount ?? 0) > 0) {
      items.push({
        id: 'donation',
        label: 'Donation to Last Mile Food Rescue',
        total: Number(registration.donation_amount),
        paid: regPaid,
      })
    }
  }

  // Mulligan lines — split paid vs unpaid so a partial settlement reads right
  const unpaidMull = mulligans.filter(m => !m.paid).reduce((a, m) => a + m.count, 0)
  const paidMull   = mulligans.filter(m =>  m.paid).reduce((a, m) => a + m.count, 0)
  if (unpaidMull > 0) {
    items.push({ id: 'mull-u', label: `Mulligans · ${unpaidMull} used`, total: unpaidMull * 2, paid: false })
  }
  if (paidMull > 0) {
    items.push({ id: 'mull-p', label: `Mulligans · ${paidMull} used`, total: paidMull * 2, paid: true })
  }

  // Purchase lines
  purchases?.forEach(p => {
    const itemName = (p.catalog_item as { name: string } | null)?.name ?? 'Add-on'
    const who = p.player_id ? playerName.get(p.player_id) : null
    const base = p.quantity > 1 ? `${itemName} · ${p.quantity}` : itemName
    items.push({
      id: p.id,
      label: who ? `${base} · ${who}` : base,
      total: p.amount * (p.quantity || 1),
      paid: p.paid_status === 'paid',
      via: p.payment_method ?? undefined,
    })
  })

  const unpaidTotal = items.filter(i => !i.paid).reduce((a, i) => a + i.total, 0)
  const paidTotal   = items.filter(i =>  i.paid).reduce((a, i) => a + i.total, 0)

  return (
    <PlayerShell
      title="What you owe"
      subtitle={unpaidTotal > 0 ? 'Settle up at the end' : 'All settled'}
      syncStatus="synced"
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
          ${paidTotal} already paid · {items.length} line item{items.length === 1 ? '' : 's'}
        </div>
        {unpaidTotal > 0 && (
          <>
            <div className={styles.settleNote}>
              Pay now by card, or settle at the registration tent with Eddie.
            </div>
            <SettleButton teamId={teamId} amount={unpaidTotal} />
          </>
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
