import Link from 'next/link';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  ADMIN_MONEY,
  ADMIN_TEAMS,
  EVENT_FACTS,
} from '@/lib/mockData';
import styles from './page.module.css';

const TODOS = [
  { label: 'Confirm course w/ Beckett Ridge', done: true },
  { label: 'Order tournament gift bags (72)', done: true },
  { label: 'Chase 4 unpaid teams', done: false, hot: true },
  { label: 'Print hole signage for sponsors', done: false },
  { label: 'Send pre-event email (T-7 days)', done: false },
];

export default function AdminOverviewPage() {
  const m = ADMIN_MONEY;
  const pct = Math.round((m.netToLMFR / 10000) * 100);

  return (
    <div>
      <AdminTopBar
        title="Overview"
        action={
          <Link href="/admin/announcements">
            <Button variant="primary" size="sm">
              <Icon name="megaphone" size={14} />
              New announcement
            </Button>
          </Link>
        }
      />

      <div className={styles.page}>
        {/* ── Net-to-LMFR hero ─────────────────────────────────── */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroEyebrow}>Net to Last Mile Food Rescue</div>
            <div className={styles.heroAmount}>
              ${m.netToLMFR.toLocaleString()}
            </div>
            <div className={styles.heroBreakdown}>
              Gross ${m.grossRaised.toLocaleString()} · Expenses $
              {m.expenses.toLocaleString()}
            </div>
          </div>
          <div className={styles.heroRight}>
            <p className={styles.heroContext}>
              Last year, we sent <strong>$6,200</strong> to LMFR. You&apos;re
              already ahead by{' '}
              <span className={styles.heroAhead}>+36%</span>.
            </p>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
            <div className={styles.progressLabels}>
              <span>2025 · $6,200</span>
              <span>2026 goal · $10,000</span>
            </div>
          </div>
        </div>

        {/* ── Mini stats ────────────────────────────────────────── */}
        <div className={styles.statGrid}>
          <StatCard
            label="Teams registered"
            value={`${m.teamsRegistered}/36`}
            sub={`${36 - m.teamsRegistered} spots left`}
          />
          <StatCard
            label="Teams paid"
            value={String(m.teamsPaid)}
            sub={`${m.teamsUnpaid} unpaid`}
            subTone={m.teamsUnpaid > 0 ? 'warn' : 'ok'}
          />
          <StatCard
            label="Sponsors committed"
            value={String(m.sponsorsCommitted)}
            sub={`$${m.sponsorDollarsCommitted.toLocaleString()}`}
          />
          <StatCard
            label="Days out"
            value={String(EVENT_FACTS.daysOut)}
            sub={`Until ${EVENT_FACTS.date}`}
          />
        </div>

        {/* ── 2-col lower ───────────────────────────────────────── */}
        <div className={styles.lowerGrid}>
          {/* Recent registrations */}
          <AdminCard
            title="Recent registrations"
            action={
              <Link href="/admin/registrations">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            }
            padding={0}
          >
            <div>
              {ADMIN_TEAMS.slice(0, 5).map((team, i) => (
                <div key={team.id} className={`${styles.teamRow} ${i === 0 ? styles.teamRowFirst : ''}`}>
                  <div className={styles.teamInfo}>
                    <div className={styles.teamName}>{team.name}</div>
                    <div className={styles.teamMeta}>
                      {team.captain} · {team.email}
                    </div>
                  </div>
                  <AdminPill tone={team.paid ? 'paid' : 'unpaid'}>
                    {team.paid ? 'Paid' : 'Unpaid'}
                  </AdminPill>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              ))}
            </div>
          </AdminCard>

          {/* To-do list */}
          <AdminCard
            title="To-do"
            action={<Button variant="ghost" size="sm"><Icon name="plus" size={13} />Add</Button>}
          >
            <div className={styles.todoList}>
              {TODOS.map((item, i) => (
                <TodoRow key={i} {...item} />
              ))}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  subTone,
}: {
  label: string;
  value: string;
  sub: string;
  subTone?: 'warn' | 'ok';
}) {
  const subColor =
    subTone === 'warn'
      ? 'var(--warning)'
      : subTone === 'ok'
      ? 'var(--success)'
      : 'var(--psu-beaver)';

  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub} style={{ color: subColor }}>
        {sub}
      </div>
    </div>
  );
}

function TodoRow({
  label,
  done,
  hot,
}: {
  label: string;
  done: boolean;
  hot?: boolean;
}) {
  return (
    <div className={`${styles.todoRow} ${done ? styles.todoDone : ''}`}>
      <div className={`${styles.todoCheck} ${done ? styles.todoCheckDone : ''}`}>
        {done && <Icon name="check" size={13} color="#fff" />}
      </div>
      <span className={styles.todoLabel}>{label}</span>
      {hot && <AdminPill tone="unpaid">action</AdminPill>}
    </div>
  );
}
