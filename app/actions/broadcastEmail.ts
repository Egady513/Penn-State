'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { EVENT_ID } from '@/lib/eventId'

const NAVY = '#001E44'
const PUGH = '#96BEE6'
const BG_SOFT = '#FAF8F3'
const BORDER = '#E5E2D9'
const FG_MUTED = '#5B6470'

/** Every paid team's player ids, deduped, lowercased, valid-looking emails only. */
async function loadRecipientEmails(): Promise<{ emails: string[]; teamCount: number } | { error: string }> {
  const supabase = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: teams, error: teamErr } = await (supabase.from('team') as any)
    .select('id')
    .eq('event_id', EVENT_ID)
    .eq('payment_status', 'paid')
  if (teamErr) return { error: teamErr.message }

  const teamIds = ((teams ?? []) as { id: string }[]).map(t => t.id)
  if (teamIds.length === 0) return { emails: [], teamCount: 0 }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: players, error: playerErr } = await (supabase.from('player') as any)
    .select('email')
    .in('team_id', teamIds)
  if (playerErr) return { error: playerErr.message }

  const emails = Array.from(new Set(
    ((players ?? []) as { email: string | null }[])
      .map(p => p.email?.trim().toLowerCase())
      .filter((e): e is string => !!e && e.includes('@'))
  ))
  return { emails, teamCount: teamIds.length }
}

export async function getBroadcastRecipientCount(): Promise<{ count: number; teams: number } | { error: string }> {
  const result = await loadRecipientEmails()
  if ('error' in result) return { error: result.error }
  return { count: result.emails.length, teams: result.teamCount }
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
  out = out.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:${NAVY};font-weight:700;">${url}</a>`)
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
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">
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

  const result = await loadRecipientEmails()
  if ('error' in result) return { ok: false, sent: 0, failed: [], error: result.error }
  if (result.emails.length === 0) return { ok: false, sent: 0, failed: [], error: 'No paid teams to send to.' }

  const html = wrapHtml(subject, bodyToHtml(body))
  const text = bodyToText(body)

  let sent = 0
  const failed: string[] = []
  for (const to of result.emails) {
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
