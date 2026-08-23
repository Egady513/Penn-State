/**
 * Read the current team's UUID from the golf_team_id cookie.
 * Works in any browser context (scorecard, mulligans, shop).
 *
 * Returns null when no cookie is present. Callers must send the visitor to
 * the PIN screen — this used to fall back to a real seed team, which quietly
 * signed people into someone else's scorecard and let them edit it.
 */
export function getTeamId(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)golf_team_id=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}
