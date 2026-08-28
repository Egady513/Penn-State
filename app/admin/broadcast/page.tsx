'use client';

import { useEffect, useState } from 'react';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { AdminCard } from '@/components/admin/AdminCard';
import { Button } from '@/components/ui/Button';
import { getBroadcastRecipientCount, sendBroadcastEmail, sendTestEmail, sendGroupEmails, type BroadcastResult, type GroupSendResult } from '@/app/actions/broadcastEmail';

import { PAIRING_TOKEN as GROUP_TOKEN, PIN_TOKEN } from '@/lib/broadcastToken';
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

## Before you tee off
- **"It's Working Out" complimentary stretching** · warm up before you tee off with free stretching, on the house.

## Hole perks
- **513Sips · Hole 10** · handing out water and Arnold Palmers to keep you refreshed.
- **Zeek's Power Clean Wipes · Hole 5** · $5 for a 5-pack of wipes, and what you buy decides how you play the hole. Buy one pack and your team gets one regular golf shot plus one swing with a shovel. Buy two packs and both players hit regular golf shots. Buy none and you're both swinging shovels. They'll also have 30-packs for sale during and after the round, and proceeds are split with Last Mile Food Rescue.

## After your round
- **"Sink It, Keep It" putting green challenge** · starting at noon as teams finish their round, presented by Courtesy Automotive. $20 for 2 putts. Sink either one into a bottle of liquor on the putting green and it's yours to take home (one bottle per person).

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
- **Bucket Golf Challenge (Hole 1)** · $5 a shot, no cap. Three buckets: land the closest and take 1 stroke off your score on that hole, the middle takes 2 off, the farthest takes 3 off.
- **Beat the Pro (Hole 13)** · new this year, presented by BackSwing Golf Events. Go head-to-head with a touring lady pro in a fun spin on closest-to-the-pin, with a Bad Birdie gift card on the line. If your whole team donates, you get the chance to improve your score. Do you have what it takes to beat the pro?

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
- 6:30 AM · Check-in & breakfast
- 7:45 AM · Pre-round briefing
- 8:00 AM · Shotgun start
- 12:00 PM · "Sink It, Keep It" putting green challenge opens as teams finish
- 1:00 PM · Taco bar lunch & awards

Every registered golfer also gets a free drink ticket to redeem on the course.

{{group}}

{{pin}}

You'll need it to open the day-of app at https://penn-state-topaz.vercel.app/play for your scorecard, leaderboard, mulligans, and to buy add-ons or raffle tickets right from your phone. Anything you buy on the course goes on your team tab, and you can settle up by card in the app or with me at the end.

Get there early for complimentary stretching from It's Working Out. On the course, look for Beat the Pro on Hole 13, Zeek's Power Clean Wipes on Hole 5 and 513Sips on Hole 10.

## How we're playing
**Two-person scramble.** Everyone tees off, you pick the best shot, and all players hit their next shot from there. Repeat until the hole is done. Traditional rules apply and drops count as a stroke. Max score per hole is double par. Please keep both teams' scores on your scorecard.

- **Tees** · men play white. Women have the option of red. Men over 60 have the option of yellow.
- **Lies** · you can improve your lie and move the ball within one club length of the original spot, no closer to the hole. It has to stay in the same cut of grass as the shot you selected.
- **Lost balls** · we use the PGA Tour rule. On tour a spotter would be there to find it for you. If your ball was in play and you can't find it, drop one with no penalty. If it's in the woods, the water or someone's backyard, take the stroke.

## Mulligans
- **Breakfast ball** · every player gets one free mulligan off the first tee. That's the only place it can be used, and you don't need to track it.
- **Extra mulligans** · $2 each, anytime, anywhere on the course. One per player per hole to keep pace of play, but no cap on your total.
- Track them in the app or on your scorecard. We collect after play.

## Add-ons
- **3-foot "gimmie rope"** · $10, one per team. Use up to 36 inches to take a gimmie without the extra stroke. After each use, cut the distance between ball and hole off the rope. Miss a birdie putt by 3 inches, cut 3 inches, take the birdie, and you've got 33 inches left.
- **Opponent's drive** · $10. If your opponent has the better tee shot, share it and play your second shot from there. Once per round per card, and you can buy as many cards as you want. These have to be bought before play starts.
- **Hit from the front tees** · $10. Play it at the tee box on whichever hole you choose and take your tee shot from the front tees. One per round per team.
- **Ball toss** · $20. Five chances to pick the ball up and throw it from anywhere on the course: tee box, sand, fringe, wherever. They don't all have to happen on the same hole. And no, you can't throw your opponent's ball.

## Prize holes & challenges
- **Closest to the Pin · Hole 10** · $12 on its own, or $20 for this and Longest Drive together. Traditional rules: a marker sits on the green and gets moved when someone hits it closer. Buy as many attempts as you want, we take your best. 1st: free round for 4 at Legendary Run. 2nd: $100 to Go Play Golf.
- **Longest Drive · Hole 18** · $12 on its own, or $20 for both. 1st: $120 gift card to Another 9. 2nd: $25 Dick's gift card.
- **Beat the Pro · Hole 13** · presented by BackSwing Golf Events. Go head to head with a touring lady pro in a spin on closest-to-the-pin, with a Bad Birdie gift card on the line. If your whole team donates, you get a chance to improve your score.
- **Zeek's Power Clean Wipes · Hole 5** · $5 for a 5-pack, and what you buy decides how you play the hole. Buy one pack and your team gets one regular golf shot plus one swing with a shovel. Buy two and you both hit regular shots. Buy none and you're both swinging shovels.
- **Bucket Golf Challenge · Hole 1** · $5 a shot, no cap, and you can buy right from the app. Three buckets: the closest takes 1 stroke off that hole, the middle takes 2, the farthest takes 3.

**Heads up:** Bucket Golf has moved to **Hole 1**, so you can play it while you're waiting to tee off. (An earlier email said Hole 6.) It's $5 a shot with no cap, and you can buy shots right from the app.

## Please stick around after your round
Lunch is a taco bar, and the awards ceremony follows. Both are included, so plan to stay.

While you're waiting on the rest of the field to finish, there's plenty to do:
- **Bucket Golf Challenge** · come back and test your luck again to shave strokes off your score.
- **"Sink It, Keep It"** · join Courtesy Automotive on the putting green. $20 for 2 putts. Sink one into a bottle of liquor and it's yours to take home.
- **Raffle** · over $1,000 in prizes. Tickets are on sale in the app and at the tent right up until the drawing.

Any trouble on Sunday, call or text me at 513-708-0874.

See you Sunday. Thank you for being part of Drive Out Hunger and for supporting Last Mile Food Rescue.

Eddie Gady
President, Greater Cincinnati Penn State Alumni Association`;

// ── Template 3: sponsors / partners (game-day brief) ────────────────────

const TEMPLATE_3_SUBJECT = 'Drive Out Hunger 2026 · Game-day details for our sponsors';

const TEMPLATE_3_BODY = `First, a huge thank you to all of you for partnering with us in our 2nd Annual Drive Out Hunger Golf Outing! Your support is what makes this event possible, and every dollar raised goes straight toward helping Last Mile Food Rescue put food on the table for families across Cincinnati.

## Outing details
**Sunday, August 30 · Beckett Ridge Golf Club · 8:00 AM start · 66 golfers**

## Agenda
- **5:15 AM** · Eddie arrives to start setup
- **5:30 AM** · 513Sips bartender arrives to set up
- **6:15–7:00 AM** · Morning sponsors arrive (BackSwing Golf, Zeek's Power Wipes & It's Working Out)
- **6:45 AM** · Registration begins
- **7:45 AM** · Announcements & prayer
- **8:00 AM** · Shotgun start
- **12:00 PM** · Afternoon sponsors arrive (Courtesy Automotive)
- **~1:00 PM** · Golfers start to finish
- **~1:45 PM** · Lunch & award ceremony

## Holes & challenges
- **Zeek's Power Wipes** · Hole 5
- **Beat the Pro** · Hole 13
- **Bucket Golf Challenge** (Last Mile volunteers) · Hole 1
- **513Sips refreshments** · Hole 10
- **Closest to the Pin** · Hole 10
- **Longest Drive** · Hole 18
- **"Sink It, Keep It"** · ½ putting green challenge

This is going to be the largest outing we have done in the 7 years we have hosted it, and our 2nd year benefiting Last Mile Food Rescue. We are incredibly excited and thankful for your help in making this unforgettable for everyone participating.

If you have ANY questions or concerns, please do not hesitate to reach out to me directly: 513-708-0874

Eddie Gady
President, Greater Cincinnati Penn State Alumni Association`;

// One group per line: "Group name: email, email". Each group gets its own
// email; groups never see each other.
const DEFAULT_GROUPS = `Power Wipes: Whitney.Mueller@powercleanwipes.com, michael@powercleanwipes.com, zeek.kreke@powercleanwipes.com
Courtesy Automotive: sgibson@gocourtesy.com
It's Working Out: joey@itsworkingout.com
513Sips: egady303@gmail.com
BackSwing Golf: abbie@backswinggolfevents.com, events@backswinggolfevents.com
Last Mile Food Rescue: Beth@lastmilefood.org`;

function parseGroups(raw: string): { name: string; emails: string[] }[] {
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const idx = line.indexOf(':');
      if (idx === -1) return null;
      const name = line.slice(0, idx).trim();
      const emails = line.slice(idx + 1).split(',').map(e => e.trim()).filter(e => e.includes('@'));
      return name && emails.length ? { name, emails } : null;
    })
    .filter((g): g is { name: string; emails: string[] } => g !== null);
}

const TEMPLATES = [
  { key: 'template1', label: '~2 weeks out', subject: TEMPLATE_1_SUBJECT, body: TEMPLATE_1_BODY },
  { key: 'template2', label: '2-3 days out (game day)', subject: TEMPLATE_2_SUBJECT, body: TEMPLATE_2_BODY },
  { key: 'template3', label: 'Sponsors (game-day brief)', subject: TEMPLATE_3_SUBJECT, body: TEMPLATE_3_BODY },
] as const;

// Your edits are kept in this browser so a refresh, a tab close, or clicking
// away to another admin page doesn't wipe the message you're drafting.
const DRAFT_KEY = 'doh-broadcast-draft';

export default function BroadcastPage() {
  const [activeTemplate, setActiveTemplate] = useState<string>('template1');
  const [subject, setSubject] = useState(TEMPLATE_1_SUBJECT);
  const [body, setBody] = useState(TEMPLATE_1_BODY);
  const [restored, setRestored] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [recipients, setRecipients] = useState<{ count: number; teams: number; golfers: number; ungrouped: number } | null>(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState('');
  const [audience, setAudience] = useState<'golfers' | 'groups'>('golfers');
  const [groupsRaw, setGroupsRaw] = useState(DEFAULT_GROUPS);
  const [groupResult, setGroupResult] = useState<GroupSendResult | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    getBroadcastRecipientCount().then(r => {
      if ('count' in r) setRecipients(r);
      setLoadingCount(false);
    });
  }, []);

  // Restore any in-progress draft on load.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { subject?: string; body?: string; template?: string; savedAt?: string };
        if (typeof d.subject === 'string') setSubject(d.subject);
        if (typeof d.body === 'string') setBody(d.body);
        if (typeof d.template === 'string') setActiveTemplate(d.template);
        setDraftSavedAt(d.savedAt ?? null);
      }
    } catch { /* corrupt draft — fall back to the template defaults */ }
    setRestored(true);
  }, []);

  // Persist every keystroke. Guarded on `restored` so the initial template
  // defaults can't overwrite a saved draft before it's been read back.
  useEffect(() => {
    if (!restored) return;
    try {
      const savedAt = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ subject, body, template: activeTemplate, savedAt }));
      setDraftSavedAt(savedAt);
    } catch { /* storage full or blocked — editing still works, just not persisted */ }
  }, [subject, body, activeTemplate, restored]);

  const currentTemplate = TEMPLATES.find(t => t.key === activeTemplate);
  const hasEdits = !!currentTemplate && (subject !== currentTemplate.subject || body !== currentTemplate.body);

  function resetToTemplate() {
    if (!currentTemplate) return;
    if (hasEdits && !confirm('Discard your edits and reload the original template text?')) return;
    setSubject(currentTemplate.subject);
    setBody(currentTemplate.body);
    setResult(null);
  }

  function loadTemplate(key: string) {
    const t = TEMPLATES.find(x => x.key === key);
    if (!t || key === activeTemplate) return;
    if (hasEdits && !confirm('You have edits to the current message. Switching templates will discard them. Continue?')) return;
    setActiveTemplate(key);
    setSubject(t.subject);
    setBody(t.body);
    setResult(null);
  }

  async function handleTest() {
    setTesting(true);
    setResult(null);
    setTestMsg('');
    const res = await sendTestEmail(subject, body);
    setTesting(false);
    if (res.ok) setTestMsg(`Test sent to your inbox. Check the formatting there, then send for real.${res.note ? ` ${res.note}` : ''}`);
    else setResult(res);
  }

  const parsedGroups = parseGroups(groupsRaw);
  const groupEmailTotal = parsedGroups.reduce((n, g) => n + g.emails.length, 0);

  async function handleSend() {
    setSending(true);
    setResult(null);
    setGroupResult(null);
    if (audience === 'groups') {
      const res = await sendGroupEmails(subject, body, parsedGroups);
      setGroupResult(res);
    } else {
      const res = await sendBroadcastEmail(subject, body);
      setResult(res);
    }
    setSending(false);
    setConfirmOpen(false);
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

        <AdminCard title="Audience">
          <div className={styles.templateRow}>
            <button
              type="button"
              className={`${styles.templateBtn} ${audience === 'golfers' ? styles.templateBtnOn : ''}`}
              onClick={() => { setAudience('golfers'); setResult(null); setGroupResult(null); }}
            >
              Paid golfers
            </button>
            <button
              type="button"
              className={`${styles.templateBtn} ${audience === 'groups' ? styles.templateBtnOn : ''}`}
              onClick={() => { setAudience('groups'); setResult(null); setGroupResult(null); }}
            >
              Sponsor groups
            </button>
          </div>

          {audience === 'groups' && (
            <>
              <label className={styles.fieldLabel} style={{ marginTop: 16 }}>
                Groups — one per line, as <code>Name: email, email</code>
              </label>
              <textarea
                className={styles.bodyInput}
                value={groupsRaw}
                onChange={e => setGroupsRaw(e.target.value)}
                rows={7}
              />
              <div className={styles.recipientNote}>
                <strong>{parsedGroups.length} group{parsedGroups.length === 1 ? '' : 's'}</strong>,{' '}
                {groupEmailTotal} address{groupEmailTotal === 1 ? '' : 'es'} total. Each group gets its
                own separate email — groups never see each other. People within the same group share a
                To line, since they&apos;re colleagues at the same organization.
              </div>
            </>
          )}
        </AdminCard>

        {audience === 'golfers' && (
        <AdminCard title="Recipients">
          {loadingCount ? (
            <div className={styles.loadingRow}>Checking…</div>
          ) : recipients && recipients.count > 0 ? (
            <div className={styles.recipientLine}>
              Covers all <strong>{recipients.golfers} golfers</strong> across{' '}
              <strong>{recipients.teams} paid team{recipients.teams === 1 ? '' : 's'}</strong>, sent to{' '}
              <strong>{recipients.count} email address{recipients.count === 1 ? '' : 'es'}</strong>.
              {recipients.golfers > recipients.count && (
                <div className={styles.recipientNote}>
                  {recipients.golfers - recipients.count} golfer{recipients.golfers - recipients.count === 1 ? '' : 's'}{' '}
                  registered under an address a teammate is already using, so those teammates share one
                  copy instead of getting two identical emails. Nobody is left out.
                </div>
              )}
              {body.includes(GROUP_TOKEN) && recipients.ungrouped > 0 && (
                <div className={styles.recipientWarn}>
                  {recipients.ungrouped} team{recipients.ungrouped === 1 ? '' : 's'} still ha
                  {recipients.ungrouped === 1 ? 's' : 've'} no group assigned. They&apos;ll get the
                  &ldquo;posted at check-in&rdquo; wording instead of a group. Set groups on the{' '}
                  <a href="/admin/registrations">Teams tab</a> first if you&apos;d rather they see one.
                </div>
              )}
            </div>
          ) : (
            <div className={styles.recipientLine}>No paid teams to send to yet.</div>
          )}
        </AdminCard>
        )}

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

          <div className={styles.bodyLabelRow}>
            <label className={styles.fieldLabel} style={{ marginBottom: 0 }}>Body</label>
            <div className={styles.draftStatus}>
              {hasEdits && <span className={styles.editedTag}>Edited</span>}
              {draftSavedAt && <span>Draft saved {draftSavedAt}</span>}
              {hasEdits && (
                <button type="button" className={styles.resetBtn} onClick={resetToTemplate}>
                  Reset to template
                </button>
              )}
            </div>
          </div>
          <textarea className={styles.bodyInput} value={body} onChange={e => setBody(e.target.value)} rows={28} />
          <div className={styles.groupTokenRow}>
            {body.includes(GROUP_TOKEN) || body.includes(PIN_TOKEN) ? (
              <>
                <span className={styles.tokenOn}>Personalized</span>
                <span className={styles.tokenNote}>
                  <code>{GROUP_TOKEN}</code> becomes each golfer&apos;s group number, starting hole and
                  the other team they&apos;re playing with. Anyone without a group yet gets a short
                  &ldquo;posted at check-in&rdquo; line instead. <code>{PIN_TOKEN}</code> becomes their
                  own team PIN, so nobody has to dig up an old email.
                </span>
              </>
            ) : (
              <>
                <button type="button" className={styles.resetBtn} onClick={() => setBody(b => `${b.trimEnd()}\n\n${GROUP_TOKEN}\n`)}>
                  Add group block
                </button>
                <button type="button" className={styles.resetBtn} onClick={() => setBody(b => `${b.trimEnd()}\n\n${PIN_TOKEN}\n`)}>
                  Add team PIN
                </button>
                <span className={styles.tokenNote}>
                  <code>{GROUP_TOKEN}</code> becomes each golfer&apos;s own group and starting hole.
                  <code>{PIN_TOKEN}</code> becomes their team PIN. Move either line wherever you want it.
                </span>
              </>
            )}
          </div>
          <p className={styles.sendNote}>
            Whatever is in this box right now is exactly what gets sent. Your edits are saved in this
            browser, so a refresh or navigating away won&apos;t lose them.
          </p>
        </AdminCard>

        {result && (
          <div className={result.ok ? styles.resultOk : styles.resultErr}>
            {result.error
              ? `Couldn't send: ${result.error}`
              : `Sent to ${result.sent} golfer${result.sent === 1 ? '' : 's'}.${result.failed.length ? ` ${result.failed.length} failed: ${result.failed.join(', ')}` : ''}`}
          </div>
        )}

        {testMsg && <div className={styles.resultOk}>{testMsg}</div>}

        {groupResult && (
          <div className={groupResult.ok ? styles.resultOk : styles.resultErr}>
            {groupResult.error
              ? `Couldn't send: ${groupResult.error}`
              : `Sent to ${groupResult.sentGroups.length} group${groupResult.sentGroups.length === 1 ? '' : 's'}: ${groupResult.sentGroups.map(g => `${g.group} (${g.count})`).join(', ')}.` +
                (groupResult.failed.length
                  ? ` FAILED: ${groupResult.failed.map(f => `${f.group} — ${f.error}`).join('; ')}`
                  : '')}
          </div>
        )}

        <div className={styles.sendRow}>
          <Button variant="secondary" size="lg" onClick={handleTest} disabled={testing || sending}>
            {testing ? 'Sending test…' : 'Send test to myself'}
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setConfirmOpen(true)}
            disabled={
              sending || testing ||
              (audience === 'golfers'
                ? !recipients || recipients.count === 0
                : parsedGroups.length === 0)
            }
          >
            {sending
              ? 'Sending…'
              : audience === 'groups'
                ? `Send to ${parsedGroups.length} sponsor group${parsedGroups.length === 1 ? '' : 's'}`
                : `Send to ${recipients?.count ?? 0} email addresses`}
          </Button>
        </div>
      </div>

      {confirmOpen && (
        <div className={styles.overlay} onClick={() => !sending && setConfirmOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Send this to everyone?</div>
            <p className={styles.modalBody}>
              {audience === 'groups' ? (
                <>
                  This will immediately send <strong>{parsedGroups.length} separate emails</strong>, one
                  per group ({parsedGroups.map(g => g.name).join(', ')}), reaching {groupEmailTotal}{' '}
                  address{groupEmailTotal === 1 ? '' : 'es'}. This can&apos;t be undone.
                </>
              ) : (
                <>
                  This will immediately send <strong>{recipients?.count ?? 0} emails</strong>, covering all{' '}
                  {recipients?.golfers ?? 0} golfers across {recipients?.teams ?? 0} teams. This can&apos;t be undone.
                </>
              )}
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
