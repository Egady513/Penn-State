'use client';

import { useEffect, useState, useRef } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';
import { EVENT_ID } from '@/lib/eventId';
import styles from './page.module.css';

export default function SettingsPage() {
  const [heroUrl, setHeroUrl] = useState('');
  const [savedHeroUrl, setSavedHeroUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [savedAt, setSavedAt] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('event')
      .select('hero_image_url')
      .eq('id', EVENT_ID)
      .maybeSingle()
      .then(({ data }) => {
        const url = (data as { hero_image_url?: string | null } | null)?.hero_image_url ?? '';
        setHeroUrl(url);
        setSavedHeroUrl(url);
      });
  }, []);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${EVENT_ID}/hero/hero.${ext}`;
    const { error: upErr } = await supabase.storage.from('event-assets').upload(path, file, { upsert: true });
    if (upErr) { setError('Upload failed: ' + upErr.message); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from('event-assets').getPublicUrl(path);
    setHeroUrl(urlData.publicUrl);
    setUploading(false);
  }

  async function saveHeroImage() {
    setSaving(true);
    setError('');
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: rpcErr } = await (supabase.rpc as any)('set_event_hero_image', {
      p_event_id: EVENT_ID,
      p_url: heroUrl.trim() || null,
    });
    if (rpcErr) { setError(rpcErr.message); setSaving(false); return; }
    setSavedHeroUrl(heroUrl.trim());
    setSavedAt(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    setSaving(false);
  }

  const isDirty = heroUrl.trim() !== savedHeroUrl;

  return (
    <div>
      <AdminTopBar
        title="Settings"
        action={
          <div className={styles.topActions}>
            {savedAt && !isDirty && <span className={styles.savedHint}>Saved {savedAt}</span>}
            <Button variant="primary" size="sm" onClick={saveHeroImage} disabled={saving || !isDirty}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        }
      />

      <div className={styles.page}>
        {error && <div className={styles.errorBar}>{error}</div>}

        <AdminCard title="Hero image" action={<span className={styles.previewTag}>Public site</span>}>
          <div className={styles.section}>
            <p className={styles.hint}>
              Shown on the registration page behind the headline. Recommended: landscape photo of the
              course, at least 1200 × 800 px.
            </p>

            <div className={styles.imageRow}>
              <input
                className={styles.urlInput}
                value={heroUrl}
                onChange={e => setHeroUrl(e.target.value)}
                placeholder="https://… paste image URL, or upload below"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
              />
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload image'}
              </Button>
            </div>

            {heroUrl && (
              <div className={styles.preview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroUrl} alt="Hero preview" className={styles.previewImg} />
                <button className={styles.clearBtn} onClick={() => setHeroUrl('')}>Remove</button>
              </div>
            )}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
