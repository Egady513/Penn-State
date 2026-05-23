import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_TEAMS, ADMIN_HOLES } from '@/lib/mockData';
import styles from './page.module.css';

export default function FoursomesPage() {
  const assignedCount = ADMIN_HOLES.filter((h) =>
    ADMIN_TEAMS.filter((t) => t.startHole === h.n).length >= 2
  ).length;

  return (
    <div>
      <AdminTopBar
        title="Foursome builder"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm">Auto-pair</Button>
            <Button variant="primary" size="sm">Save assignments</Button>
          </div>
        }
      />

      <div className={styles.page}>
        <p className={styles.hint}>
          Drag teams to a starting hole. Two teams per hole = one foursome.
          {' '}<strong>{assignedCount}/18</strong> holes filled.
        </p>

        <div className={styles.holeGrid}>
          {ADMIN_HOLES.map((hole) => {
            const assigned = ADMIN_TEAMS.filter((t) => t.startHole === hole.n);
            const full = assigned.length >= 2;

            return (
              <div
                key={hole.n}
                className={`${styles.holeCard} ${full ? styles.holeCardFull : ''}`}
              >
                <div className={styles.holeCardTop}>
                  <div className={styles.holeHeader}>
                    <div className={styles.holeNumber}>Hole {hole.n}</div>
                    <div className={styles.holePar}>Par {hole.par}</div>
                  </div>
                  {hole.contest && (
                    <AdminPill tone="par">
                      {hole.contest === 'ctp' ? 'CTP' : 'LD'}
                    </AdminPill>
                  )}
                </div>

                <div className={styles.teamSlots}>
                  {assigned.map((team) => (
                    <div key={team.id} className={styles.teamChip}>
                      <Icon name="users" size={12} color="var(--psu-beaver)" />
                      {team.name}
                    </div>
                  ))}
                  {assigned.length < 2 && (
                    <div className={styles.dropZone}>
                      Drop team here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
