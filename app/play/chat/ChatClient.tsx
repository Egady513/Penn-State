'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'
import { EVENT_ID } from '@/lib/eventId'
import styles from './page.module.css'

// ── Types ──────────────────────────────────────────────────────

export type MessageRow = {
  id: string
  team_id: string | null
  sender_name: string
  role: 'player' | 'admin'
  body: string
  is_pinned: boolean
  created_at: string
}

type Player = { name: string }

interface ChatClientProps {
  initialMessages: MessageRow[]
  teamId: string
  teamName: string
  isAdmin: boolean
  players: Player[]
  totalTeams: number
}

// ── Bottom nav (mirrors PlayerShell) ──────────────────────────

const TABS = [
  { id: 'home',      href: '/play/home',        label: 'Home',      icon: 'home'       },
  { id: 'scorecard', href: '/play/scorecard',   label: 'Scorecard', icon: 'scorecard'  },
  { id: 'board',     href: '/play/leaderboard', label: 'Board',     icon: 'leaderboard'},
  { id: 'chat',      href: '/play/chat',        label: 'Chat',      icon: 'megaphone'  },
  { id: 'owe',       href: '/play/owe',         label: 'Owe',       icon: 'owe'        },
]

// ── Helpers ────────────────────────────────────────────────────

/** "Jamie Miller" → "J. Miller" */
function formatName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length < 2) return fullName
  return `${parts[0][0]}. ${parts.slice(1).join(' ')}`
}

function getInitials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .map(w => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

// ── Main component ─────────────────────────────────────────────

export default function ChatClient({
  initialMessages,
  teamId,
  isAdmin,
  players,
  totalTeams,
}: ChatClientProps) {
  const pathname = usePathname()
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [senderName, setSenderName] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pinToggle, setPinToggle] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore saved name from localStorage
  useEffect(() => {
    if (isAdmin) {
      setSenderName('Eddie')
      return
    }
    const stored = localStorage.getItem(`psu_chat_name_${teamId}`)
    if (stored) setSenderName(stored)
  }, [teamId, isAdmin])

  // Scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length])

  // Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `event_id=eq.${EVENT_ID}`,
        },
        (payload) => {
          const incoming = payload.new as MessageRow
          setMessages(prev =>
            // skip if already in state from optimistic update
            prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]
          )
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Insert to DB and optimistically update UI
  async function doSend(name: string, body: string) {
    setSending(true)
    const isPinned = isAdmin && pinToggle
    const optimisticId = `opt-${Date.now()}`

    setMessages(prev => [
      ...prev,
      {
        id: optimisticId,
        team_id: isAdmin ? null : teamId,
        sender_name: name,
        role: isAdmin ? 'admin' : 'player',
        body,
        is_pinned: isPinned,
        created_at: new Date().toISOString(),
      },
    ])
    setText('')
    if (isAdmin) setPinToggle(false)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('messages')
      .insert({
        event_id: EVENT_ID,
        team_id: isAdmin ? null : teamId,
        sender_name: name,
        role: isAdmin ? 'admin' : 'player',
        body,
        is_pinned: isPinned,
      })
      .select('id')
      .single() as { data: { id: string } | null }

    // Replace optimistic id with real DB id so Realtime dedup works
    if (data?.id) {
      setMessages(prev =>
        prev.map(m => m.id === optimisticId ? { ...m, id: data.id } : m)
      )
    }

    setSending(false)
    inputRef.current?.focus()
  }

  function handleSend() {
    const body = text.trim()
    if (!body || sending) return
    if (!senderName) {
      setShowPicker(true)
    } else {
      doSend(senderName, body)
    }
  }

  function pickName(name: string) {
    localStorage.setItem(`psu_chat_name_${teamId}`, name)
    setSenderName(name)
    setShowPicker(false)
    const body = text.trim()
    if (body) doSend(name, body)
  }

  // Most-recent pinned message floats at the top
  const pinned = [...messages].reverse().find(m => m.is_pinned) ?? null
  const stream = messages.filter(m => !m.is_pinned)

  return (
    <div className={styles.shell}>

      {/* ── AppBar ─────────────────────────────────────────── */}
      <div className={styles.appBar}>
        <div>
          <div className={styles.appBarSub}>Event chat</div>
          <div className={styles.appBarTitle}>
            {totalTeams} teams · everyone sees this
          </div>
        </div>
        <div className={styles.syncBadge}>
          <Icon name="cloud-check" size={16} color="var(--psu-pugh)" />
          <span>Live</span>
        </div>
      </div>

      {/* ── Pinned message ─────────────────────────────────── */}
      {pinned && (
        <div className={styles.pinnedBar}>
          <Icon name="pin" size={15} color="var(--psu-beaver)" />
          <div className={styles.pinnedContent}>
            <div className={styles.pinnedLabel}>Pinned by Eddie</div>
            <div className={styles.pinnedBody}>{pinned.body}</div>
          </div>
        </div>
      )}

      {/* ── Message stream ─────────────────────────────────── */}
      <div className={styles.messages} ref={scrollRef}>
        {stream.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>💬</div>
            <div className={styles.emptyTitle}>Chat&apos;s open</div>
            <div className={styles.emptySub}>
              Be the first to say something — all {totalTeams} teams will see it.
            </div>
          </div>
        ) : (
          stream.map((m, i) => (
            <MessageBubble
              key={m.id}
              msg={m}
              prev={stream[i - 1] ?? null}
              isMe={!isAdmin && m.team_id === teamId}
            />
          ))
        )}
      </div>

      {/* ── Input bar ──────────────────────────────────────── */}
      <div className={styles.inputBar}>
        {isAdmin && (
          <button
            type="button"
            className={`${styles.pinBtn} ${pinToggle ? styles.pinBtnActive : ''}`}
            onClick={() => setPinToggle(v => !v)}
            title={pinToggle ? 'Will pin to top' : 'Pin this message'}
          >
            <Icon
              name="pin"
              size={18}
              color={pinToggle ? 'var(--psu-pugh)' : 'rgba(255,255,255,0.5)'}
            />
          </button>
        )}
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="Message the field…"
          className={styles.input}
          disabled={sending}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className={styles.sendBtn}
          aria-label="Send"
        >
          <Icon name="send" size={18} color="#fff" />
        </button>
      </div>

      {/* ── Bottom nav ─────────────────────────────────────── */}
      <nav className={styles.bottomNav} role="tablist">
        {TABS.map(t => {
          const active = pathname === t.href
          return (
            <Link
              key={t.id}
              href={t.href}
              role="tab"
              aria-selected={active}
              className={`${styles.tab} ${active ? styles.tabActive : ''}`}
            >
              <Icon name={t.icon} size={22} />
              <span>{t.label}</span>
              <div className={`${styles.tabDot} ${active ? styles.tabDotVisible : ''}`} />
            </Link>
          )
        })}
      </nav>

      {/* ── Name picker sheet ──────────────────────────────── */}
      {showPicker && (
        <div
          className={styles.pickerOverlay}
          onClick={() => setShowPicker(false)}
        >
          <div
            className={styles.pickerSheet}
            onClick={e => e.stopPropagation()}
          >
            <div className={styles.pickerHandle} />
            <div className={styles.pickerTitle}>Who&apos;s sending?</div>
            <div className={styles.pickerSub}>
              Your name will appear on messages from this device.
            </div>
            <div className={styles.pickerOptions}>
              {players.map(p => {
                const formatted = formatName(p.name)
                return (
                  <button
                    key={p.name}
                    type="button"
                    className={styles.pickerOption}
                    onClick={() => pickName(formatted)}
                  >
                    <div className={styles.pickerAvatar}>
                      {getInitials(formatted)}
                    </div>
                    <div>
                      <div className={styles.pickerName}>{formatted}</div>
                      <div className={styles.pickerFull}>{p.name}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── MessageBubble ──────────────────────────────────────────────

function MessageBubble({
  msg,
  prev,
  isMe,
}: {
  msg: MessageRow
  prev: MessageRow | null
  isMe: boolean
}) {
  const isAdmin = msg.role === 'admin'
  const sameAuthor =
    prev !== null &&
    prev.sender_name === msg.sender_name &&
    prev.role === msg.role

  const ini = getInitials(msg.sender_name)
  const time = formatTime(msg.created_at)

  return (
    <div className={`${styles.bubble} ${isMe ? styles.bubbleMe : ''}`}>
      {!sameAuthor && (
        <div className={`${styles.bubbleMeta} ${isMe ? styles.bubbleMetaMe : ''}`}>
          <span className={`${styles.bubbleFrom} ${isAdmin ? styles.bubbleFromAdmin : ''}`}>
            {msg.sender_name}
          </span>
          {isAdmin && <span className={styles.staffBadge}>Staff</span>}
          <span className={styles.bubbleTime}>· {time}</span>
        </div>
      )}

      <div className={`${styles.bubbleRow} ${isMe ? styles.bubbleRowMe : ''}`}>
        {!isMe && (
          <div
            className={[
              styles.bubbleAvatar,
              isAdmin    ? styles.bubbleAvatarAdmin  : '',
              sameAuthor ? styles.bubbleAvatarHidden : '',
            ].filter(Boolean).join(' ')}
          >
            {ini}
          </div>
        )}
        <div
          className={[
            styles.bubbleBody,
            isAdmin              ? styles.bubbleBodyAdmin  : '',
            isMe                 ? styles.bubbleBodyMe     : '',
            !sameAuthor && !isMe ? styles.bubbleBodyFirstL : '',
            !sameAuthor && isMe  ? styles.bubbleBodyFirstR : '',
          ].filter(Boolean).join(' ')}
        >
          {msg.body}
        </div>
      </div>
    </div>
  )
}
