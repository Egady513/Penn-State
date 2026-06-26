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
  pin: string;
  paid: boolean;
  method: string | null;
  players: PlayerInfo[];
  pairing: string;
  startHole: string;
  single_golfer: boolean;
};

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Pair solos modal
  const [pairModal, setPairModal] = useState(false);
  const [pairA, setPairA] = useState('');
  const [pairB, setPairB] = useState('');
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState('');

  async function load() {
    const supabase = createClient();
    const [teamsRes, playersRes, regsRes] = await Promise.all([
      supabase.from('team').select('id, name, pin, payment_status, start_hole, pairing, created_at, single_golfer').eq('event_id', EVENT_ID).order('created_at'),
      supabase.from('player').select('team_id, name, skill_level'),
      supabase.from('registration').select('team_id, payment_method'),
    ]);

    const teams = (teamsRes.data ?? []) as { id: string; name: string; pin: string; payment_status: string; start_hole: number | null; pairing: string | null; single_golfer: boolean }[];
    const players = (playersRes.data ?? []) as { team_id: string; name: string; skill_level: string | null }[];
    const regs = (regsRes.data ?? []) as { team_id: string; payment_method: string | null }[];

    setRows(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        pin: t.pin ?? '',
        paid: t.payment_status === 'paid',
        method: regs.find((r) => r.team_id === t.id)?.payment_method ?? null,
        players: players.filter((p) => p.team_id === t.id).map((p) => ({ name: p.name, skill: p.skill_level })),
        pairing: t.pairing ?? '',
        startHole: t.start_hole != null ? String(t.start_hole) : '',
        single_golfer: t.single_golfer ?? false,
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

  async function pairSolos() {
    if (!pairA || !pairB || pairA === pairB) { setPairError('Select two different solo golfers.'); return; }
    setPairing(true);
    setPairError('');
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('pair_solo_golfers', { p_team_a: pairA, p_team_b: pairB });
    if (error) { setPairError(error.message); setPairing(false); return; }
    setPairModal(false);
    setPairA('');
    setPairB('');
    setPairing(false);
    load();
  }

  const solos = rows.filter(r => r.single_golfer);
  const paid = rows.filter((r) => r.paid).length;
  const unpaid = rows.length - paid;

  return (
    <div>
      <AdminTopBar
        title="Teams & registrations"
        action={
          solos.length >= 2 ? (
            <Button variant="primary" size="sm" onClick={() => { setPairModal(true); setPairError(''); }}>
              Pair solo golfers ({solos.length})
            </Button>
          ) : solos.length === 1 ? (
            <span className={styles.soloWaiting}>1 solo waiting for a partner</span>
          ) : undefined
        }
      />

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
              <div key={team.id} className={`${styles.row} ${i === 0 ? styles.rowFirst : ''} ${team.single_golfer ? styles.rowSolo : ''}`}>
                {/* Team + both golfers */}
                <div className={styles.teamCol}>
                  <div className={styles.teamNameRow}>
                    <div className={styles.teamName}>{team.name}</div>
                    {team.single_golfer && <span className={styles.soloTag}>Solo</span>}
                  </div>
                  {team.players.map((p, j) => (
                    <div key={j} className={styles.golfer}>
                      <span className={styles.golferName}>{p.name}</span>
                      {p.skill && <span className={styles.golferSkill}>{p.skill}</span>}
                    </div>
                  ))}
                  {team.pin && (
                    <div className={styles.pinRow}>
                      PIN <span className={styles.pinCode}>{team.pin}</span>
                    </div>
                  )}
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

      {/* ── Pair solos modal ───────────────────────────────────── */}
      {pairModal && (
        <div className={styles.overlay} onClick={() => setPairModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Pair solo golfers</h2>
              <button className={styles.modalClose} onClick={() => setPairModal(false)}>✕</button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.modalDesc}>
                Pick two solo golfers to merge into one team. The first golfer&apos;s team name is kept.
                Both payments stay on record. This cannot be undone.
              </p>

              {pairError && <div className={styles.errorBar}>{pairError}</div>}

              <label className={styles.formLabel}>
                Golfer 1 (keeps this team name)
                <select
                  className={styles.formSelect}
                  value={pairA}
                  onChange={e => setPairA(e.target.value)}
                >
                  <option value="">Select…</option>
                  {solos.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.players[0]?.name ?? s.name} ({s.paid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.formLabel}>
                Golfer 2 (will be moved onto Golfer 1&apos;s team)
                <select
                  className={styles.formSelect}
                  value={pairB}
                  onChange={e => setPairB(e.target.value)}
                >
                  <option value="">Select…</option>
                  {solos.filter(s => s.id !== pairA).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.players[0]?.name ?? s.name} ({s.paid ? 'Paid' : 'Unpaid'})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" size="sm" onClick={() => setPairModal(false)}>Cancel</Button>
              <Button
                variant="primary"
                size="sm"
                onClick={pairSolos}
                disabled={!pairA || !pairB || pairing}
              >
                {pairing ? 'Pairing…' : 'Pair them together'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
