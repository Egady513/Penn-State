import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_TEAMS } from '@/lib/mockData';
import styles from './page.module.css';

export default function RegistrationsPage() {
  const paid = ADMIN_TEAMS.filter((t) => t.paid).length;
  const unpaid = ADMIN_TEAMS.filter((t) => !t.paid).length;

  return (
    <div>
      <AdminTopBar
        title="Teams & registrations"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm">
              <Icon name="search" size={14} />
              Search
            </Button>
            <Button variant="primary" size="sm">
              <Icon name="plus" size={14} />
              Add team
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {/* summary pills */}
        <div className={styles.summary}>
          <AdminPill tone="neutral">{ADMIN_TEAMS.length} total</AdminPill>
          <AdminPill tone="paid">{paid} paid</AdminPill>
          {unpaid > 0 && (
            <AdminPill tone="unpaid">{unpaid} unpaid</AdminPill>
          )}
        </div>

        <AdminCard padding={0}>
          {/* Header row */}
          <div className={styles.tableHeader}>
            <div>Team</div>
            <div>Captain</div>
            <div className={styles.hideSmall}>Contact</div>
            <div>Payment</div>
            <div className={styles.hideSmall}>Start hole</div>
            <div />
          </div>

          {ADMIN_TEAMS.map((team, i) => (
            <div
              key={team.id}
              className={`${styles.tableRow} ${i === ADMIN_TEAMS.length - 1 ? styles.tableRowLast : ''}`}
            >
              <div className={styles.teamName}>{team.name}</div>
              <div className={styles.teamCaptain}>{team.captain}</div>
              <div className={`${styles.teamContact} ${styles.hideSmall}`}>
                {team.email}
              </div>
              <div>
                <AdminPill tone={team.paid ? 'paid' : 'unpaid'}>
                  {team.paid ? 'Paid' : 'Unpaid'}
                </AdminPill>
              </div>
              <div className={`${styles.startHole} ${styles.hideSmall}`}>
                {team.startHole}
              </div>
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
