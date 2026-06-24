'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type Sp = {
  id: string | null;
  name: string;
  tier: string; // '' | 'eagle' | 'birdie' | 'par'
  sponsorship_type: string;
  hole_number: number | null;
  amount: number;
  active: boolean;
};

const TYPE_SUGGESTIONS = ['Hole', 'Cart', 'Putting Green Challenge', 'Beverage Cart', 'Dinner', 'General'];

const isHole = (t: string) => t.toLowerCase().includes('hole');

export default function SponsorsPage() {
  const [items, setItems] = useState<Sp[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('sponsor')
      .select('id, name, tier, sponsorship_type, hole_number, amount, active, sort_order')
      .eq('event_id', EVENT_ID)
      .order('sort_order')
      .order('amount', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as Sp[];
        setItems(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            tier: r.tier ?? '',
            sponsorship_type: r.sponsorship_type ?? '',
            hole_number: r.hole_number,
            amount: Number(r.amount),
            active: r.active,
          }))
        );
        setLoading(false);
      });
  }, []);

  const update = (i: number, patch: Partial<Sp>) =>
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: null, name: '', tier: '', sponsorship_type: '', hole_number: null, amount: 0, active: true },
    ]);

  async function save() {
    setSaving(true);
    setError('');
    const supabase = createClient();
    try {
      for (const s of items) {
        if (!s.name.trim()) continue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcError } = await (supabase.rpc as any)('save_sponsor', {
          p_id: s.id,
          p_name: s.name.trim(),
          p_tier: s.tier,
          p_sponsorship_type: s.sponsorship_type.trim(),
          p_hole_number: isHole(s.sponsorship_type) ? s.hole_number : null,
          p_amount: s.amount,
          p_active: s.active,
        });
        if (rpcError) throw new Error(rpcError.message);
      }
      setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const totalCommitted = items.filter((s) => s.active).reduce((sum, s) => sum + (s.amount || 0), 0);

  return (
    <div>
      <AdminTopBar
        title="Sponsors"
        action={
          <div className={styles.topActions}>
            {savedAt && !saving && <span className={styles.savedHint}>Saved {savedAt}</span>}
            <Button variant="secondary" size="sm" onClick={add}>
              <Icon name="plus" size={14} /> Add sponsor
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {error && <div className={styles.errorBar}>{error}</div>}

        <div className={styles.statsRow}>
          <div className={styles.statPill}>
            <span className={styles.statNum}>{items.filter((s) => s.active).length}</span>
            <span className={styles.statLabel}>sponsors</span>
          </div>
          <div className={styles.statPill}>
            <span className={styles.statNum}>${totalCommitted.toLocaleString()}</span>
            <span className={styles.statLabel}>committed (internal)</span>
          </div>
        </div>

        <datalist id="sponsor-types">
          {TYPE_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>

        <AdminCard
          title="Sponsors"
          action={<span className={styles.previewTag}>Live on the public site</span>}
        >
          {loading ? (
            <div className={styles.loadingRow}>Loading sponsors…</div>
          ) : (
            <div className={styles.list}>
              {items.map((s, i) => (
                <div key={s.id ?? `new-${i}`} className={`${styles.row} ${!s.active ? styles.rowOff : ''}`}>
                  <input
                    className={styles.nameInput}
                    value={s.name}
                    placeholder="Sponsor name"
                    onChange={(e) => update(i, { name: e.target.value })}
                  />

                  <select
                    className={styles.select}
                    value={s.tier}
                    onChange={(e) => update(i, { tier: e.target.value })}
                  >
                    <option value="">No tier</option>
                    <option value="eagle">Eagle</option>
                    <option value="birdie">Birdie</option>
                    <option value="par">Par</option>
                  </select>

                  <input
                    className={styles.typeInput}
                    list="sponsor-types"
                    value={s.sponsorship_type}
                    placeholder="What they sponsor"
                    onChange={(e) => update(i, { sponsorship_type: e.target.value })}
                  />

                  {isHole(s.sponsorship_type) ? (
                    <input
                      className={styles.holeInput}
                      type="number"
                      min={1}
                      max={18}
                      value={s.hole_number ?? ''}
                      placeholder="Hole"
                      onChange={(e) => update(i, { hole_number: e.target.value ? Number(e.target.value) : null })}
                    />
                  ) : (
                    <span className={styles.holeSpacer} />
                  )}

                  <label className={styles.amountField}>
                    $
                    <input
                      className={styles.amountInput}
                      type="number"
                      min={0}
                      value={s.amount}
                      onChange={(e) => update(i, { amount: Number(e.target.value) })}
                    />
                  </label>

                  <label className={styles.toggle}>
                    <input
                      type="checkbox"
                      checked={s.active}
                      onChange={(e) => update(i, { active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
