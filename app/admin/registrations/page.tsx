'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { resendConfirmation } from '@/app/actions/resendConfirmation';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type PlayerInfo = { id: string; name: string; skill: string | null; email: string | null; dietary: string | null; phone: string | null };
type Row = {
  id: string;
  name: string;
  pin: string;
  paid: boolean;
  method: string | null;
  donation: number;
  players: PlayerInfo[];
  pairing: string;
  startHole: string;
  single_golfer: boolean;
  holeSponsorName: string | null;
};

export default function RegistrationsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

  async function deleteTeam(id: string, name: string) {
    if (!confirm(`Delete "${name}"?\n\nThis permanently removes the team, its golfers, and any purchases. Use this for abandoned / never-paid registrations. This cannot be undone.`)) return;
    setBusy(id);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('delete_team', { p_team_id: id });
    setBusy(null);
    if (error) { alert('Could not delete: ' + error.message); return; }
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  // Email inline edit
  const [editingEmail, setEditingEmail] = useState<string | null>(null); // player id
  const [emailDraft, setEmailDraft] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);

  // Resend confirmation email
  const [busyEmail, setBusyEmail] = useState<string | null>(null); // team id
  const [emailNote, setEmailNote] = useState<{ id: string; msg: string; ok: boolean } | null>(null);

  async function resendEmail(team: Row) {
    const recipients = team.players.filter((p) => p.email && p.email.includes('@'));
    if (recipients.length === 0) {
      setEmailNote({ id: team.id, msg: "No golfer emails on file — add one above first.", ok: false });
      return;
    }
    if (!confirm(`Resend the confirmation email (with team PIN) to:\n\n${recipients.map((p) => `• ${p.name}: ${p.email}`).join('\n')}`)) return;
    setBusyEmail(team.id);
    setEmailNote(null);
    const res = await resendConfirmation(team.id);
    setBusyEmail(null);
    if (res.ok) {
      setEmailNote({ id: team.id, msg: `Sent to ${res.count} golfer${res.count === 1 ? '' : 's'}.`, ok: true });
    } else {
      setEmailNote({ id: team.id, msg: `Couldn't send: ${res.error}`, ok: false });
    }
  }

  async function saveEmail(playerId: string) {
    setSavingEmail(true);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('set_player_email', { p_player_id: playerId, p_email: emailDraft.trim() });
    setSavingEmail(false);
    setEditingEmail(null);
    load();
  }

  // Pair solos modal
  const [pairModal, setPairModal] = useState(false);
  const [pairA, setPairA] = useState('');
  const [pairB, setPairB] = useState('');
  const [pairing, setPairing] = useState(false);
  const [pairError, setPairError] = useState('');

  async function load() {
    const supabase = createClient();
    const [teamsRes, playersRes, regsRes] = await Promise.all([
      supabase.from('team').select('id, name, pin, payment_status, start_hole, pairing, created_at, single_golfer, hole_sponsor_name').eq('event_id', EVENT_ID).order('created_at'),
      supabase.from('player').select('id, team_id, name, skill_level, email, dietary_notes, phone'),
      supabase.from('registration').select('team_id, payment_method, donation_amount'),
    ]);

    const teams = (teamsRes.data ?? []) as { id: string; name: string; pin: string; payment_status: string; start_hole: number | null; pairing: string | null; single_golfer: boolean; hole_sponsor_name: string | null }[];
    const players = (playersRes.data ?? []) as { id: string; team_id: string; name: string; skill_level: string | null; email: string | null; dietary_notes: string | null; phone: string | null }[];
    const regs = (regsRes.data ?? []) as { team_id: string; payment_method: string | null; donation_amount: number | null }[];

    setRows(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        pin: t.pin ?? '',
        paid: t.payment_status === 'paid',
        method: regs.find((r) => r.team_id === t.id)?.payment_method ?? null,
        donation: Number(regs.find((r) => r.team_id === t.id)?.donation_amount ?? 0),
        players: players.filter((p) => p.team_id === t.id).map((p) => ({ id: p.id, name: p.name, skill: p.skill_level, email: p.email ?? null, dietary: p.dietary_notes ?? null, phone: p.phone ?? null })),
        pairing: t.pairing ?? '',
        startHole: t.start_hole != null ? String(t.start_hole) : '',
        single_golfer: t.single_golfer ?? false,
        holeSponsorName: t.hole_sponsor_name ?? null,
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
  const visibleRows = rows.filter((r) => filter === 'all' || (filter === 'paid' ? r.paid : !r.paid));

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

        <div className={styles.filterRow}>
          {(['all', 'paid', 'unpaid'] as const).map((f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${filter === f ? styles.filterBtnOn : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'paid' ? 'Paid' : 'Unpaid'}
              {f === 'unpaid' && unpaid > 0 ? ` (${unpaid})` : ''}
            </button>
          ))}
        </div>

        <p className={styles.hint}>
          Type a <strong>Pairing</strong> label (e.g. A, B, 1) to group teams that play
          together, and a <strong>Hole</strong> if you have placements. Both save automatically.
        </p>

        <AdminCard padding={0}>
          {loading ? (
            <div className={styles.loadingRow}>Loading teams…</div>
          ) : visibleRows.length === 0 ? (
            <div className={styles.loadingRow}>{rows.length === 0 ? 'No teams registered yet.' : `No ${filter} teams.`}</div>
          ) : (
            visibleRows.map((team, i) => (
              <div key={team.id} className={`${styles.row} ${i === 0 ? styles.rowFirst : ''} ${team.single_golfer ? styles.rowSolo : ''}`}>
                {/* Team + both golfers */}
                <div className={styles.teamCol}>
                  <div className={styles.teamNameRow}>
                    <div className={styles.teamName}>{team.name}</div>
                    {team.single_golfer && <span className={styles.soloTag}>Solo</span>}
                  </div>
                  {team.players.map((p, j) => (
                    <div key={j} className={styles.golferBlock}>
                      <div className={styles.golfer}>
                        <span className={styles.golferName}>{p.name}</span>
                        {p.skill && <span className={styles.golferSkill}>{p.skill}</span>}
                      </div>
                      {editingEmail === p.id ? (
                        <div className={styles.emailEdit}>
                          <input
                            className={styles.emailInput}
                            value={emailDraft}
                            onChange={e => setEmailDraft(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEmail(p.id); if (e.key === 'Escape') setEditingEmail(null); }}
                            autoFocus
                          />
                          <button className={styles.emailSave} onClick={() => saveEmail(p.id)} disabled={savingEmail}>
                            {savingEmail ? '…' : 'Save'}
                          </button>
                          <button className={styles.emailCancel} onClick={() => setEditingEmail(null)}>✕</button>
                        </div>
                      ) : (
                        <div className={styles.emailRow}>
                          <span className={styles.emailText}>{p.email || <em>no email</em>}</span>
                          <button className={styles.emailEditBtn} title="Edit email" onClick={() => { setEditingEmail(p.id); setEmailDraft(p.email ?? ''); }}>✎</button>
                        </div>
                      )}
                      {p.phone && (
                        <div className={styles.phoneRow}>{j === 0 && <span className={styles.primaryTag}>Primary</span>}{p.phone}</div>
                      )}
                      {p.dietary && (
                        <div className={styles.dietaryTag} title="Dietary needs">🍽 {p.dietary}</div>
                      )}
                    </div>
                  ))}
                  {team.pin && (
                    <div className={styles.pinRow}>
                      PIN <span className={styles.pinCode}>{team.pin}</span>
                    </div>
                  )}
                  {team.holeSponsorName && (
                    <div className={styles.holeSponsorBadge} title="This team sponsored a hole">
                      ⛳ Hole sponsor: {team.holeSponsorName}
                    </div>
                  )}
                  {team.donation > 0 && (
                    <div className={styles.donationTag}>
                      +${team.donation} donation — thank them!
                    </div>
                  )}

                  <div className={styles.resendRow}>
                    <button
                      className={styles.resendBtn}
                      onClick={() => resendEmail(team)}
                      disabled={busyEmail === team.id}
                      title="Re-send the confirmation email + PIN to every golfer on this team"
                    >
                      {busyEmail === team.id ? 'Sending…' : '✉ Resend confirmation'}
                    </button>
                    {emailNote?.id === team.id && (
                      <span className={emailNote.ok ? styles.resendOk : styles.resendErr}>{emailNote.msg}</span>
                    )}
                  </div>
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
                  <button
                    className={styles.deleteTeamBtn}
                    title="Delete team"
                    onClick={() => deleteTeam(team.id, team.name)}
                    disabled={busy === team.id}
                  >
                    🗑
                  </button>
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
