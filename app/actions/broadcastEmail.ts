'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { EVENT_ID } from '@/lib/eventId'
import { PAIRING_TOKEN, PIN_TOKEN } from '@/lib/broadcastToken'

const NAVY = '#001E44'
const PUGH = '#96BEE6'
const BG_SOFT = '#FAF8F3'
const BORDER = '#E5E2D9'
const FG_MUTED = '#5B6470'

interface TeamRow {
  id: string
  name: string
  pin: string | null
  pairing: string | null
  start_hole: number | null
  players: string[]
}

interface Recipients {
  /** Deduped, lowercased, valid-looking player addresses on paid teams. */
  emails: string[]
  /** email -> the team(s) that address is registered on. */
  teamsByEmail: Map<string, TeamRow[]>
  teams: TeamRow[]
  teamCount: number
  golferCount: number
}

/**
 * Every paid team plus its players, keyed by address.
 *
 * Teammates sometimes register under one shared address, so `emails.length`
 * is normally LOWER than `golferCount` - everyone is still covered, they
 * just get one copy at the shared address instead of two identical ones.
 * That same address can also cover TWO teams when somebody registered a
 * full foursome as two twosomes, which is why the map holds an array.
 */
async function loadRecipients(): Promise<Recipients | { error: string }> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teamData, error: teamErr } = await (supabase.from('team') as any)
    .select('id, name, pin, pairing, start_hole')
    .eq('event_id', EVENT_ID)
    .eq('payment_status', 'paid')
  if (teamErr) return { error: teamErr.message }

  const teamRows = (teamData ?? []) as { id: string; name: string; pin: string | null; pairing: string | null; start_hole: number | null }[]
  if (teamRows.length === 0) {
    return { emails: [], teamsByEmail: new Map(), teams: [], teamCount: 0, golferCount: 0 }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: playerData, error: playerErr } = await (supabase.from('player') as any)
    .select('team_id, name, email')
    .in('team_id', teamRows.map(t => t.id))
  if (playerErr) return { error: playerErr.message }

  const playerRows = (playerData ?? []) as { team_id: string; name: string | null; email: string | null }[]

  const teams: TeamRow[] = teamRows.map(t => ({
    ...t,
    players: playerRows.filter(p => p.team_id === t.id).map(p => p.name?.trim() || 'Golfer'),
  }))
  const teamById = new Map(teams.map(t => [t.id, t]))

  const teamsByEmail = new Map<string, TeamRow[]>()
  for (const p of playerRows) {
    const email = p.email?.trim().toLowerCase()
    if (!email || !email.includes('@')) continue
    const team = teamById.get(p.team_id)
    if (!team) continue
    const list = teamsByEmail.get(email) ?? []
    if (!list.some(t => t.id === team.id)) list.push(team)
    teamsByEmail.set(email, list)
  }

  return {
    emails: Array.from(teamsByEmail.keys()),
    teamsByEmail,
    teams,
    teamCount: teams.length,
    golferCount: playerRows.length,
  }
}

// -- Per-recipient pairing block ----------------------------------------
// A foursome is TWO 2-person teams sharing a group number, so "who you're
// playing with" means the other team holding your number.


function pairingBlock(myTeams: TeamRow[], allTeams: TeamRow[]): string {
  if (myTeams.length === 0) return ''

  const lines: string[] = ['## Your group']
  for (const mine of myTeams) {
    const group = mine.pairing?.trim()
    if (!group) {
      lines.push(`**${mine.name}** - ${mine.players.join(' & ')}`)
      lines.push("We're finalizing groups now. Yours will be posted at check-in Sunday morning.")
      continue
    }
    const partners = allTeams.filter(t => t.pairing?.trim() === group && t.id !== mine.id)
    const hole = mine.start_hole ?? partners.find(t => t.start_hole != null)?.start_hole
    lines.push(`**Group ${group}${hole != null ? ` - starting on hole ${hole}` : ''}**`)
    lines.push(`- ${mine.name}: ${mine.players.join(', ')} (you)`)
    for (const p of partners) lines.push(`- ${p.name}: ${p.players.join(', ')}`)
    if (partners.length === 0) {
      lines.push("You're a twosome for now. If another team joins your group we'll let you know at check-in.")
    }
  }
  return lines.join('\n')
}

/** Swap for the recipient's own team PIN. */
function pinBlock(myTeams: TeamRow[]): string {
  if (myTeams.length === 0) return ''
  // One address can cover two teams when a foursome registered as two
  // twosomes, so name the team when there is more than one PIN to show.
  if (myTeams.length === 1) return `**Your team PIN: ${myTeams[0].pin ?? 'see your confirmation email'}**`
  return myTeams
    .map(t => `**${t.name} PIN: ${t.pin ?? 'see your confirmation email'}**`)
    .join('\n')
}

/** Swap the token for this recipient's group, or drop it if they have none. */
function personalize(body: string, myTeams: TeamRow[], allTeams: TeamRow[]): string {
  let out = body
  if (out.includes(PAIRING_TOKEN)) out = out.split(PAIRING_TOKEN).join(pairingBlock(myTeams, allTeams))
  if (out.includes(PIN_TOKEN)) out = out.split(PIN_TOKEN).join(pinBlock(myTeams))
  return out
}

/** True when this body needs a per-recipient render. */
function isPersonalized(body: string): boolean {
  return body.includes(PAIRING_TOKEN) || body.includes(PIN_TOKEN)
}

export async function getBroadcastRecipientCount(): Promise<
  { count: number; teams: number; golfers: number; ungrouped: number } | { error: string }
> {
  const result = await loadRecipients()
  if ('error' in result) return { error: result.error }
  return {
    count: result.emails.length,
    teams: result.teamCount,
    golfers: result.golferCount,
    ungrouped: result.teams.filter(t => !t.pairing?.trim()).length,
  }
}

// ── Tiny markdown-lite → HTML/text renderer ─────────────────────────────
// Supports: "## " section headers, "- " bullets, **bold**, blank-line
// paragraphs, bare URLs auto-linked. Enough structure for a broadcast
// without building a full rich-text editor.

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function inlineHtml(s: string): string {
  let out = escapeHtml(s)
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Matches a full URL OR a bare host with a path (penn-state-topaz.vercel.app/play),
  // in ONE pass so the second form can't match inside the first one's href.
  out = out.replace(/(https?:\/\/[^\s<]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<]*)/gi, (m) => {
    const href = /^https?:\/\//i.test(m) ? m : `https://${m}`
    return `<a href="${href}" style="color:${NAVY};font-weight:700;">${m}</a>`
  })
  return out
}

function bodyToHtml(body: string): string {
  const lines = body.split('\n')
  const blocks: string[] = []
  let list: string[] = []
  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul style="margin:0 0 16px;padding-left:20px;">${list.map(li => `<li style="margin-bottom:6px;color:${NAVY};font-size:14px;line-height:1.6;">${inlineHtml(li)}</li>`).join('')}</ul>`)
      list = []
    }
  }
  for (const raw of lines) {
    const line = raw.trimEnd()
    if (line.startsWith('## ')) {
      flushList()
      blocks.push(`<div style="font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${FG_MUTED};margin:20px 0 8px;">${inlineHtml(line.slice(3))}</div>`)
    } else if (line.startsWith('- ')) {
      list.push(line.slice(2))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      blocks.push(`<p style="margin:0 0 12px;color:${NAVY};font-size:14px;line-height:1.6;">${inlineHtml(line)}</p>`)
    }
  }
  flushList()
  return blocks.join('')
}

function bodyToText(body: string): string {
  return body
    .replace(/^## (.+)$/gm, (_m, t: string) => `\n${t.toUpperCase()}\n`)
    .replace(/\*\*(.+?)\*\*/g, '$1')
}

function wrapHtml(subject: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${BG_SOFT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${NAVY};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_SOFT};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="width:100%;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
        <tr><td style="background:${NAVY};padding:24px 28px;color:#ffffff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${PUGH};">Drive Out Hunger 2026</div>
          <div style="font-size:20px;font-weight:800;margin-top:4px;">${escapeHtml(subject)}</div>
        </td></tr>
        <tr><td style="padding:28px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:18px 28px 28px;border-top:1px solid ${BORDER};background:${BG_SOFT};">
          <p style="margin:0;color:${FG_MUTED};font-size:11px;line-height:1.6;">
            Greater Cincinnati Penn State Alumni Association &middot; 501(c)(3) public charity &middot; EIN 31-1100175
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export interface BroadcastResult {
  ok: boolean
  sent: number
  failed: string[]
  error?: string
  /** Test sends report which team was used to fill in the group block. */
  note?: string
}

export interface GroupSendResult {
  ok: boolean
  sentGroups: { group: string; count: number }[]
  failed: { group: string; error: string }[]
  error?: string
}

/**
 * Send one email per group (sponsors, vendors, partners) using the same
 * branded shell as every other chapter email.
 *
 * Everyone inside a group is on the same To line — they're colleagues at the
 * same organization, so that's a normal reply-all thread, not a privacy leak.
 * Separate groups never see each other.
 */
export async function sendGroupEmails(
  subject: string,
  body: string,
  groups: { name: string; emails: string[] }[],
): Promise<GroupSendResult> {
  if (!subject.trim() || !body.trim()) {
    return { ok: false, sentGroups: [], failed: [], error: 'Subject and body are required.' }
  }
  const clean = groups
    .map(g => ({
      name: g.name.trim(),
      emails: g.emails.map(e => e.trim()).filter(e => e && e.includes('@')),
    }))
    .filter(g => g.name && g.emails.length > 0)

  if (clean.length === 0) {
    return { ok: false, sentGroups: [], failed: [], error: 'No valid groups to send to.' }
  }

  const html = wrapHtml(subject, bodyToHtml(body))
  const text = bodyToText(body)

  const sentGroups: { group: string; count: number }[] = []
  const failed: { group: string; error: string }[] = []

  for (const g of clean) {
    try {
      await sendEmail({ to: g.emails, subject, text, html })
      sentGroups.push({ group: g.name, count: g.emails.length })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`[groupEmail] failed for "${g.name}":`, err)
      failed.push({ group: g.name, error: msg })
    }
  }

  return { ok: failed.length === 0, sentGroups, failed }
}

/**
 * Send the exact same rendered email to the chapter's own inbox only.
 * Use this to eyeball real formatting before committing to a full send —
 * it goes through the identical render path, so what lands in your inbox
 * is byte-for-byte what recipients would get (minus the [TEST] subject tag).
 */
export async function sendTestEmail(subject: string, body: string): Promise<BroadcastResult> {
  if (!subject.trim() || !body.trim()) {
    return { ok: false, sent: 0, failed: [], error: 'Subject and body are required.' }
  }
  const to = process.env.GMAIL_USER
  if (!to) return { ok: false, sent: 0, failed: [], error: 'GMAIL_USER is not configured.' }

  // If the body carries the group token, fill it with a REAL team so the
  // test shows what a golfer will actually receive. Prefer a team that
  // already has a group, otherwise the block would only show the fallback.
  let rendered = body
  let note: string | undefined
  if (isPersonalized(body)) {
    const result = await loadRecipients()
    if ('error' in result) return { ok: false, sent: 0, failed: [], error: result.error }
    const sample = result.teams.find(t => t.pairing?.trim()) ?? result.teams[0]
    if (!sample) return { ok: false, sent: 0, failed: [], error: 'No paid teams to sample a group from.' }
    rendered = personalize(body, [sample], result.teams)
    note = sample.pairing?.trim()
      ? `Group block filled in with ${sample.name} (group ${sample.pairing.trim()}).`
      : `No team has a group yet, so the block shows the fallback wording using ${sample.name}.`
  }

  try {
    await sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      text: bodyToText(rendered),
      html: wrapHtml(subject, bodyToHtml(rendered)),
    })
    return { ok: true, sent: 1, failed: [], note }
  } catch (err) {
    return { ok: false, sent: 0, failed: [to], error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Sends `subject` + `body` (markdown-lite) to every player on a paid team.
 * Sends one recipient at a time (never a shared To/BCC list) so nobody
 * sees anyone else's email address — same privacy pattern as the
 * per-team "Resend confirmation" action.
 */
export async function sendBroadcastEmail(subject: string, body: string): Promise<BroadcastResult> {
  if (!subject.trim() || !body.trim()) {
    return { ok: false, sent: 0, failed: [], error: 'Subject and body are required.' }
  }

  const result = await loadRecipients()
  if ('error' in result) return { ok: false, sent: 0, failed: [], error: result.error }
  if (result.emails.length === 0) return { ok: false, sent: 0, failed: [], error: 'No paid teams to send to.' }

  // Without the token every recipient gets the identical email, so render
  // once. With it, each address needs its own copy.
  const personalized = isPersonalized(body)
  const sharedHtml = personalized ? '' : wrapHtml(subject, bodyToHtml(body))
  const sharedText = personalized ? '' : bodyToText(body)

  let sent = 0
  const failed: string[] = []
  for (const to of result.emails) {
    const mine = personalized ? personalize(body, result.teamsByEmail.get(to) ?? [], result.teams) : body
    const html = personalized ? wrapHtml(subject, bodyToHtml(mine)) : sharedHtml
    const text = personalized ? bodyToText(mine) : sharedText
    try {
      await sendEmail({ to, subject, text, html })
      sent++
    } catch (err) {
      console.error(`[broadcast] failed to send to ${to}:`, err)
      failed.push(to)
    }
  }

  return { ok: failed.length === 0, sent, failed }
}
