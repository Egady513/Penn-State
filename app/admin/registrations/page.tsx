'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type PlayerInfo = { name: string; skill: string | null };
type Row = {
  id: string;
  name: string;
  paid: boolean;
  method: string | null;
  players: PlayerInfo[];
  pairing: string;
  startHole: string; // kept as string for the input
};

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const [teamsRes, playersRes, regsRes] = await Promise.all([
      supabase.from('team').select('id, name, payment_status, start_hole, pairing, created_at').eq('event_id', EVENT_ID).order('created_at'),
      supabase.from('player').select('team_id, name, skill_level'),
      supabase.from('registration').select('team_id, payment_method'),
    ]);

    const teams = (teamsRes.data ?? []) as { id: string; name: string; payment_status: string; start_hole: number | null; pairing: string | null }[];
    const players = (playersRes.data ?? []) as { team_id: string; name: string; skill_level: string | null }[];
    const regs = (regsRes.data ?? []) as { team_id: string; payment_method: string | null }[];

    setRows(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        paid: t.payment_status === 'paid',
        method: regs.find((r) => r.team_id === t.id)?.payment_method ?? null,
        players: players.filter((p) => p.team_id === t.id).map((p) => ({ name: p.name, skill: p.skill_level })),
        pairing: t.pairing ?? '',
        startHole: t.start_hole != null ? String(t.start_hole) : '',
      }))
    );
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const patch = (id: string, p: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function saveAssignment(row: Row) {
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('set_team_assignment', {
      p_team_id: row.id,
      p_start_hole: row.startHole ? Number(row.startHole) : null,
      p_pairing: row.pairing,
    });
  }

  async function togglePaid(id: string, paid: boolean) {
    setBusy(id);
    patch(id, { paid });
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

        <p className={styles.hint}>
          Type a <strong>Pairing</strong> label (e.g. A, B, 1) to group teams that play
          together, and a <strong>Hole</strong> if you have placements. Both save automatically.
        </p>

        <AdminCard padding={0}>
          {loading ? (
            <div className={styles.loadingRow}>Loading teams…</div>
          ) : rows.length === 0 ? (
            <div className={styles.loadingRow}>No teams registered yet.</div>
          ) : (
            rows.map((team, i) => (
              <div key={team.id} className={`${styles.row} ${i === 0 ? styles.rowFirst : ''}`}>
                {/* Team + both golfers */}
                <div className={styles.teamCol}>
                  <div className={styles.teamName}>{team.name}</div>
                  {team.players.map((p, j) => (
                    <div key={j} className={styles.golfer}>
                      <span className={styles.golferName}>{p.name}</span>
                      {p.skill && <span className={styles.golferSkill}>{p.skill}</span>}
                    </div>
                  ))}
                </div>

                {/* Pairing */}
                <label className={styles.fieldCol}>
                  <span className={styles.fieldLabel}>Pairing</span>
                  <input
                    className={styles.pairingInput}
                    value={team.pairing}
                    placeholder="—"
                    onChange={(e) => patch(team.id, { pairing: e.target.value })}
                    onBlur={() => saveAssignment({ ...team, pairing: team.pairing })}
                  />
                </label>

                {/* Start hole */}
                <label className={styles.fieldCol}>
                  <span className={styles.fieldLabel}>Hole</span>
                  <input
                    className={styles.holeInput}
                    type="number"
                    min={1}
                    max={18}
                    value={team.startHole}
                    placeholder="—"
                    onChange={(e) => patch(team.id, { startHole: e.target.value })}
                    onBlur={() => saveAssignment({ ...team, startHole: team.startHole })}
                  />
                </label>

                {/* Payment */}
                <div className={styles.payCol}>
                  <AdminPill tone={team.paid ? 'paid' : 'unpaid'}>
                    {team.paid ? 'Paid' : team.method === 'venmo' ? 'Venmo · unpaid' : 'Unpaid'}
                  </AdminPill>
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
