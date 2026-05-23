'use client'

import { useState } from 'react'
import { Bell, Pin, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import styles from './page.module.css'

interface Announcement {
  id: string
  message: string
  postedAt: string
  pinned: boolean
}

const INITIAL: Announcement[] = [
  {
    id: 'a1',
    message: 'Welcome to Drive Out Hunger Golf Outing! Check-in is open at the main tent.',
    postedAt: '8:02 AM',
    pinned: true,
  },
  {
    id: 'a2',
    message: 'Shotgun start in 15 minutes. Please head to your starting hole.',
    postedAt: '8:45 AM',
    pinned: false,
  },
]

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>(INITIAL)
  const [draft, setDraft] = useState('')
  const [shouldPin, setShouldPin] = useState(false)

  function handlePost() {
    if (!draft.trim()) return
    const newItem: Announcement = {
      id: String(Date.now()),
      message: draft.trim(),
      postedAt: new Date().toLocaleTimeString('en-US'),
      pinned: shouldPin,
    }
    setItems((prev) => [newItem, ...prev])
    setDraft('')
    setShouldPin(false)
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id))
  }

  function handleTogglePin(id: string) {
    setItems((prev) =>
      prev.map((a) => (a.id === id ? { ...a, pinned: !a.pinned } : a))
    )
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Announcements</h1>
      <p className={styles.sub}>Post a message that appears as a banner in the player app.</p>

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
          <Button onClick={handlePost} disabled={!draft.trim()}>
            <Send size={16} /> Post announcement
          </Button>
        </div>
      </div>

      <div className={styles.listHeader}>Posted</div>

      <div className={styles.list}>
        {items.length === 0 && (
          <div className={styles.empty}>No announcements yet.</div>
        )}
        {items.map((item) => (
          <div key={item.id} className={`${styles.item} ${item.pinned ? styles.itemPinned : ''}`}>
            {item.pinned && <div className={styles.pinnedRail} />}
            <div className={styles.itemBody}>
              <div className={styles.itemMessage}>{item.message}</div>
              <div className={styles.itemMeta}>
                <span className={styles.itemTime}>{item.postedAt}</span>
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
                onClick={() => handleTogglePin(item.id)}
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
