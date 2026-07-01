'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Calendar, MapPin, Flag, CreditCard, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'

// ── Brand tokens ────────────────────────────────────────────────────────
const NAVY = '#001E44'
const DEEP = '#00132B'
const PUGH = '#96BEE6'
const BRONZE = '#A2783A'
const CREAM = '#F7F5F0'
const BODY = '#3A475C'
const MUTED = '#8a93a6'
const CHIP_BG = '#E2EEF9'
const CHIP_BORDER = '#C6DBF1'

// ── Static flyer content (edit here) ────────────────────────────────────
const STATS = [
  { label: 'Date', value: 'Aug 30, 2026', Icon: Calendar },
  { label: 'Course', value: 'Beckett Ridge', Icon: MapPin },
  { label: 'Format', value: '2-Person Scramble', Icon: Flag },
  { label: 'Entry', value: '$200 / team', Icon: CreditCard },
  { label: 'Tee-off', value: '8:00 AM shotgun', Icon: Clock },
]
const INCLUDES = ['Green fees', 'Cart fees', 'Breakfast', 'Post-round lunch & awards', 'Player goodie bags']
const ADDONS = ['Hole contests', 'Advantage cards', '“Sink-It, Keep It” putting green challenge', 'Raffle']
const REGISTER_URL = 'https://penn-state-topaz.vercel.app/'
const CONTACT_PHONE = '513-708-0874'

const FORMATS = {
  post: { w: 1080, h: 1350, label: 'Post · 4:5' },
  story: { w: 1080, h: 1920, label: 'Story · 9:16' },
} as const
type FormatKey = keyof typeof FORMATS

type Sponsor = {
  id: string
  name: string
  sponsorship_type: string | null
  logo_url: string | null
}

const isHole = (s: Sponsor) => !!s.sponsorship_type?.toLowerCase().includes('hole')

export default function FlyerPage() {
  const [format, setFormat] = useState<FormatKey>('post')
  const [scale, setScale] = useState(0.42)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [libReady, setLibReady] = useState(false)
  const [sponsors, setSponsors] = useState<Sponsor[]>([])

  const stageRef = useRef<HTMLDivElement>(null)
  const flyerRef = useRef<HTMLDivElement>(null)

  const dims = FORMATS[format]

  // Sponsor grid auto-fits to the roster: fewer sponsors = bigger tiles,
  // more sponsors = more columns + shorter tiles, so it always stays balanced
  // and never overflows the fixed artboard. Empty = 3 placeholder tiles.
  const spN = sponsors.length
  const spTiles: (Sponsor | null)[] = spN > 0 ? sponsors : [null, null, null]
  const spCols = spN === 0 ? 3 : spN === 1 ? 1 : (spN === 2 || spN === 4) ? 2 : spN >= 10 ? 4 : 3
  const spRows = Math.ceil(spTiles.length / spCols)
  const spTileH = spRows <= 1 ? 116 : spRows === 2 ? 98 : spRows === 3 ? 82 : 68

  // Load the real, active (non-hole) sponsors — logos auto-update with the DB.
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('sponsor')
      .select('id, name, sponsorship_type, logo_url, sort_order')
      .eq('event_id', EVENT_ID)
      .eq('active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        const rows = (data as Sponsor[] | null) ?? []
        if (!error) setSponsors(rows.filter(s => !isHole(s)))
      })
  }, [])

  // Pull in html-to-image from CDN (avoids a build dependency).
  useEffect(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).htmlToImage) { setLibReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.js'
    s.onload = () => setLibReady(true)
    s.onerror = () => setStatus('Could not load the image library')
    document.body.appendChild(s)
  }, [])

  // Fit the 1080px artboard to the viewport.
  useEffect(() => {
    const compute = () => {
      const availW = (stageRef.current?.clientWidth ?? 480) - 40
      const availH = (typeof window !== 'undefined' ? window.innerHeight : 900) - 190
      let s = Math.min(availW / dims.w, availH / dims.h)
      s = Math.min(s, 0.62)
      setScale(isFinite(s) && s > 0 ? s : 0.4)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [dims.w, dims.h])

  async function download() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lib = (window as any).htmlToImage
    if (!flyerRef.current || !lib || busy) return
    setBusy(true)
    setStatus(`Rendering ${dims.w}×${dims.h}…`)
    try {
      if (document.fonts?.ready) await document.fonts.ready
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const dataUrl = await lib.toPng(flyerRef.current, {
        width: dims.w,
        height: dims.h,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: NAVY,
        style: { transform: 'none', margin: '0', left: '0', top: '0' },
      })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `drive-out-hunger-2026-${format}-${dims.w}x${dims.h}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setStatus(`Saved ${dims.w}×${dims.h} PNG`)
    } catch (err) {
      console.error('Flyer export failed:', err)
      setStatus('Export failed — see console')
    } finally {
      setBusy(false)
    }
  }

  const segBtn = (active: boolean): CSSProperties => ({
    appearance: 'none', border: 'none', padding: '10px 18px',
    fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
    color: active ? NAVY : '#aeb6c6',
    background: active ? PUGH : 'transparent',
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0e1117', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 56, fontFamily: 'var(--font-sans)' }}>
      {/* Toolbar (not part of the export) */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '14px 24px', background: 'rgba(14,17,23,0.92)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, marginRight: 'auto' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>Drive Out Hunger 2026</span>
          <span style={{ fontSize: 12, color: MUTED }}>Social flyer · export-ready</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6f7889' }}>Size</span>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', boxShadow: '0 0 0 1px rgba(255,255,255,0.14)' }}>
            <button onClick={() => setFormat('post')} style={segBtn(format === 'post')}>{FORMATS.post.label}</button>
            <button onClick={() => setFormat('story')} style={segBtn(format === 'story')}>{FORMATS.story.label}</button>
          </div>
        </div>
        <button onClick={download} disabled={busy || !libReady} style={{ appearance: 'none', border: 0, cursor: busy || !libReady ? 'default' : 'pointer', fontWeight: 700, fontSize: 14, color: NAVY, background: PUGH, padding: '11px 22px', borderRadius: 10, opacity: busy || !libReady ? 0.6 : 1 }}>
          {busy ? 'Rendering…' : libReady ? 'Download PNG' : 'Loading…'}
        </button>
        <span style={{ fontSize: 12, color: MUTED, minWidth: 90 }}>{status}</span>
      </div>

      {/* Scaled stage */}
      <div ref={stageRef} style={{ width: '100%', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', padding: '28px 20px 0' }}>
        <div style={{ position: 'relative', width: dims.w * scale, height: dims.h * scale }}>
          {/* ── Artboard (the exported image) ── */}
          <div
            ref={flyerRef}
            style={{
              position: 'absolute', top: 0, left: 0, width: dims.w, height: dims.h,
              transform: `scale(${scale})`, transformOrigin: 'top left',
              background: NAVY, color: '#fff', overflow: 'hidden',
              fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Hero — navy, headline top-left, Last Mile image right (registration styling) */}
            <div style={{ position: 'relative', overflow: 'hidden', flex: '1 1 auto', minHeight: 430, background: NAVY, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 40, padding: '64px 56px 44px', boxSizing: 'border-box' }}>
              {/* Sun-spot glow (matches the registration hero) */}
              <div aria-hidden style={{ position: 'absolute', top: -90, right: -90, width: 440, height: 440, borderRadius: '50%', background: 'radial-gradient(circle, rgba(150,190,230,0.18), transparent 70%)', filter: 'blur(8px)', pointerEvents: 'none', zIndex: 0 }} />
              <div style={{ flex: '1 1 auto', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'inline-block', fontSize: 15, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: PUGH, background: 'rgba(150,190,230,0.16)', padding: '8px 18px', borderRadius: 999, marginBottom: 22 }}>
                  2nd Annual
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 72, lineHeight: 0.94, letterSpacing: '-0.035em', margin: 0, color: '#fff' }}>Drive Out<br />Hunger Golf<br />Outing</h1>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 500, fontSize: 26, lineHeight: 1.28, color: PUGH, marginTop: 20, maxWidth: 480 }}>
                  A 2-person scramble benefiting Last Mile Food Rescue.
                </div>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/lastmile-hero.png"
                alt="Last Mile Food Rescue"
                width={340}
                height={340}
                style={{ flex: 'none', position: 'relative', zIndex: 1, width: 340, height: 340, borderRadius: 20, objectFit: 'cover', boxShadow: '0 0 0 4px rgba(150,190,230,0.22), 0 24px 60px rgba(0,0,0,0.4)' }}
              />
            </div>

            {/* Stat band */}
            <div style={{ flex: '0 0 auto', background: DEEP, padding: '26px 50px', borderTop: '1px solid rgba(255,255,255,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              {STATS.map(({ label, value, Icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{ flex: 'none', width: 44, height: 44, borderRadius: 11, background: 'rgba(150,190,230,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={20} color={PUGH} strokeWidth={1.9} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: PUGH }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, lineHeight: 1.05, color: '#fff', letterSpacing: '-0.01em', marginTop: 2, whiteSpace: 'nowrap' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Details band (cream) */}
            <div style={{ flex: '0 0 auto', background: CREAM, color: NAVY, padding: '32px 52px 30px', display: 'flex', flexDirection: 'column', gap: 22 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: BRONZE }}>Every entry fights hunger</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 39, lineHeight: 1.08, marginTop: 9, color: NAVY, letterSpacing: '-0.015em' }}>
                  100% of proceeds benefit <span style={{ color: BRONZE }}>Last Mile Food Rescue</span>
                </div>
                <div style={{ fontSize: 25, lineHeight: 1.55, color: BODY, marginTop: 12 }}>
                  1 in 5 of our neighbors faces hunger. Last Mile rescues good food before it&apos;s wasted and rushes it to local pantries — your team helps fund the next delivery.
                </div>
              </div>

              <div style={{ height: 1, background: '#E2E6EC' }} />

              <div>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: NAVY }}>Your team&apos;s entry includes</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 12 }}>
                  {INCLUDES.map(t => (
                    <span key={t} style={{ fontSize: 15, fontWeight: 600, color: NAVY, background: CHIP_BG, border: `1px solid ${CHIP_BORDER}`, padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>{t}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 9, marginTop: 14 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: BRONZE }}>Add-ons</span>
                  {ADDONS.map(t => (
                    <span key={t} style={{ fontSize: 14, fontWeight: 600, color: '#7a5a26', background: '#fff', border: `1px dashed ${BRONZE}`, padding: '7px 14px', borderRadius: 999, whiteSpace: 'nowrap' }}>{t}</span>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: '#E2E6EC' }} />

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: NAVY }}>Proudly supported by</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${spCols}, 1fr)`, gap: 14, marginTop: 14 }}>
                  {spTiles.map((s, i) => (
                    <div key={s?.id ?? `ph-${i}`} style={{ height: spTileH, borderRadius: 10, overflow: 'hidden', background: '#FFFFFF', border: '1px solid #E2E6EC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10, boxSizing: 'border-box' }}>
                      {s?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.logo_url} alt={s.name} crossOrigin="anonymous" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                      ) : (
                        <span style={{ fontSize: 14, fontWeight: 600, color: s ? NAVY : '#9aa3b4', textAlign: 'center' }}>{s ? s.name : 'Logo'}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Register box */}
              <div style={{ background: NAVY, borderRadius: 14, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 10px 22px rgba(0,30,68,0.18)' }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, lineHeight: 1.1, color: '#fff', letterSpacing: '-0.01em' }}>Register your team online</div>
                  <div style={{ fontSize: 34, fontWeight: 700, color: PUGH, letterSpacing: '0.005em', marginTop: 4 }}>{REGISTER_URL}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#7E8AA0', marginTop: 6 }}>Questions? Call or text Eddie Gady: {CONTACT_PHONE}</div>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/register-qr.png" alt="Register QR code" width={104} height={104} style={{ flex: 'none', width: 104, height: 104, borderRadius: 8, background: '#fff', padding: 6, boxSizing: 'border-box' }} />
              </div>

              <div style={{ fontSize: 13, lineHeight: 1.5, color: MUTED, textAlign: 'center' }}>
                Hosted by the Greater Cincinnati Penn State Alumni Association
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, fontSize: 12, color: '#6f7889', textAlign: 'center', maxWidth: 560, padding: '0 20px' }}>
        Sponsor logos pull live from your admin sponsor list. Toggle Post / Story, then Download PNG (renders at full 1080×1350 or 1080×1920).
      </div>
    </div>
  )
}
