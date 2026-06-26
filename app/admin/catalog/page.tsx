'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type Item = {
  id: string | null;
  name: string;
  price: number;
  description: string;
  active: boolean;
  per_person: boolean;
  allow_multiple: boolean;
  tag: string | null;
};

export default function CatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('catalog_item')
      .select('id, name, price, description, active, per_person, allow_multiple, tag, sort_order')
      .eq('event_id', EVENT_ID)
      .order('per_person')
      .order('sort_order')
      .order('name')
      .then(({ data, error: loadErr }) => {
        if (loadErr) {
          // Usually means the catalog migration hasn't been run yet
          setLoadError(true);
          setLoading(false);
          return;
        }
        const rows = (data ?? []) as (Item & { sort_order: number })[];
        setItems(
          rows.map((r) => ({
            id: r.id,
            name: r.name,
            price: Number(r.price),
            description: r.description ?? '',
            active: r.active,
            per_person: r.per_person,
            allow_multiple: r.allow_multiple ?? false,
            tag: r.tag,
          }))
        );
        setLoading(false);
      });
  }, []);

  const update = (i: number, patch: Partial<Item>) =>
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: null, name: '', price: 0, description: '', active: true, per_person: false, allow_multiple: false, tag: null },
    ]);

  async function save() {
    setSaving(true);
    setError('');
    const supabase = createClient();
    try {
      for (const it of items) {
        if (!it.name.trim()) continue; // skip blank rows
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcError } = await (supabase.rpc as any)('save_catalog_item', {
          p_id: it.id,
          p_name: it.name.trim(),
          p_price: it.price,
          p_description: it.description.trim(),
          p_active: it.active,
          p_per_person: it.per_person,
          p_allow_multiple: it.allow_multiple,
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

  return (
    <div>
      <AdminTopBar
        title="Catalog & pricing"
        action={
          <div className={styles.topActions}>
            {savedAt && !saving && <span className={styles.savedHint}>Saved {savedAt}</span>}
            <Button variant="secondary" size="sm" onClick={add}>
              <Icon name="plus" size={14} /> Add item
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {error && <div className={styles.errorBar}>{error}</div>}

        <AdminCard
          title="Registration add-ons"
          action={<span className={styles.previewTag}>Live on registration</span>}
        >
          <p className={styles.note}>
            Edit these and they update the registration form. The two contest
            items (<strong>tag ctp / ld</strong>) combine into the Long-Drive &amp;
            Closest-to-Pin Challenge — its price is their sum.
          </p>

          {loading ? (
            <div className={styles.loadingRow}>Loading catalog…</div>
          ) : loadError ? (
            <div className={styles.errorBar}>
              Couldn&apos;t load the catalog. Run <strong>add_catalog_admin.sql</strong> in
              Supabase (it adds the columns this page needs), then refresh.
            </div>
          ) : (
            <div className={styles.editGrid}>
              {items.map((it, i) => (
                <div
                  key={it.id ?? `new-${i}`}
                  className={`${styles.editCard} ${!it.active ? styles.editCardOff : ''}`}
                >
                  <div className={styles.editRowTop}>
                    <input
                      className={styles.nameInput}
                      value={it.name}
                      placeholder="Item name"
                      onChange={(e) => update(i, { name: e.target.value })}
                    />
                    {it.tag && <span className={styles.tagBadge}>{it.tag}</span>}
                  </div>

                  <input
                    className={styles.descInput}
                    value={it.description}
                    placeholder="Short description"
                    onChange={(e) => update(i, { description: e.target.value })}
                  />

                  <div className={styles.editRowBottom}>
                    <label className={styles.priceField}>
                      $
                      <input
                        className={styles.priceInput}
                        type="number"
                        min={0}
                        value={it.price}
                        onChange={(e) => update(i, { price: Number(e.target.value) })}
                      />
                    </label>

                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={it.per_person}
                        onChange={(e) => update(i, { per_person: e.target.checked })}
                      />
                      Per golfer
                    </label>

                    <label className={styles.toggle} title="Show a quantity stepper on registration so a registrant can buy more than one">
                      <input
                        type="checkbox"
                        checked={it.allow_multiple}
                        onChange={(e) => update(i, { allow_multiple: e.target.checked })}
                      />
                      Multi-buy
                    </label>

                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={it.active}
                        onChange={(e) => update(i, { active: e.target.checked })}
                      />
                      Active
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
