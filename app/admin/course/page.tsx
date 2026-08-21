'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type ContestType = 'none' | 'closest_to_pin' | 'long_drive' | 'hole_in_one';

type HoleRow = {
  id: string;
  number: number;
  par: number;
  contestType: ContestType;
  contestLabel: string;
};

const CONTEST_LABEL: Record<ContestType, string> = {
  none: '— No contest —',
  closest_to_pin: 'Closest to pin',
  long_drive: 'Long drive',
  hole_in_one: 'Hole in one',
};

export default function CoursePage() {
  const [holes, setHoles] = useState<HoleRow[]>([]);
  const [sponsorByHole, setSponsorByHole] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase
        .from('hole')
        .select('id, number, par, contest_type, contest_label')
        .eq('event_id', EVENT_ID)
        .order('number'),
      supabase
        .from('sponsor')
        .select('name, hole_number')
        .eq('event_id', EVENT_ID)
        .eq('active', true)
        .not('hole_number', 'is', null),
    ]).then(([holesRes, sponsorsRes]) => {
      const holeRows = (holesRes.data ?? []) as { id: string; number: number; par: number; contest_type: ContestType; contest_label: string | null }[];
      setHoles(holeRows.map(h => ({ id: h.id, number: h.number, par: h.par, contestType: h.contest_type, contestLabel: h.contest_label ?? '' })));

      const sponsorRows = (sponsorsRes.data ?? []) as { name: string; hole_number: number | null }[];
      const map: Record<number, string> = {};
      sponsorRows.forEach(s => { if (s.hole_number != null) map[s.hole_number] = s.name; });
      setSponsorByHole(map);

      setLoading(false);
    });
  }, []);

  const patch = (id: string, p: Partial<HoleRow>) =>
    setHoles(prev => prev.map(h => (h.id === id ? { ...h, ...p } : h)));

  async function save(hole: HoleRow) {
    setSavingId(hole.id);
    setSavedId(null);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.rpc as any)('save_hole_contest', {
      p_hole_id: hole.id,
      p_contest_type: hole.contestType,
      p_contest_label: hole.contestLabel,
    });
    setSavingId(null);
    if (!error) {
      setSavedId(hole.id);
      setTimeout(() => setSavedId(id => (id === hole.id ? null : id)), 1500);
    }
  }

  const totalPar = holes.reduce((s, h) => s + h.par, 0);

  return (
    <div>
      <AdminTopBar title={holes.length > 0 ? `Course setup · Par ${totalPar}` : 'Course setup'} />

      <div className={styles.page}>
        <p className={styles.hint}>
          Beckett Ridge · 18 holes. Assign Closest-to-Pin, Long Drive, or a custom
          challenge to any hole — this drives the contest banner players see on
          that hole in the day-of scorecard. Changes save automatically.
          Sponsor names shown here come from the <strong>Sponsors</strong> tab —
          set the hole number there to have it appear below.
        </p>

        {loading ? (
          <div className={styles.loadingRow}>Loading holes…</div>
        ) : holes.length === 0 ? (
          <div className={styles.loadingRow}>
            No holes found for this event. Run <code>add_hole_picker_and_contests.sql</code> in Supabase.
          </div>
        ) : (
          <div className={styles.holeGrid}>
            {holes.map(hole => (
              <div key={hole.id} className={styles.holeCard}>
                <div className={styles.holeCardHeader}>
                  <div>
                    <div className={styles.holeEyebrow}>Hole</div>
                    <div className={styles.holeNum}>{hole.number}</div>
                  </div>
                  <div className={styles.parBadge}>Par {hole.par}</div>
                </div>

                <div>
                  <div className={styles.sponsorLabel}>Contest</div>
                  <select
                    value={hole.contestType}
                    onChange={e => {
                      const next = { ...hole, contestType: e.target.value as ContestType };
                      patch(hole.id, { contestType: next.contestType });
                      save(next);
                    }}
                    className={`${styles.contestSelect} ${hole.contestType !== 'none' ? styles.contestSelectFilled : ''}`}
                  >
                    {(Object.keys(CONTEST_LABEL) as ContestType[]).map(ct => (
                      <option key={ct} value={ct}>{CONTEST_LABEL[ct]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className={styles.sponsorLabel}>Custom challenge</div>
                  <input
                    className={styles.labelInput}
                    placeholder="e.g. Beat the pro"
                    value={hole.contestLabel}
                    onChange={e => patch(hole.id, { contestLabel: e.target.value })}
                    onBlur={() => save(hole)}
                  />
                </div>

                {sponsorByHole[hole.number] && (
                  <div className={styles.sponsorTag} title="Set from the Sponsors tab">
                    ⛳ {sponsorByHole[hole.number]}
                  </div>
                )}

                {savingId === hole.id && <div className={styles.saveHint}>Saving…</div>}
                {savedId === hole.id && <div className={styles.saveHintOk}>Saved</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
