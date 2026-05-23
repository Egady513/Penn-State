'use client';

import { useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_SCHEDULE } from '@/lib/mockData';
import styles from './page.module.css';

type ScheduleItem = {
  id: string;
  time: string;
  label: string;
  detail: string;
  announce: boolean;
};

export default function SchedulePage() {
  const [items, setItems] = useState<ScheduleItem[]>(ADMIN_SCHEDULE);

  const update = (id: string, patch: Partial<ScheduleItem>) =>
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const remove = (id: string) =>
    setItems((prev) => prev.filter((x) => x.id !== id));

  const add = () =>
    setItems((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, time: '', label: '', detail: '', announce: false },
    ]);

  return (
    <div>
      <AdminTopBar
        title="Event-day schedule"
        action={
          <Button variant="primary" size="sm" onClick={add}>
            <Icon name="plus" size={14} />
            Add item
          </Button>
        }
      />

      <div className={styles.page}>
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

            {items.map((item, i) => (
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
            ))}
          </AdminCard>

          {/* Preview */}
          <AdminCard
            title="What golfers see"
            action={<span className={styles.previewTag}>Home tab</span>}
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
                Items checked <strong>Chat</strong> auto-post in the player chat
                at their scheduled time.
              </p>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
}
