'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { getBroadcastRecipientCount, sendBroadcastEmail, type BroadcastResult } from '@/app/actions/broadcastEmail';
import styles from './page.module.css';

// ── Template 1: send a couple weeks out ─────────────────────────────────
// Refreshed 2026-08-17 — real sponsor/raffle-bundle data pulled live from
// admin, team-spots count re-checked. Review before sending: this is a
// one-time snapshot, not a live template — numbers can drift if you wait.

const TEMPLATE_1_SUBJECT = 'Drive Out Hunger 2026 is almost here 🏌️';

const TEMPLATE_1_BODY = `Drive Out Hunger 2026 is closing in fast, and we cannot wait to see everyone out at Beckett Ridge.

First, a huge thank you to our sponsors and donors. Your support is what makes this event possible, and every dollar raised goes straight toward helping Last Mile Food Rescue put food on the table for families across Cincinnati.

**Sunday, August 30 · Beckett Ridge Golf Club · 8:00 AM shotgun start**

## Included with every registration
- **One drink ticket, on us** · every registered golfer gets a free drink ticket to redeem on the course.
- **Taco bar lunch & awards** · we're closing out the round with a taco bar at 1:00 PM, right alongside the awards.

## Get there early to take advantage of these perks
- **Courtesy Automotive Putting Green Challenge** · $20 for 2 putts. Hit either putt into a bottle of liquor on the putting green and it's yours to take home (one bottle per person).
- **"It's Working Out" complimentary stretching** · warm up before you tee off with free stretching, on the house.

## Hole perks
- **513Sips** will be out on the course handing out water and Arnold Palmers to keep you refreshed.
- **Zeek's Power Clean Wipes**, the Cincinnati-made shower wipes you might already know from the gym, are bringing packs to the course for a fun twist: buy a pack and use it to move your ball closer to the hole, out of the sand, out of the rough, wherever you need it, anywhere on that hole. Part of the proceeds go straight to Last Mile Food Rescue.

## Thank you to our sponsors
- Courtesy Automotive
- It's Working Out
- Oakley Pub & Grill
- Power Wipes

## Thank you to our hole sponsors
- 513Sips · Hole 10
- Keepro Inc. · Hole 15
- RK Express Int'l

## Tournament winners
- 1st Place: $50 Dick's Gift Cards & Pro-V1s
- 2nd Place: Hamilton County Parks Pass & a round at Meadowlinks

## Hole challenges
- **Closest to the Pin** · 1st: Free round for 4 at Legendary Run · 2nd: $100 to Go Play Golf
- **Longest Drive** · 1st: $120 gift card to Another 9 · 2nd: $25 Dick's gift card
- **Bucket Golf Challenge** · $5 entry. Land your shot in the right bucket and shave 1, 2, or 3 strokes off your score on that hole.

## Thank you to our raffle & prize donors
- Cooper's Hawk Wine & Tasting · Cooper's Hawk · $200 value
- Restaurant Bundle · Dewey's Pizza ($25 gift card) & Skyline ($50 gift basket) · $75 value
- Health & Family Bundle · It's Working Out ($75 gift basket) & Mike's Carwash ($25 gift card) · $200 value
- Florence Y'alls · 4 tickets · $100 value
- Bourbon & Cigar Bundle · Greater Cincinnati Penn State Alumni (2 PSU Cincy bourbon glasses & bourbon), split between 2 winners · $150 value
- Jim Beam Bundle · Jim Beam (cast iron skillet & grill set) · $75 value
- Jewelry Bundle · Kendra Scott, split between 3 winners · $225 value
- Pins & Aces Mystery Bundle · Pins & Aces · $100 value
- PSU Bundle · Soar Speakers (PSU Bluetooth speaker) · $100 value

We have 8 team spots left. If you know anyone who'd like to join us, please share the registration link: https://penn-state-topaz.vercel.app/

Thanks again to everyone who has already registered, sponsored, or donated. Every entry, every sponsorship, every raffle prize goes toward one goal: helping Last Mile Food Rescue fight hunger right here in Cincinnati. See you on the course.

Eddie Gady
President, Greater Cincinnati Penn State Alumni Association`;

// ── Template 2: send 2-3 days out ───────────────────────────────────────

const TEMPLATE_2_SUBJECT = "Drive Out Hunger is this weekend! Here's what to know";

const TEMPLATE_2_BODY = `We're just a couple days out from Drive Out Hunger 2026! Here's everything you need for game day.

**When & where**
Sunday, August 30 · Beckett Ridge Golf Club, West Chester OH

## Schedule
- 6:30 AM · Check-in, breakfast & putting green challenge
- 7:45 AM · Pre-round briefing
- 8:00 AM · Shotgun start
- 1:00 PM · Taco bar lunch & awards

Every registered golfer also gets a free drink ticket to redeem on the course.

**Your team PIN:** Check your confirmation email, or reply if you can't find it. You'll need it to open the day-of app at penn-state-topaz.vercel.app/play for your scorecard, leaderboard, mulligans, and to buy any additional add-ons or raffle tickets right from your phone.

Get there early for the Courtesy Automotive Putting Green Challenge and complimentary stretching from It's Working Out.

See you Sunday. Thank you for being part of Drive Out Hunger and for supporting Last Mile Food Rescue.

Eddie Gady
President, Greater Cincinnati Penn State Alumni Association`;

const TEMPLATES = [
  { key: 'template1', label: '~2 weeks out', subject: TEMPLATE_1_SUBJECT, body: TEMPLATE_1_BODY },
  { key: 'template2', label: '2-3 days out (game day)', subject: TEMPLATE_2_SUBJECT, body: TEMPLATE_2_BODY },
] as const;

export default function BroadcastPage() {
  const [activeTemplate, setActiveTemplate] = useState<string>('template1');
  const [subject, setSubject] = useState(TEMPLATE_1_SUBJECT);
  const [body, setBody] = useState(TEMPLATE_1_BODY);
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

  function loadTemplate(key: string) {
    const t = TEMPLATES.find(x => x.key === key);
    if (!t) return;
    setActiveTemplate(key);
    setSubject(t.subject);
    setBody(t.body);
    setResult(null);
  }

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
          bullets, and <code>**bold**</code> for emphasis. These are one-time message snapshots, not a
          live template — review the sponsor/donor lists and team count before sending in case they&apos;ve changed.
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
          <label className={styles.fieldLabel}>Template</label>
          <div className={styles.templateRow}>
            {TEMPLATES.map(t => (
              <button
                key={t.key}
                type="button"
                className={`${styles.templateBtn} ${activeTemplate === t.key ? styles.templateBtnOn : ''}`}
                onClick={() => loadTemplate(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <label className={styles.fieldLabel} style={{ marginTop: 16 }}>Subject</label>
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
