import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { EVENT_ID, FALLBACK_TEAM_ID } from '@/lib/eventId'
import ChatClient from './ChatClient'
import type { MessageRow } from './ChatClient'

export default async function ChatPage() {
  const cookieStore = await cookies()
  const teamId = cookieStore.get('golf_team_id')?.value ?? FALLBACK_TEAM_ID

  const supabase = await createClient()

  const [teamRes, playersRes, messagesRes, teamCountRes] = await Promise.all([
    supabase
      .from('team')
      .select('id, name, is_admin')
      .eq('id', teamId)
      .maybeSingle(),
    supabase
      .from('player')
      .select('name')
      .eq('team_id', teamId),
    supabase
      .from('messages')
      .select('id, team_id, sender_name, role, body, is_pinned, created_at')
      .eq('event_id', EVENT_ID)
      .order('created_at', { ascending: true })
      .limit(100),
    supabase
      .from('team')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', EVENT_ID),
  ])

  const team = teamRes.data as { id: string; name: string; is_admin: boolean } | null
  const players = (playersRes.data ?? []) as { name: string }[]
  const messages = (messagesRes.data ?? []) as MessageRow[]
  const totalTeams = teamCountRes.count ?? 36

  return (
    <ChatClient
      initialMessages={messages}
      teamId={teamId}
      teamName={team?.name ?? 'Your team'}
      isAdmin={team?.is_admin ?? false}
      players={players}
      totalTeams={totalTeams}
    />
  )
}
