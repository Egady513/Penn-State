'use client'

import { useState, useEffect } from 'react'
import { Bell, Pin, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'
import styles from './page.module.css'

interface Announcement {
  id: string
  message: string
  posted_at: string
  pinned: boolean
}

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([])
  const [draft, setDraft] = useState('')
  const [shouldPin, setShouldPin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    const supabase = createClient()
    const { data, error: loadErr } = await supabase
      .from('announcement')
      .select('id, message, pinned, posted_at')
      .eq('event_id', EVENT_ID)
      .order('posted_at', { ascending: false })
    if (loadErr) setError(loadErr.message)
    setItems((data ?? []) as Announcement[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handlePost() {
    const message = draft.trim()
    if (!message || busy) return
    setBusy(true)
    setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: postErr } = await (supabase.rpc as any)('post_announcement', {
      p_event_id: EVENT_ID, p_message: message, p_pinned: shouldPin,
    })
    setBusy(false)
    if (postErr) { setError(postErr.message); return }
    setDraft('')
    setShouldPin(false)
    load()
  }

  async function handleDelete(id: string) {
    setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delErr } = await (supabase.rpc as any)('delete_announcement', { p_id: id })
    if (delErr) { setError(delErr.message); return }
    setItems(prev => prev.filter(a => a.id !== id))
  }

  async function handleTogglePin(id: string, pinned: boolean) {
    setError('')
    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: pinErr } = await (supabase.rpc as any)('set_announcement_pinned', { p_id: id, p_pinned: !pinned })
    if (pinErr) { setError(pinErr.message); return }
    setItems(prev => prev.map(a => (a.id === id ? { ...a, pinned: !pinned } : a)))
  }

  const fmtTime = (iso: string) =>
    new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Announcements</h1>
      <p className={styles.sub}>
        Post a message that appears as a banner in the player app. Only a <strong>pinned</strong> message
        shows on players&apos; home screens, so pin the one you want everyone to see.
      </p>

      {error && <div className={styles.errorBar}>{error}</div>}

      <div className={styles.composer}>
        <div className={styles.composerHeader}>
          <Bell size={18} className={styles.bellIcon} />
          <span className={styles.composerLabel}>New announcement</span>
        </div>
        <textarea
          className={styles.textarea}
          placeholder="e.g. Shotgun start in 15 minutes — head to your starting hole."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
        />
        <div className={styles.composerFooter}>
          <label className={styles.pinToggle}>
            <input
              type="checkbox"
              checked={shouldPin}
              onChange={(e) => setShouldPin(e.target.checked)}
            />
            Pin to top of player app
          </label>
          <Button onClick={handlePost} disabled={!draft.trim() || busy}>
            <Send size={16} /> {busy ? 'Posting…' : 'Post announcement'}
          </Button>
        </div>
      </div>

      <div className={styles.listHeader}>Posted</div>

      <div className={styles.list}>
        {loading && <div className={styles.empty}>Loading…</div>}
        {!loading && items.length === 0 && (
          <div className={styles.empty}>No announcements yet.</div>
        )}
        {items.map((item) => (
          <div key={item.id} className={`${styles.item} ${item.pinned ? styles.itemPinned : ''}`}>
            {item.pinned && <div className={styles.pinnedRail} />}
            <div className={styles.itemBody}>
              <div className={styles.itemMessage}>{item.message}</div>
              <div className={styles.itemMeta}>
                <span className={styles.itemTime}>{fmtTime(item.posted_at)}</span>
                {item.pinned && (
                  <Badge tone="info" size="sm">
                    <Pin size={10} /> Pinned
                  </Badge>
                )}
              </div>
            </div>
            <div className={styles.itemActions}>
              <button
                className={styles.actionBtn}
                onClick={() => handleTogglePin(item.id, item.pinned)}
                title={item.pinned ? 'Unpin' : 'Pin'}
              >
                <Pin size={15} />
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={() => handleDelete(item.id)}
                title="Delete"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
