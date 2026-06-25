'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type Row = {
  id: string;
  name: string;
  paid: boolean;
  method: string | null;
  captain: string;
  email: string;
  startHole: number | null;
};

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [teamsRes, playersRes, groupsRes, regsRes] = await Promise.all([
      supabase.from('team').select('id, name, payment_status, group_id, created_at').eq('event_id', EVENT_ID).order('created_at'),
      supabase.from('player').select('team_id, name, email'),
      supabase.from('group').select('id, starting_hole'),
      // registration.payment_method (may be blocked by RLS for anon — handled gracefully)
      supabase.from('registration').select('team_id, payment_method'),
    ]);

    const teams = (teamsRes.data ?? []) as { id: string; name: string; payment_status: string; group_id: string | null }[];
    const players = (playersRes.data ?? []) as { team_id: string; name: string; email: string }[];
    const groups = (groupsRes.data ?? []) as { id: string; starting_hole: number }[];
    const regs = (regsRes.data ?? []) as { team_id: string; payment_method: string | null }[];

    setRows(
      teams.map((t) => {
        const first = players.find((p) => p.team_id === t.id);
        const grp = groups.find((g) => g.id === t.group_id);
        const reg = regs.find((r) => r.team_id === t.id);
        return {
          id: t.id,
          name: t.name,
          paid: t.payment_status === 'paid',
          method: reg?.payment_method ?? null,
          captain: first?.name ?? '—',
          email: first?.email ?? '—',
          startHole: grp?.starting_hole ?? null,
        };
      })
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePaid(id: string, paid: boolean) {
    setBusy(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, paid } : r)));
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('set_team_paid', { p_team_id: id, p_paid: paid });
    setBusy(null);
  }

  const paid = rows.filter((r) => r.paid).length;
  const unpaid = rows.length - paid;

  return (
    <div>
      <AdminTopBar title="Teams & registrations" />

      <div className={styles.page}>
        <div className={styles.summary}>
          <AdminPill tone="neutral">{rows.length} total</AdminPill>
          <AdminPill tone="paid">{paid} paid</AdminPill>
          {unpaid > 0 && <AdminPill tone="unpaid">{unpaid} unpaid</AdminPill>}
        </div>

        <AdminCard padding={0}>
          <div className={styles.tableHeader}>
            <div>Team</div>
            <div>Captain</div>
            <div className={styles.hideSmall}>Contact</div>
            <div>Payment</div>
            <div className={styles.hideSmall}>Start hole</div>
            <div />
          </div>

          {loading ? (
            <div className={styles.tableRow}>Loading teams…</div>
          ) : rows.length === 0 ? (
            <div className={styles.tableRow}>No teams registered yet.</div>
          ) : (
            rows.map((team, i) => (
              <div
                key={team.id}
                className={`${styles.tableRow} ${i === rows.length - 1 ? styles.tableRowLast : ''}`}
              >
                <div className={styles.teamName}>{team.name}</div>
                <div className={styles.teamCaptain}>{team.captain}</div>
                <div className={`${styles.teamContact} ${styles.hideSmall}`}>{team.email}</div>
                <div>
                  <AdminPill tone={team.paid ? 'paid' : 'unpaid'}>
                    {team.paid ? 'Paid' : team.method === 'venmo' ? 'Venmo · unpaid' : 'Unpaid'}
                  </AdminPill>
                </div>
                <div className={`${styles.startHole} ${styles.hideSmall}`}>
                  {team.startHole ?? '—'}
                </div>
                <div>
                  <Button
                    variant={team.paid ? 'ghost' : 'primary'}
                    size="sm"
                    onClick={() => togglePaid(team.id, !team.paid)}
                    disabled={busy === team.id}
                  >
                    {team.paid ? 'Mark unpaid' : 'Mark paid'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </AdminCard>
      </div>
    </div>
  );
}
