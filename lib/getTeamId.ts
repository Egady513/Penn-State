import { FALLBACK_TEAM_ID } from './eventId'

/**
 * Read the current team's UUID from the golf_team_id cookie.
 * Works in any browser context (scorecard, mulligans).
 * Falls back to Nittany Drivers when no cookie is present (dev/demo).
 */
export function getTeamId(): string {
  if (typeof document === 'undefined') return FALLBACK_TEAM_ID
  const match = document.cookie.match(/(?:^|;\s*)golf_team_id=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : FALLBACK_TEAM_ID
}
