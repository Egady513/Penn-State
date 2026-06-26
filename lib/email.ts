import nodemailer from 'nodemailer'

/**
 * Gmail SMTP transport. SERVER-ONLY — never import in client components.
 * Credentials come from env vars (.env.local + Vercel):
 *   GMAIL_USER          = egady513@gmail.com
 *   GMAIL_APP_PASSWORD  = 16-char app password (NOT the real Gmail password)
 *
 * Messages sent through this transport appear in the user's Gmail Sent folder.
 * Replies route back to the same inbox.
 */
let _transporter: nodemailer.Transporter | null = null

export function getMailer(): nodemailer.Transporter {
  if (_transporter) return _transporter
  const user = process.env.GMAIL_USER
  const pass = process.env.GMAIL_APP_PASSWORD
  if (!user || !pass) {
    throw new Error('GMAIL_USER / GMAIL_APP_PASSWORD env vars not set')
  }
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
  return _transporter
}

export interface SendArgs {
  to: string | string[]
  subject: string
  text: string
  html: string
}

export async function sendEmail({ to, subject, text, html }: SendArgs) {
  const from = `Drive Out Hunger Golf Outing <${process.env.GMAIL_USER}>`
  return getMailer().sendMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo: process.env.GMAIL_USER,
  })
}
