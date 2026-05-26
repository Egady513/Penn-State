import { createClient } from '@/lib/supabase/server'
import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { EVENT_ID } from '@/lib/eventId'

type AnnouncementRow = { id: string; message: string; posted_at: string; pinned: boolean }

export default async function ChatPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('announcement')
    .select('id, message, posted_at, pinned')
    .eq('event_id', EVENT_ID)
    .order('posted_at', { ascending: false })

  const announcements = data as AnnouncementRow[] | null

  return (
    <PlayerShell title="Updates" subtitle="From the organizers" syncStatus="synced" liftBar>
      {!announcements || announcements.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📢</div>
          <div className={styles.emptyTitle}>No updates yet</div>
          <div className={styles.emptySub}>
            Eddie will post updates here throughout the day — schedule changes, contest results, lunch call, and more.
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {announcements.map(a => {
            const time = new Date(a.posted_at).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })
            return (
              <div key={a.id} className={`${styles.item} ${a.pinned ? styles.itemPinned : ''}`}>
                {a.pinned && <div className={styles.pinnedBadge}>📌 Pinned</div>}
                <div className={styles.message}>{a.message}</div>
                <div className={styles.time}>{time}</div>
              </div>
            )
          })}
        </div>
      )}
    </PlayerShell>
  )
}
