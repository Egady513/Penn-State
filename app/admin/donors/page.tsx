'use client';

import { useEffect, useState, useRef } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

type Donor = {
  id: string;
  name: string;
  donated_item: string;
  estimated_value: number;
  logo_url: string | null;
};

const BLANK: Omit<Donor, 'id'> = { name: '', donated_item: '', estimated_value: 0, logo_url: null };

export default function DonorsPage() {
  const [donors, setDonors] = useState<Donor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Donor | null>(null);
  const [draft, setDraft] = useState<Omit<Donor, 'id'> | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    const supabase = createClient();
    supabase
      .from('donor')
      .select('id, name, donated_item, estimated_value, logo_url')
      .eq('event_id', EVENT_ID)
      .order('name')
      .then(({ data }) => {
        setDonors((data ?? []) as Donor[]);
        setLoading(false);
      });
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing({ id: '', ...BLANK });
    setDraft({ ...BLANK });
    setError('');
  }

  function openEdit(d: Donor) {
    setEditing(d);
    setDraft({ name: d.name, donated_item: d.donated_item, estimated_value: d.estimated_value, logo_url: d.logo_url });
    setError('');
  }

  function closeModal() { setEditing(null); setDraft(null); setError(''); }

  async function handleLogoUpload(file: File) {
    if (!draft) return;
    setUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${EVENT_ID}/donors/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('event-assets').upload(path, file, { upsert: true });
    if (upErr) { setError('Logo upload failed: ' + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(path);
    setDraft(d => d ? { ...d, logo_url: urlData.publicUrl } : d);
    setUploading(false);
  }

  async function save() {
    if (!draft || !editing) return;
    if (!draft.name.trim()) { setError('Name is required.'); return; }
    setSaving(true);
    setError('');
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (supabase.rpc as any)('save_donor', {
      p_id:               editing.id || null,
      p_event_id:         EVENT_ID,
      p_name:             draft.name.trim(),
      p_donated_item:     draft.donated_item.trim(),
      p_estimated_value:  Number(draft.estimated_value) || 0,
      p_logo_url:         draft.logo_url,
    });
    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }
    closeModal();
    load();
    setSaving(false);
  }

  async function deleteDonor(d: Donor) {
    if (!confirm(`Delete "${d.name}"?`)) return;
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.rpc as any)('delete_donor', { p_id: d.id, p_event_id: EVENT_ID });
    load();
  }

  function exportCsv() {
    const rows = [['Name', 'Item', 'Estimated Value']];
    donors.forEach(d => rows.push([d.name, d.donated_item, String(d.estimated_value)]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'donors.csv';
    a.click();
  }

  const total = donors.reduce((s, d) => s + (Number(d.estimated_value) || 0), 0);
  const avg = donors.length ? Math.round(total / donors.length) : 0;

  return (
    <div>
      <AdminTopBar
        title="Donors"
        action={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={exportCsv}>Export CSV</Button>
            <Button variant="primary" size="sm" onClick={openNew}>
              <Icon name="plus" size={14} />
              Add donor
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {/* Stats row */}
        <div className={styles.statGrid}>
          <StatCard label="Donors" value={String(donors.length)} sub="Auction + raffle" />
          <StatCard label="Total value" value={`$${total.toLocaleString()}`} sub="In-kind gifts" ok />
          <StatCard label="Avg gift" value={`$${avg.toLocaleString()}`} sub="Per donor" />
        </div>

        <AdminCard padding={0}>
          <div className={styles.tableHeader}>
            <div>Donor</div>
            <div>Item</div>
            <div>Est. value</div>
            <div />
          </div>

          {loading ? (
            <div style={{ padding: '20px 18px', fontSize: 13, color: 'var(--fg-muted)' }}>Loading…</div>
          ) : donors.length === 0 ? (
            <div style={{ padding: '20px 18px', fontSize: 13, color: 'var(--fg-muted)' }}>
              No donors yet. Click &ldquo;+ Add donor&rdquo; above.
            </div>
          ) : (
            donors.map((donor, i) => (
              <div
                key={donor.id}
                className={`${styles.tableRow} ${i === donors.length - 1 ? styles.tableRowLast : ''}`}
              >
                <div className={styles.donorName}>
                  {donor.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={donor.logo_url} alt={donor.name} className={styles.donorLogo} />
                  ) : (
                    <span className={styles.bronzeDot} />
                  )}
                  {donor.name}
                </div>
                <div className={styles.donorItem}>{donor.donated_item}</div>
                <div className={styles.donorValue}>${Number(donor.estimated_value).toLocaleString()}</div>
                <div className={styles.donorActions}>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(donor)}>Edit</Button>
                  <button className={styles.deleteBtn} onClick={() => deleteDonor(donor)} aria-label="Delete">✕</button>
                </div>
              </div>
            ))
          )}
        </AdminCard>
      </div>

      {/* ── Edit / Add modal ───────────────────────────────────── */}
      {editing !== null && draft !== null && (
        <div className={styles.overlay} onClick={closeModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{editing.id ? 'Edit donor' : 'Add donor'}</h2>
              <button className={styles.modalClose} onClick={closeModal}>✕</button>
            </div>

            {error && <div className={styles.errorBar}>{error}</div>}

            <div className={styles.formGrid}>
              <label className={styles.formLabel}>
                Donor name *
                <input
                  className={styles.formInput}
                  value={draft.name}
                  onChange={e => setDraft(d => d ? { ...d, name: e.target.value } : d)}
                  placeholder="Acme Company"
                  autoFocus
                />
              </label>

              <label className={styles.formLabel}>
                Item / prize
                <input
                  className={styles.formInput}
                  value={draft.donated_item}
                  onChange={e => setDraft(d => d ? { ...d, donated_item: e.target.value } : d)}
                  placeholder="Weekend cabin getaway"
                />
              </label>

              <label className={styles.formLabel}>
                Estimated value ($)
                <input
                  className={styles.formInput}
                  type="number"
                  min={0}
                  value={draft.estimated_value}
                  onChange={e => setDraft(d => d ? { ...d, estimated_value: Number(e.target.value) } : d)}
                />
              </label>

              <div className={styles.formLabel}>
                Logo (optional)
                <div className={styles.logoRow}>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.[0]) handleLogoUpload(e.target.files[0]); }}
                  />
                  <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    {uploading ? 'Uploading…' : draft.logo_url ? 'Change logo' : 'Add logo'}
                  </Button>
                  {draft.logo_url && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.logo_url} alt="preview" className={styles.logoPreview} />
                      <button className={styles.deleteBtn} onClick={() => setDraft(d => d ? { ...d, logo_url: null } : d)} type="button">✕</button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <Button variant="ghost" size="sm" onClick={closeModal}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, ok }: { label: string; value: string; sub: string; ok?: boolean }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub} style={{ color: ok ? 'var(--success)' : 'var(--psu-beaver)' }}>{sub}</div>
    </div>
  );
}
