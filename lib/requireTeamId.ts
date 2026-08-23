import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Server-side team guard for /play pages.
 *
 * Previously these pages fell back to a real seed team when no cookie was
 * present, which silently signed a visitor into someone else's scorecard and
 * let them edit it. Now a missing cookie sends them to the PIN screen.
 */
export async function requireTeamId(): Promise<string> {
  const cookieStore = await cookies()
  const teamId = cookieStore.get('golf_team_id')?.value
  if (!teamId) redirect('/play')
  return teamId
}
