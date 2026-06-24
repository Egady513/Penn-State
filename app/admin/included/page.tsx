'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

export default function IncludedPage() {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('event')
      .select('included')
      .eq('id', EVENT_ID)
      .maybeSingle()
      .then(({ data, error: loadErr }) => {
        if (loadErr) {
          setLoadError(true);
          setLoading(false);
          return;
        }
        const inc = (data as { included?: string[] } | null)?.included;
        setLines(Array.isArray(inc) ? inc : []);
        setLoading(false);
      });
  }, []);

  const update = (i: number, v: string) =>
    setLines((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const remove = (i: number) => setLines((prev) => prev.filter((_, idx) => idx !== i));
  const add = () => setLines((prev) => [...prev, '']);

  async function save() {
    setSaving(true);
    setError('');
    const payload = lines.map((l) => l.trim()).filter(Boolean);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcError } = await (supabase.rpc as any)('set_event_included', {
      new_included: payload,
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
        title="What's included"
        action={
          <div className={styles.topActions}>
            {savedAt && !saving && <span className={styles.savedHint}>Saved {savedAt}</span>}
            <Button variant="secondary" size="sm" onClick={add}>
              <Icon name="plus" size={14} /> Add line
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
          title="Registration “What's included” list"
          action={<span className={styles.previewTag}>Live on registration</span>}
        >
          <p className={styles.note}>
            Each line shows with a green check on the registration page&apos;s
            &ldquo;What&apos;s included&rdquo; list.
          </p>

          {loading ? (
            <div className={styles.loadingRow}>Loading…</div>
          ) : loadError ? (
            <div className={styles.errorBar}>
              Couldn&apos;t load. Run <strong>add_included_source.sql</strong> in Supabase, then refresh.
            </div>
          ) : (
            <div className={styles.list}>
              {lines.map((line, i) => (
                <div key={i} className={styles.row}>
                  <Icon name="check" size={16} color="var(--success, #1F8A5B)" />
                  <input
                    className={styles.input}
                    value={line}
                    placeholder="e.g. Tournament gift bag"
                    onChange={(e) => update(i, e.target.value)}
                  />
                  <button
                    className={styles.removeBtn}
                    onClick={() => remove(i)}
                    aria-label="Remove line"
                  >
                    ×
                  </button>
                </div>
              ))}
              {lines.length === 0 && (
                <div className={styles.loadingRow}>No items yet — add the first line.</div>
              )}
            </div>
          )}
        </AdminCard>
      </div>
    </div>
  );
}
