import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { EVENT_ID } from '@/lib/eventId'

const PSU_NAVY = '#001E44'
const PSU_BRONZE = '#B08D57'
const FG_MUTED = '#5B6470'
const BG_SOFT = '#FAF8F3'
const BORDER = '#E5E2D9'

const EVENT_DATE_LABEL = 'Saturday, August 30, 2026'
const EVENT_LOCATION = 'Beckett Ridge Golf Club, West Chester OH'

interface ScheduleItem { time: string; label: string; detail?: string }
interface PlayerRow { name: string; email: string }
interface PurchaseRow {
  quantity: number
  amount: number
  catalog_item: { name: string; tag: string | null } | null
}

interface TemplateData {
  teamName: string
  pin: string
  isSingle: boolean
  players: PlayerRow[]
  feeAmount: number
  donationAmount: number
  purchases: PurchaseRow[]
  schedule: ScheduleItem[]
  hasHoleSponsor: boolean
  totalCents: number
}

/**
 * Send the registration confirmation email to every player on a team.
 * Pulls all data fresh from the database so it always reflects the truth
 * (no client-supplied content). Safe to call multiple times — sends one
 * message per recipient. Returns an array of message-ids or throws on
 * the first hard error.
 */
export async function sendRegistrationConfirmation(teamId: string) {
  const data = await loadTemplateData(teamId)

  // Each player gets their own email (so both golfers see the team PIN).
  const recipients = data.players.filter(p => p.email && p.email.includes('@'))
  if (recipients.length === 0) {
    throw new Error(`No player emails on team ${teamId}; cannot send confirmation.`)
  }

  const subject = `You're in — Drive Out Hunger 2026 (${data.teamName})`
  const text = buildText(data)
  const html = buildHtml(data)

  const results = []
  for (const r of recipients) {
    const info = await sendEmail({ to: r.email, subject, text, html })
    results.push({ to: r.email, messageId: info.messageId })
  }
  return results
}

// ── Data loading ──────────────────────────────────────────────────────

async function loadTemplateData(teamId: string): Promise<TemplateData> {
  const supabase = createAdminClient()

  const [teamRes, playersRes, regRes, purchaseRes, eventRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('team') as any)
      .select('name, pin, single_golfer')
      .eq('id', teamId)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('player') as any)
      .select('name, email')
      .eq('team_id', teamId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('registration') as any)
      .select('fee_amount, donation_amount')
      .eq('team_id', teamId)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('purchase') as any)
      .select('quantity, amount, channel, catalog_item:catalog_item_id(name, tag)')
      .eq('team_id', teamId),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase.from('event') as any)
      .select('schedule')
      .eq('id', EVENT_ID)
      .maybeSingle(),
  ])

  if (!teamRes.data) throw new Error(`Team ${teamId} not found`)
  const team = teamRes.data as { name: string; pin: string; single_golfer: boolean }
  const players = (playersRes.data ?? []) as PlayerRow[]
  const reg = (regRes.data ?? { fee_amount: 0, donation_amount: 0 }) as {
    fee_amount: number; donation_amount: number
  }
  const allPurchases = (purchaseRes.data ?? []) as (PurchaseRow & { channel: string })[]
  // Only signup-channel purchases belong on the confirmation; check-in
  // purchases get settled separately on the day.
  const purchases = allPurchases.filter(p => p.channel === 'signup')

  const schedule = (((eventRes.data as { schedule?: ScheduleItem[] } | null)?.schedule) ?? []) as ScheduleItem[]

  const hasHoleSponsor = purchases.some(p => p.catalog_item?.tag === 'hole_sponsor')

  const purchaseTotal = purchases.reduce(
    (s, p) => s + Number(p.amount) * Number(p.quantity || 1),
    0,
  )
  const totalCents = Math.round(
    (Number(reg.fee_amount) + Number(reg.donation_amount) + purchaseTotal) * 100,
  )

  return {
    teamName: team.name,
    pin: team.pin,
    isSingle: team.single_golfer,
    players,
    feeAmount: Number(reg.fee_amount) || 0,
    donationAmount: Number(reg.donation_amount) || 0,
    purchases,
    schedule,
    hasHoleSponsor,
    totalCents,
  }
}

// ── Formatting helpers ────────────────────────────────────────────────

const money = (dollars: number) => {
  // Render negatives with an explicit "−" sign (e.g. discount line).
  const sign = dollars < 0 ? '−' : ''
  return `${sign}$${Math.abs(dollars).toLocaleString()}`
}
const moneyFromCents = (cents: number) => `$${(cents / 100).toLocaleString()}`

function formatLineItems(d: TemplateData) {
  const lines: { label: string; amount: string }[] = []
  lines.push({
    label: d.isSingle ? 'Single golfer registration' : 'Team registration · 2 golfers',
    amount: money(d.feeAmount),
  })
  for (const p of d.purchases) {
    if (!p.catalog_item) continue
    const qty = Number(p.quantity || 1)
    const lineTotal = Number(p.amount) * qty
    const baseName = p.catalog_item.name
    const label = qty > 1 ? `${baseName} × ${qty}` : baseName
    lines.push({ label, amount: money(lineTotal) })
  }
  if (d.donationAmount > 0) {
    lines.push({ label: 'Donation to Last Mile Food Rescue', amount: money(d.donationAmount) })
  }
  return lines
}

// ── Plain-text body (fallback for clients that block HTML, also helps spam scoring) ─

function buildText(d: TemplateData): string {
  const lines = formatLineItems(d)
  const itemLines = lines.map(l => `  • ${l.label} — ${l.amount}`).join('\n')

  const scheduleLines = d.schedule.length > 0
    ? d.schedule.map(s => `  ${s.time} — ${s.label}${s.detail ? ` (${s.detail})` : ''}`).join('\n')
    : '  Schedule details will be sent closer to the date.'

  const soloBlock = d.isSingle
    ? '\nSolo golfer? We\'ll pair you with another single golfer to form a two-person team. You\'ll get a second email once we\'ve matched you up, with your partner\'s name and your shared team info.\n'
    : ''

  const sponsorBlock = d.hasHoleSponsor
    ? '\nThanks for stepping up as a hole sponsor! Your team name will appear on the public page under "Hole Sponsors." If you\'d like to upload a company logo or list a different name on the hole, just reply to this email.\n'
    : ''

  return `Welcome to Drive Out Hunger 2026, ${d.teamName}!

Your team is officially registered. Thanks for helping put food on Cincinnati tables for families in need.

────────────────────────────────────
YOUR TEAM PIN: ${d.pin}
────────────────────────────────────
You'll need this PIN on game day to open the player app — scorecard, leaderboard, mulligans, chat, and your running tab. Save this email or screenshot the PIN.

WHAT YOU SIGNED UP FOR
${itemLines}

  TOTAL: ${moneyFromCents(d.totalCents)}

EVENT DETAILS
  ${EVENT_DATE_LABEL}
  ${EVENT_LOCATION}

${scheduleLines}
${soloBlock}${sponsorBlock}
ABOUT LAST MILE FOOD RESCUE
A Cincinnati 501(c)(3) and the logistics link in the fight against hunger. Last Mile uses volunteer drivers to rescue surplus food from grocers, restaurants, and kitchens — and delivers it the same day, before it's wasted, to the pantries and shelters that get it to families in need. Every dollar from this outing helps cover that last mile.
Learn more: https://lastmilefood.org

Need to make a change? Just reply to this email.

Greater Cincinnati Penn State Alumni Association
501(c)(3) public charity · EIN 31-1100175
Your donation is tax-deductible to the extent permitted by law.
`
}

// ── HTML body (the one most recipients actually see) ──────────────────

function buildHtml(d: TemplateData): string {
  const lines = formatLineItems(d)
  const itemRows = lines.map(l => `
    <tr>
      <td style="padding:8px 0;color:${PSU_NAVY};font-size:14px;">${escapeHtml(l.label)}</td>
      <td style="padding:8px 0;color:${PSU_NAVY};font-size:14px;text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap;">${escapeHtml(l.amount)}</td>
    </tr>`).join('')

  const scheduleRows = d.schedule.length > 0
    ? d.schedule.map(s => `
      <tr>
        <td style="padding:6px 16px 6px 0;color:${PSU_NAVY};font-size:14px;font-weight:600;white-space:nowrap;vertical-align:top;">${escapeHtml(s.time)}</td>
        <td style="padding:6px 0;color:${PSU_NAVY};font-size:14px;vertical-align:top;">
          <div>${escapeHtml(s.label)}</div>
          ${s.detail ? `<div style="color:${FG_MUTED};font-size:13px;">${escapeHtml(s.detail)}</div>` : ''}
        </td>
      </tr>`).join('')
    : `<tr><td colspan="2" style="padding:6px 0;color:${FG_MUTED};font-size:13px;font-style:italic;">Schedule details will be sent closer to the date.</td></tr>`

  const soloBlock = d.isSingle ? `
    <div style="margin-top:24px;padding:14px 16px;border-left:3px solid ${PSU_BRONZE};background:${BG_SOFT};border-radius:0 8px 8px 0;">
      <div style="font-weight:700;color:${PSU_NAVY};font-size:14px;margin-bottom:4px;">Solo golfer?</div>
      <div style="color:${PSU_NAVY};font-size:13px;line-height:1.5;">We'll pair you with another single golfer to form a two-person team. You'll get a second email once we've matched you up, with your partner's name and your shared team info.</div>
    </div>` : ''

  const sponsorBlock = d.hasHoleSponsor ? `
    <div style="margin-top:12px;padding:14px 16px;border-left:3px solid ${PSU_BRONZE};background:${BG_SOFT};border-radius:0 8px 8px 0;">
      <div style="font-weight:700;color:${PSU_NAVY};font-size:14px;margin-bottom:4px;">Thanks for sponsoring a hole!</div>
      <div style="color:${PSU_NAVY};font-size:13px;line-height:1.5;">Your team name will appear on the public page under "Hole Sponsors." If you'd like to upload a company logo or list a different name on the hole, just reply to this email and we'll set it up.</div>
    </div>` : ''

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${BG_SOFT};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${PSU_NAVY};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_SOFT};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};">

        <tr><td style="background:${PSU_NAVY};padding:24px 28px;color:#ffffff;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#96BEE6;">Registration confirmed</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px;">Drive Out Hunger 2026</div>
        </td></tr>

        <tr><td style="padding:28px 28px 8px;">
          <p style="margin:0 0 12px;font-size:17px;font-weight:700;">Welcome to Drive Out Hunger 2026, ${escapeHtml(d.teamName)}!</p>
          <p style="margin:0 0 20px;color:${FG_MUTED};font-size:14px;line-height:1.6;">
            Your team is officially registered. Thanks for helping put food on Cincinnati tables for families in need.
          </p>
        </td></tr>

        <tr><td style="padding:0 28px 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${BG_SOFT};border:1px solid ${BORDER};border-radius:10px;padding:18px;text-align:center;">
            <tr><td style="text-align:center;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${FG_MUTED};">Your team PIN</div>
              <div style="font-size:36px;font-weight:800;letter-spacing:0.1em;color:${PSU_NAVY};margin-top:6px;font-variant-numeric:tabular-nums;">${escapeHtml(d.pin)}</div>
              <div style="font-size:12px;color:${FG_MUTED};margin-top:6px;">You'll need this on game day to open the player app</div>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="padding:0 28px 8px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${FG_MUTED};margin-bottom:8px;">What you signed up for</div>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${itemRows}
            <tr><td colspan="2" style="padding-top:6px;border-top:1px solid ${BORDER};"></td></tr>
            <tr>
              <td style="padding:8px 0;color:${PSU_NAVY};font-size:15px;font-weight:700;">Total</td>
              <td style="padding:8px 0;color:${PSU_NAVY};font-size:18px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;">${moneyFromCents(d.totalCents)}</td>
            </tr>
          </table>
        </td></tr>

        <tr><td style="padding:24px 28px 8px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${FG_MUTED};margin-bottom:8px;">Event details</div>
          <div style="color:${PSU_NAVY};font-size:14px;font-weight:600;">${EVENT_DATE_LABEL}</div>
          <div style="color:${FG_MUTED};font-size:14px;margin-bottom:14px;">${EVENT_LOCATION}</div>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${scheduleRows}
          </table>
        </td></tr>

        ${soloBlock || sponsorBlock ? `<tr><td style="padding:8px 28px 0;">${soloBlock}${sponsorBlock}</td></tr>` : ''}

        <tr><td style="padding:24px 28px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${FG_MUTED};margin-bottom:8px;">About Last Mile Food Rescue</div>
          <p style="margin:0;color:${PSU_NAVY};font-size:13px;line-height:1.6;">
            A Cincinnati 501(c)(3) and the logistics link in the fight against hunger. Last Mile uses volunteer drivers to rescue surplus food from grocers, restaurants, and kitchens — and delivers it the same day, before it's wasted, to the pantries and shelters that get it to families in need. Every dollar from this outing helps cover that last mile.
          </p>
          <p style="margin:10px 0 0;font-size:13px;">
            <a href="https://lastmilefood.org" style="color:${PSU_NAVY};font-weight:600;">Learn more about Last Mile →</a>
          </p>
        </td></tr>

        <tr><td style="padding:18px 28px 28px;border-top:1px solid ${BORDER};background:${BG_SOFT};">
          <p style="margin:0 0 10px;color:${FG_MUTED};font-size:13px;">
            Need to make a change? Just reply to this email.
          </p>
          <p style="margin:0;color:${FG_MUTED};font-size:11px;line-height:1.6;">
            Greater Cincinnati Penn State Alumni Association · 501(c)(3) public charity · EIN 31-1100175<br>
            Your donation is tax-deductible to the extent permitted by law.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}
