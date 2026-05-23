import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_DONORS } from '@/lib/mockData';
import styles from './page.module.css';

export default function DonorsPage() {
  const total = ADMIN_DONORS.reduce((s, d) => s + d.value, 0);
  const avg = Math.round(total / ADMIN_DONORS.length);

  return (
    <div>
      <AdminTopBar
        title="Donors"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm">Export CSV</Button>
            <Button variant="primary" size="sm">
              <Icon name="plus" size={14} />
              Add donor
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {/* Stats row */}
        <div className={styles.statGrid}>
          <StatCard label="Donors" value={String(ADMIN_DONORS.length)} sub="Auction + raffle" />
          <StatCard label="Total value" value={`$${total.toLocaleString()}`} sub="In-kind gifts" ok />
          <StatCard label="Avg gift" value={`$${avg}`} sub="Per donor" />
        </div>

        <AdminCard padding={0}>
          <div className={styles.tableHeader}>
            <div>Donor</div>
            <div>Item</div>
            <div>Est. value</div>
            <div />
          </div>

          {ADMIN_DONORS.map((donor, i) => (
            <div
              key={donor.id}
              className={`${styles.tableRow} ${i === ADMIN_DONORS.length - 1 ? styles.tableRowLast : ''}`}
            >
              <div className={styles.donorName}>
                <span className={styles.bronzeDot} />
                {donor.name}
              </div>
              <div className={styles.donorItem}>{donor.item}</div>
              <div className={styles.donorValue}>${donor.value}</div>
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

function StatCard({
  label,
  value,
  sub,
  ok,
}: {
  label: string;
  value: string;
  sub: string;
  ok?: boolean;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div
        className={styles.statSub}
        style={{ color: ok ? 'var(--success)' : 'var(--psu-beaver)' }}
      >
        {sub}
      </div>
    </div>
  );
}
