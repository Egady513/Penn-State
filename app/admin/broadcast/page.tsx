'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { getBroadcastRecipientCount, sendBroadcastEmail, type BroadcastResult } from '@/app/actions/broadcastEmail';
import styles from './page.module.css';

const DEFAULT_SUBJECT = 'Drive Out Hunger 2026 is almost here 🏌️';

// Pre-filled from your outline + the live sponsor/donor lists pulled from
// admin on 2026-08-17. Review and edit before sending — this is a one-time
// snapshot, not a live template. Sponsors already thanked with their own
// perk blurb (513Sips, Courtesy Automotive, It's Working Out, Power Wipes)
// are left out of the general sponsor list below so nobody's thanked twice.
const DEFAULT_BODY = `Drive Out Hunger 2026 is closing in fast, and we cannot wait to see everyone out at Beckett Ridge.

First, a huge thank you to our sponsors and donors. Your support is what makes this event possible, and every dollar raised goes straight toward helping Last Mile Food Rescue put food on the table for families across Cincinnati.

**Sunday, August 30 · Beckett Ridge Golf Club · 8:00 AM shotgun start**

## Get there early to take advantage of these perks
- **Courtesy Automotive Putting Green Challenge** — $20 for 2 putts. Hit either putt into a bottle of liquor on the putting green and it's yours to take home (one bottle per person).
- **"It's Working Out" complimentary stretching** — warm up before you tee off with free stretching, on the house.

## Hole perks
- **513Sips** will be out on the course handing out water and Arnold Palmers to keep you refreshed.
- **Zeek's Power Clean Wipes**, the Cincinnati-made shower wipes you might already know from the gym, are bringing packs to the course for a fun twist: buy a pack and use it to move your ball closer to the hole, out of the sand, out of the rough, wherever you need it, anywhere on that hole. Part of the proceeds go straight to Last Mile Food Rescue.

## Thank you to our sponsors
- Oakley Pub & Grill
- Keepro Inc. — Hole 15
- RK Express Int'l

## Tournament winners
- 1st Place: $50 Dick's Gift Cards & Pro-V1s
- 2nd Place: Hamilton County Parks Pass & a round at Meadowlinks

## Hole challenges
- **Closest to the Pin** — 1st: Free round for 4 at Legendary Run · 2nd: $100 to Go Play Golf
- **Longest Drive** — 1st: $120 gift card to Another 9 · 2nd: $25 Dick's gift card
- **Bucket Golf Challenge** — $5 entry. Land your shot in the right bucket and shave 1, 2, or 3 strokes off your score on that hole.

## Thank you to our raffle & prize donors
- Another 9 Golf — 3hr simulation gift card
- Cooper's Hawk — Magnum wine bottle & 3 month membership
- Dewey's Pizza — Gift card
- Florence Y'alls — 4 tickets
- Greater Cincinnati Penn State Alumni — Bourbon & bourbon glasses
- It's Working Out — Fitness basket
- Jim Beam — Cookware set, cast iron skillet & bourbon
- Kendra Scott — 3 pieces of jewelry ($225 value!)
- Legendary Run Golf Course — Free foursome
- Mike's Carwash — Ultimate car wash
- Pins & Aces — Mystery bundle
- Skyline — $50 gift card
- Soar Speakers — PSU Bluetooth speaker
- Wenzel's Farms — Player goodie bag items

We have 3 team spots left. If you know anyone who'd like to join us, please share the registration link: https://penn-state-topaz.vercel.app/

Thanks again to everyone who has already registered, sponsored, or donated. Every entry, every sponsorship, every raffle prize goes toward one goal: helping Last Mile Food Rescue fight hunger right here in Cincinnati. See you on the course.

Eddie Gady
President, Greater Cincinnati Penn State Alumni Association`;

export default function BroadcastPage() {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [recipients, setRecipients] = useState<{ count: number; teams: number } | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getBroadcastRecipientCount().then(r => {
      if ('count' in r) setRecipients(r);
      setLoadingCount(false);
    });
  }, []);

  async function handleSend() {
    setSending(true);
    setResult(null);
    const res = await sendBroadcastEmail(subject, body);
    setSending(false);
    setConfirmOpen(false);
    setResult(res);
  }

  return (
    <div>
      <AdminTopBar title="Broadcast email" />
      <div className={styles.page}>
        <p className={styles.hint}>
          Sends to every golfer on a <strong>paid</strong> team — one email each, so nobody sees anyone
          else&apos;s address. Use <code>## Heading</code> for section headers, <code>- item</code> for
          bullets, and <code>**bold**</code> for emphasis. This is a one-time message, not a live
          template — review the sponsor/donor lists and team count before sending in case they&apos;ve changed.
        </p>

        <AdminCard title="Recipients">
          {loadingCount ? (
            <div className={styles.loadingRow}>Checking…</div>
          ) : recipients && recipients.count > 0 ? (
            <div className={styles.recipientLine}>
              This will send to <strong>{recipients.count} golfer{recipients.count === 1 ? '' : 's'}</strong> across{' '}
              <strong>{recipients.teams} paid team{recipients.teams === 1 ? '' : 's'}</strong>.
            </div>
          ) : (
            <div className={styles.recipientLine}>No paid teams to send to yet.</div>
          )}
        </AdminCard>

        <AdminCard title="Message">
          <label className={styles.fieldLabel}>Subject</label>
          <input className={styles.subjectInput} value={subject} onChange={e => setSubject(e.target.value)} />

          <label className={styles.fieldLabel} style={{ marginTop: 16 }}>Body</label>
          <textarea className={styles.bodyInput} value={body} onChange={e => setBody(e.target.value)} rows={28} />
        </AdminCard>

        {result && (
          <div className={result.ok ? styles.resultOk : styles.resultErr}>
            {result.error
              ? `Couldn't send: ${result.error}`
              : `Sent to ${result.sent} golfer${result.sent === 1 ? '' : 's'}.${result.failed.length ? ` ${result.failed.length} failed: ${result.failed.join(', ')}` : ''}`}
          </div>
        )}

        <div className={styles.sendRow}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setConfirmOpen(true)}
            disabled={sending || !recipients || recipients.count === 0}
          >
            {sending ? 'Sending…' : `Send to ${recipients?.count ?? 0} golfers`}
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <div className={styles.overlay} onClick={() => !sending && setConfirmOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Send this to everyone?</div>
            <p className={styles.modalBody}>
              This will immediately email <strong>{recipients?.count ?? 0} golfers</strong> across{' '}
              {recipients?.teams ?? 0} teams. This can&apos;t be undone.
            </p>
            <div className={styles.modalActions}>
              <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(false)} disabled={sending}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleSend} disabled={sending}>
                {sending ? 'Sending…' : 'Yes, send it'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
