'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import { Icon } from '@/components/ui/Icon';
import styles from './page.module.css';

const GOAL = 10_000;
const LAST_YEAR = 6_200;
const TOTAL_SPOTS = 36;
const EVENT_DATE = new Date('2026-08-30');

type RecentTeam = { id: string; name: string; payment_status: string; created_at: string };
type Stats = {
  teamsRegistered: number;
  teamsPaid: number;
  teamsUnpaid: number;
  sponsorsCommitted: number;
  sponsorDollarsCommitted: number;
  grossRaised: number;
  daysOut: number;
};

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<RecentTeam[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const today = new Date();
    const daysOut = Math.max(0, Math.ceil((EVENT_DATE.getTime() - today.getTime()) / 86_400_000));

    Promise.all([
      supabase.from('team').select('id, name, payment_status, created_at').eq('event_id', EVENT_ID).order('created_at', { ascending: false }),
      supabase.from('sponsor').select('id, amount').eq('event_id', EVENT_ID).eq('active', true),
      supabase.from('registration').select('fee_amount, donation_amount'),
    ]).then(([teamsRes, sponsorsRes, regsRes]) => {
      const teams    = (teamsRes.data    ?? []) as { id: string; name: string; payment_status: string; created_at: string }[];
      const sponsors = (sponsorsRes.data ?? []) as { id: string; amount: number }[];
      const regs     = (regsRes.data     ?? []) as { fee_amount: number; donation_amount: number }[];

      const paid = teams.filter(t => t.payment_status === 'paid').length;
      const grossRaised = regs.reduce(
        (s, r) => s + (Number(r.fee_amount) || 0) + (Number(r.donation_amount) || 0), 0,
      );

      setStats({
        teamsRegistered: teams.length,
        teamsPaid: paid,
        teamsUnpaid: teams.length - paid,
        sponsorsCommitted: sponsors.length,
        sponsorDollarsCommitted: sponsors.reduce((s, sp) => s + (Number(sp.amount) || 0), 0),
        grossRaised,
        daysOut,
      });
      setRecent(teams.slice(0, 5));
    });
  }, []);

  if (!stats) {
    return (
      <div>
        <AdminTopBar title="Overview" />
        <div style={{ padding: 28, color: 'var(--fg-muted)', fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  const pct = Math.min(Math.round((stats.grossRaised / GOAL) * 100), 100);
  const ahead = stats.grossRaised - LAST_YEAR;
  const aheadPct = Math.round((ahead / LAST_YEAR) * 100);

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
        {/* ── Total raised hero ────────────────────────────────── */}
        <div className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroEyebrow}>Total raised for Last Mile Food Rescue</div>
            <div className={styles.heroAmount}>
              ${stats.grossRaised.toLocaleString()}
            </div>
            <div className={styles.heroBreakdown}>
              From {stats.teamsRegistered} registered team{stats.teamsRegistered !== 1 ? 's' : ''}
            </div>
          </div>
          <div className={styles.heroRight}>
            <p className={styles.heroContext}>
              Last year, we sent <strong>${LAST_YEAR.toLocaleString()}</strong> to LMFR.
              {ahead > 0 && (
                <> You&apos;re ahead by{' '}
                  <span className={styles.heroAhead}>+{aheadPct}%</span>.
                </>
              )}
            </p>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${pct}%` }} />
            </div>
            <div className={styles.progressLabels}>
              <span>2025 · ${LAST_YEAR.toLocaleString()}</span>
              <span>2026 goal · ${GOAL.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* ── Mini stats ────────────────────────────────────────── */}
        <div className={styles.statGrid}>
          <StatCard
            label="Teams registered"
            value={`${stats.teamsRegistered}/${TOTAL_SPOTS}`}
            sub={`${TOTAL_SPOTS - stats.teamsRegistered} spots left`}
          />
          <StatCard
            label="Teams paid"
            value={String(stats.teamsPaid)}
            sub={`${stats.teamsUnpaid} unpaid`}
            subTone={stats.teamsUnpaid > 0 ? 'warn' : 'ok'}
          />
          <StatCard
            label="Sponsors committed"
            value={String(stats.sponsorsCommitted)}
            sub={`$${stats.sponsorDollarsCommitted.toLocaleString()}`}
          />
          <StatCard
            label="Days out"
            value={String(stats.daysOut)}
            sub="Until Aug 30, 2026"
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
              {recent.length === 0 ? (
                <div className={styles.emptyRow}>No teams registered yet.</div>
              ) : (
                recent.map((team, i) => (
                  <div key={team.id} className={`${styles.teamRow} ${i === 0 ? styles.teamRowFirst : ''}`}>
                    <div className={styles.teamInfo}>
                      <div className={styles.teamName}>{team.name}</div>
                      <div className={styles.teamMeta}>
                        {new Date(team.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <AdminPill tone={team.payment_status === 'paid' ? 'paid' : 'unpaid'}>
                      {team.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                    </AdminPill>
                    <Link href="/admin/registrations">
                      <Button variant="ghost" size="sm">Edit</Button>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </AdminCard>

          {/* Quick links */}
          <AdminCard title="Quick links">
            <div className={styles.quickLinks}>
              <QuickLink href="/admin/registrations" icon="users"     label="Teams & registrations" />
              <QuickLink href="/admin/checkin"       icon="qr"        label="Check-in" />
              <QuickLink href="/admin/sponsors"      icon="tag"       label="Sponsors" />
              <QuickLink href="/admin/donors"        icon="tag"       label="Donors" />
              <QuickLink href="/admin/catalog"       icon="dollar"    label="Catalog" />
              <QuickLink href="/admin/announcements" icon="megaphone" label="Announcements" />
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function StatCard({
  label, value, sub, subTone,
}: {
  label: string; value: string; sub: string; subTone?: 'warn' | 'ok';
}) {
  const subColor =
    subTone === 'warn' ? 'var(--warning)' :
    subTone === 'ok'   ? 'var(--success)' :
    'var(--psu-beaver)';

  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub} style={{ color: subColor }}>{sub}</div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: Parameters<typeof Icon>[0]['name']; label: string }) {
  return (
    <Link href={href} className={styles.quickLink}>
      <Icon name={icon} size={16} color="var(--psu-beaver)" />
      <span>{label}</span>
    </Link>
  );
}
