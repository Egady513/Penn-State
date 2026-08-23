// The fixed event ID inserted by supabase/seed.sql.
// Update this constant if you ever create a new event row.
export const EVENT_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'

// REMOVED 2026-08-23: /play used to fall back to this seed team when no PIN
// cookie was present, which silently signed a visitor into a real team's
// scorecard and let them edit it. Every /play route now redirects to the PIN
// screen instead — see lib/requireTeamId.ts (server) and lib/getTeamId.ts
// (client). Do not reintroduce a fallback team.
