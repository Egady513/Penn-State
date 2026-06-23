'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type ScheduleItem = {
  id: string;
  time: string;
  label: string;
  detail: string;
  announce: boolean;
};

type StoredItem = { time: string; label: string; detail?: string; announce?: boolean };

let _seq = 0;
const newId = () => `row-${Date.now()}-${_seq++}`;

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load the live schedule from the database (single source of truth)
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('event')
      .select('schedule')
      .eq('id', EVENT_ID)
      .maybeSingle()
      .then(({ data }) => {
        const stored = (data as { schedule?: StoredItem[] } | null)?.schedule;
        const rows = Array.isArray(stored) ? stored : [];
        setItems(
          rows.map((r) => ({
            id: newId(),
            time: r.time ?? '',
            label: r.label ?? '',
            detail: r.detail ?? '',
            announce: r.announce ?? false,
          }))
        );
        setLoading(false);
      });
  }, []);

  const update = (id: string, patch: Partial<ScheduleItem>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const remove = (id: string) =>
    setItems((prev) => prev.filter((x) => x.id !== id));

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: newId(), time: '', label: '', detail: '', announce: false },
    ]);

  async function save() {
    setSaving(true);
    setError('');
    const payload: StoredItem[] = items
      .filter((s) => s.time.trim() && s.label.trim())
      .map((s) => ({
        time: s.time.trim(),
        label: s.label.trim(),
        detail: s.detail.trim(),
        announce: s.announce,
      }));

    const supabase = createClient();
    // set_event_schedule() is a security-definer RPC — writes event.schedule.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)('set_event_schedule', {
      new_schedule: payload,
    });

    setSaving(false);
    if (rpcError) {
      setError(rpcError.message ?? 'Could not save. Try again.');
      return;
    }
    setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
  }

  return (
    <div>
      <AdminTopBar
        title="Event-day schedule"
        action={
          <div className={styles.topActions}>
            {savedAt && !saving && <span className={styles.savedHint}>Saved {savedAt}</span>}
            <Button variant="secondary" size="sm" onClick={add}>
              <Icon name="plus" size={14} />
              Add item
            </Button>
            <Button variant="primary" size="sm" onClick={save} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {error && <div className={styles.errorBar}>{error}</div>}

        <div className={styles.grid}>
          {/* Edit table */}
          <AdminCard padding={0}>
            <div className={styles.tableHeader}>
              <div>Time</div>
              <div>Label</div>
              <div className={styles.hideSmall}>Detail</div>
              <div>Auto-post</div>
              <div />
            </div>

            {loading ? (
              <div className={styles.loadingRow}>Loading schedule…</div>
            ) : items.length === 0 ? (
              <div className={styles.loadingRow}>No items yet — add the first one.</div>
            ) : (
              items.map((item, i) => (
                <div
                  key={item.id}
                  className={`${styles.tableRow} ${i === 0 ? styles.tableRowFirst : ''}`}
                >
                  <input
                    value={item.time}
                    onChange={(e) => update(item.id, { time: e.target.value })}
                    placeholder="9:00 AM"
                    className={styles.schedInput}
                  />
                  <input
                    value={item.label}
                    onChange={(e) => update(item.id, { label: e.target.value })}
                    placeholder="Shotgun start"
                    className={styles.schedInput}
                  />
                  <input
                    value={item.detail}
                    onChange={(e) => update(item.id, { detail: e.target.value })}
                    placeholder="(optional)"
                    className={`${styles.schedInput} ${styles.hideSmall}`}
                  />
                  <label className={`${styles.announceToggle} ${item.announce ? styles.announceToggleOn : ''}`}>
                    <input
                      type="checkbox"
                      checked={item.announce}
                      onChange={(e) => update(item.id, { announce: e.target.checked })}
                      className={styles.announceCheckbox}
                    />
                    Chat
                  </label>
                  <button
                    onClick={() => remove(item.id)}
                    className={styles.removeBtn}
                    title="Remove"
                    aria-label={`Remove ${item.label || 'item'}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </AdminCard>

          {/* Preview */}
          <AdminCard
            title="What golfers see"
            action={<span className={styles.previewTag}>Live everywhere</span>}
          >
            <div className={styles.previewList}>
              {items
                .filter((s) => s.time && s.label)
                .map((s, i) => (
                  <div
                    key={s.id}
                    className={`${styles.previewRow} ${i === 0 ? styles.previewRowFirst : ''}`}
                  >
                    <div className={styles.previewTime}>{s.time}</div>
                    <div>
                      <div className={styles.previewLabel}>{s.label}</div>
                      {s.detail && (
                        <div className={styles.previewDetail}>{s.detail}</div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            <div className={styles.previewNote}>
              <Icon name="megaphone" size={16} color="var(--psu-beaver)" />
              <p>
                This is the only place the agenda lives. Saving updates the public
                site and the player app everywhere.
              </p>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
