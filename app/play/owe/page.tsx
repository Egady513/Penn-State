import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { OWE_ITEMS } from '@/lib/mockData'

export default function OwePage() {
  const unpaidTotal = OWE_ITEMS.filter(i => !i.paid).reduce((a, i) => a + i.total, 0)
  const paidTotal = OWE_ITEMS.filter(i => i.paid).reduce((a, i) => a + i.total, 0)

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
          ${paidTotal} already paid · {OWE_ITEMS.length} line items
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
          {OWE_ITEMS.map((it, i) => (
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
