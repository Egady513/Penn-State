'use client';

import { useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminPill } from '@/components/admin/AdminPill';
import { Button } from '@/components/ui/Button';
import { ADMIN_HOLES, ADMIN_SPONSORS } from '@/lib/mockData';
import styles from './page.module.css';

type Assignments = Record<number, string>;

export default function CoursePage() {
  const totalPar = ADMIN_HOLES.reduce((s, h) => s + h.par, 0);

  const [assignments, setAssignments] = useState<Assignments>(() => {
    const map: Assignments = {};
    ADMIN_SPONSORS.forEach((s) => {
      if (s.hole) map[s.hole] = s.id;
    });
    return map;
  });

  const sponsorById = Object.fromEntries(ADMIN_SPONSORS.map((s) => [s.id, s]));

  const handleAssign = (holeN: number, sponsorId: string) => {
    setAssignments((prev) => {
      const next = { ...prev };
      // Remove this sponsor from any other hole
      Object.keys(next).forEach((k) => {
        if (next[Number(k)] === sponsorId && Number(k) !== holeN) {
          delete next[Number(k)];
        }
      });
      if (sponsorId) {
        next[holeN] = sponsorId;
      } else {
        delete next[holeN];
      }
      return next;
    });
  };

  return (
    <div>
      <AdminTopBar
        title={`Course setup · Par ${totalPar}`}
        action={<Button variant="primary" size="sm">Save changes</Button>}
      />

      <div className={styles.page}>
        <p className={styles.hint}>
          Beckett Ridge · 18 holes · par {totalPar}. Assign a sponsor to each
          hole. Contest holes are pre-set (CTP on 3 &amp; 12, Long Drive on 6
          &amp; 16).
        </p>

        <div className={styles.holeGrid}>
          {ADMIN_HOLES.map((hole) => {
            const sponsorId = assignments[hole.n];
            const sponsor = sponsorId ? sponsorById[sponsorId] : null;

            return (
              <div key={hole.n} className={styles.holeCard}>
                <div className={styles.holeCardHeader}>
                  <div>
                    <div className={styles.holeEyebrow}>Hole</div>
                    <div className={styles.holeNum}>{hole.n}</div>
                  </div>
                  <div className={styles.parBadge}>Par {hole.par}</div>
                </div>

                {hole.contest && (
                  <div className={styles.contestRow}>
                    <AdminPill tone="par">
                      {hole.contest === 'ctp' ? 'Closest to pin' : 'Long drive'}
                    </AdminPill>
                  </div>
                )}

                <div>
                  <div className={styles.sponsorLabel}>Sponsor</div>
                  <select
                    value={sponsorId ?? ''}
                    onChange={(e) => handleAssign(hole.n, e.target.value)}
                    className={`${styles.sponsorSelect} ${sponsor ? styles.sponsorSelectFilled : ''}`}
                  >
                    <option value="">— None —</option>
                    {ADMIN_SPONSORS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {s.tier}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
