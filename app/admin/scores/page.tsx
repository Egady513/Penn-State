'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type Row = {
  id: string;
  name: string;
  front: string;        // admin-entered, '' when unset
  back: string;
  appFront: number | null;  // computed from hole-by-hole app entries
  appBack: number | null;
  holesScored: number;
};

const FRONT = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

export default function ScoresPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [par, setPar] = useState(72);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const supabase = createClient();
    const [teamsRes, scoresRes, holesRes] = await Promise.all([
      supabase.from('team').select('id, name, front_nine, back_nine')
        .eq('event_id', EVENT_ID).eq('payment_status', 'paid').order('name'),
      supabase.from('score').select('team_id, hole_number, strokes'),
      supabase.from('hole').select('par').eq('event_id', EVENT_ID),
    ]);

    if (teamsRes.error) { setError(teamsRes.error.message); setLoading(false); return; }

    const teams = (teamsRes.data ?? []) as { id: string; name: string; front_nine: number | null; back_nine: number | null }[];
    const scores = (scoresRes.data ?? []) as { team_id: string; hole_number: number; strokes: number }[];
    const holes = (holesRes.data ?? []) as { par: number }[];
    if (holes.length) setPar(holes.reduce((s, h) => s + h.par, 0));

    setRows(teams.map(t => {
      const mine = scores.filter(s => s.team_id === t.id);
      const f = mine.filter(s => FRONT.has(s.hole_number));
      const b = mine.filter(s => !FRONT.has(s.hole_number));
      return {
        id: t.id,
        name: t.name,
        front: t.front_nine != null ? String(t.front_nine) : '',
        back:  t.back_nine  != null ? String(t.back_nine)  : '',
        appFront: f.length ? f.reduce((s, x) => s + x.strokes, 0) : null,
        appBack:  b.length ? b.reduce((s, x) => s + x.strokes, 0) : null,
        holesScored: mine.length,
      };
    }));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (id: string, p: Partial<Row>) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...p } : r)));

  async function save(row: Row) {
    setSavingId(row.id); setSavedId(null); setError('');
    const supabase = createClient();
    const toInt = (v: string) => (v.trim() === '' ? null : Number(v));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: e } = await (supabase.rpc as any)('save_team_nines', {
      p_team_id: row.id, p_front: toInt(row.front), p_back: toInt(row.back),
    });
    setSavingId(null);
    if (e) { setError(`Couldn't save ${row.name}: ${e.message}`); return; }
    setSavedId(row.id);
    setTimeout(() => setSavedId(id => (id === row.id ? null : id)), 1500);
  }

  // Admin-entered value wins; fall back to what the team logged in the app.
  const effFront = (r: Row) => (r.front.trim() !== '' ? Number(r.front) : r.appFront);
  const effBack  = (r: Row) => (r.back.trim()  !== '' ? Number(r.back)  : r.appBack);
  const total    = (r: Row) => {
    const f = effFront(r), b = effBack(r);
    if (f == null && b == null) return null;
    return (f ?? 0) + (b ?? 0);
  };
  const complete = (r: Row) => effFront(r) != null && effBack(r) != null;

  // Leaderboard: complete cards first, ranked low to high.
  const ranked = [...rows].sort((a, b) => {
    const ca = complete(a), cb = complete(b);
    if (ca !== cb) return ca ? -1 : 1;
    const ta = total(a), tb = total(b);
    if (ta == null && tb == null) return a.name.localeCompare(b.name);
    if (ta == null) return 1;
    if (tb == null) return -1;
    return ta - tb;
  });

  const finished = ranked.filter(complete);
  const winner = finished[0];

  return (
    <div>
      <AdminTopBar title={`Scores · par ${par}`} />
      <div className={styles.page}>
        <p className={styles.hint}>
          Teams that used the player app fill in automatically. For anyone who didn&apos;t,
          type their front and back nine totals — <strong>what you type always wins</strong> over
          the app value, so you can correct a card here. Saves when you click off the field.
        </p>

        {error && <div className={styles.errorBar}>{error}</div>}

        {winner && (
          <div className={styles.winnerBar}>
            🏆 Leader: <strong>{winner.name}</strong> · {total(winner)} ({fmtToPar(total(winner)!, par)})
            {finished.length > 1 && total(finished[1]) === total(winner) && ' — TIED, needs a card-off'}
          </div>
        )}

        <AdminCard padding={0}>
          {loading ? (
            <div className={styles.loadingRow}>Loading scores…</div>
          ) : rows.length === 0 ? (
            <div className={styles.loadingRow}>No paid teams yet.</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thRank}>#</th>
                  <th>Team</th>
                  <th className={styles.thNum}>Front</th>
                  <th className={styles.thNum}>Back</th>
                  <th className={styles.thNum}>Total</th>
                  <th className={styles.thNum}>To par</th>
                  <th className={styles.thStatus}></th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((r, i) => {
                  const t = total(r);
                  return (
                    <tr key={r.id} className={complete(r) ? '' : styles.rowPending}>
                      <td className={styles.tdRank}>{complete(r) ? i + 1 : '—'}</td>
                      <td className={styles.tdTeam}>
                        {r.name}
                        {r.holesScored > 0 && (
                          <span className={styles.appTag}>app · {r.holesScored}/18 holes</span>
                        )}
                      </td>
                      <td className={styles.tdNum}>
                        <input
                          className={styles.scoreInput}
                          type="number" min={1} max={99}
                          placeholder={r.appFront != null ? String(r.appFront) : '—'}
                          value={r.front}
                          onChange={e => patch(r.id, { front: e.target.value })}
                          onBlur={() => save({ ...r, front: r.front })}
                        />
                      </td>
                      <td className={styles.tdNum}>
                        <input
                          className={styles.scoreInput}
                          type="number" min={1} max={99}
                          placeholder={r.appBack != null ? String(r.appBack) : '—'}
                          value={r.back}
                          onChange={e => patch(r.id, { back: e.target.value })}
                          onBlur={() => save({ ...r, back: r.back })}
                        />
                      </td>
                      <td className={`${styles.tdNum} ${styles.tdTotal}`}>{t ?? '—'}</td>
                      <td className={styles.tdNum}>{t != null ? fmtToPar(t, par) : '—'}</td>
                      <td className={styles.tdStatus}>
                        {savingId === r.id && <span className={styles.saveHint}>Saving…</span>}
                        {savedId === r.id && <span className={styles.saveHintOk}>Saved</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </AdminCard>

        <div className={styles.footNote}>
          {finished.length} of {rows.length} cards complete.
          Greyed rows are still missing a front or back nine.
        </div>
      </div>
    </div>
  );
}

function fmtToPar(total: number, par: number): string {
  const d = total - par;
  return d === 0 ? 'E' : d > 0 ? `+${d}` : `${d}`;
}
