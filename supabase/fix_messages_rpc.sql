-- ── RPC: send a chat message ────────────────────────────────────────────
-- Wraps the messages INSERT so anon clients bypass RLS.
-- If you have an RLS policy allowing anon inserts on messages, this is
-- redundant but harmless.  If RLS is blocking player chat, this is the fix.

CREATE OR REPLACE FUNCTION send_chat_message(
  p_event_id    uuid,
  p_team_id     uuid,
  p_sender_name text,
  p_role        text,
  p_body        text,
  p_is_pinned   boolean DEFAULT false
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO messages (event_id, team_id, sender_name, role, body, is_pinned)
  VALUES (p_event_id, p_team_id, p_sender_name, p_role::text, p_body, p_is_pinned)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION send_chat_message(uuid, uuid, text, text, text, boolean) TO anon, authenticated;

-- Also ensure RLS allows anon SELECT on messages (needed for initial load):
-- If you don't already have this, run it:
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "messages_select" ON messages FOR SELECT USING (true);
-- CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (true);
