import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_SPONSORS } from '@/lib/mockData';
import styles from './page.module.css';

export default function SponsorsPage() {
  const total = ADMIN_SPONSORS.reduce((s, sp) => s + sp.amount, 0);

  return (
    <div>
      <AdminTopBar
        title="Sponsors"
        action={
          <Button variant="primary" size="sm">
            <Icon name="plus" size={14} />
            Add sponsor
          </Button>
        }
      />

      <div className={styles.page}>
        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{ADMIN_SPONSORS.length}</span>
            <span className={styles.statLabel}>sponsors</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statNum}>${total.toLocaleString()}</span>
            <span className={styles.statLabel}>committed</span>
          </div>
        </div>

        <AdminCard padding={0}>
          <div className={styles.tableHeader}>
            <div>Sponsor</div>
            <div>Tier</div>
            <div>Amount</div>
            <div className={styles.hideSmall}>Hole</div>
            <div />
          </div>

          {ADMIN_SPONSORS.map((sp, i) => (
            <div
              key={sp.id}
              className={`${styles.tableRow} ${i === ADMIN_SPONSORS.length - 1 ? styles.tableRowLast : ''}`}
            >
              <div className={styles.sponsorName}>
                <div className={styles.logoThumb} />
                {sp.name}
              </div>
              <div>
                <AdminPill tone={sp.tier as 'eagle' | 'birdie' | 'par'}>
                  {sp.tier.toUpperCase()}
                </AdminPill>
              </div>
              <div className={styles.amount}>${sp.amount.toLocaleString()}</div>
              <div className={`${styles.hole} ${styles.hideSmall}`}>#{sp.hole}</div>
              <div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </div>
          ))}
        </AdminCard>
      </div>
    </div>
  );
}
