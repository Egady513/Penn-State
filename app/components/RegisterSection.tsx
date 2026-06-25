'use client'

import { forwardRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import styles from './RegisterSection.module.css'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { registerTeam } from '@/app/actions/register'
import { createCheckoutSession } from '@/app/actions/checkout'
import { createClient } from '@/lib/supabase/client'
import { EVENT_ID } from '@/lib/eventId'

// Add-ons come from the catalog (admin-editable single source of truth).
type CatalogAddon = {
  id: string
  name: string
  price: number
  description: string | null
  tag: string | null
}

// Fallback per-golfer challenge price if the CTP/LD catalog rows aren't loaded.
const DEFAULT_CHALLENGE_UNIT = 10
type ChallengeChoice = 'individual' | 'team' | null

// Shown if the catalog query fails (e.g. before the catalog migration is run),
// so registration never shows an empty add-ons step.
const FALLBACK_ADDONS: CatalogAddon[] = [
  { id: 'fb-gimme', name: 'Gimme rope (3 ft)',                price: 10, description: 'Use anywhere on the course', tag: null },
  { id: 'fb-ctp',   name: 'Closest-to-pin entry',            price: 10, description: 'Per person',                 tag: 'ctp' },
  { id: 'fb-ld',    name: 'Long-drive entry',                price: 10, description: 'Per person',                 tag: 'ld' },
  { id: 'fb-opp',   name: 'Advantage card: opponent’s drive', price: 10, description: 'One-time advantage card',    tag: null },
  { id: 'fb-front', name: 'Advantage card: front tees',       price: 10, description: 'One-time advantage card',    tag: null },
]

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']
const SKILL_LEVELS = ['New to golf', 'Casual', 'Intermediate', 'Regular golfer']

// Shirt sizes are paused for now — flip to true to collect them again.
const SHOW_SHIRT_SIZE = false

interface GolferData {
  name: string; email: string; phone: string; shirt: string; skill: string; dietary: string
}

const blankGolfer = (): GolferData => ({ name: '', email: '', phone: '', shirt: 'M', skill: '', dietary: '' })

export const RegisterSection = forwardRef<HTMLElement>(function RegisterSection(_, ref) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [teamName, setTeamName] = useState('')
  const [single, setSingle] = useState(false)
  const [golfers, setGolfers] = useState<GolferData[]>([blankGolfer(), blankGolfer()])
  const [addons, setAddons] = useState<Record<string, boolean>>({})
  const [challenge, setChallenge] = useState<ChallengeChoice>(null)
  const [donation, setDonation] = useState('')
  const [catalog, setCatalog] = useState<CatalogAddon[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [step1Error, setStep1Error] = useState<string[]>([])
  const [showSoloModal, setShowSoloModal] = useState(false)
  const [payMethod, setPayMethod] = useState<'card' | 'venmo'>('card')

  // Load the registration add-ons from the catalog (admin-editable)
  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('catalog_item')
      .select('id, name, price, description, tag, sort_order')
      .eq('event_id', EVENT_ID)
      .eq('active', true)
      .contains('channels', ['signup'])
      .order('sort_order')
      .then(({ data, error }) => {
        // Fall back to the built-in list if the query fails or returns nothing
        // (e.g. before the catalog migration adds the tag/sort_order columns).
        const rows = data as CatalogAddon[] | null
        setCatalog(error || !rows || rows.length === 0 ? FALLBACK_ADDONS : rows)
      })
  }, [])

  const numGolfers = single ? 1 : 2
  const setGolfer = (i: number, patch: Partial<GolferData>) =>
    setGolfers(g => g.map((x, idx) => idx === i ? { ...x, ...patch } : x))

  // Derive challenge price from the CTP + LD catalog rows; other items = checkboxes
  const items = catalog ?? []
  const ctp = items.find(i => i.tag === 'ctp')
  const ld = items.find(i => i.tag === 'ld')
  const challengeUnit = (ctp?.price ?? DEFAULT_CHALLENGE_UNIT) + (ld?.price ?? DEFAULT_CHALLENGE_UNIT)
  const challengePrices = { individual: challengeUnit, team: challengeUnit * 2 }
  // Exclude the contest items (shown as the combined challenge) and the base
  // registration fee (tag 'base') — only real add-ons become checkboxes.
  const otherAddons = items.filter(i => i.tag !== 'ctp' && i.tag !== 'ld' && i.tag !== 'base')

  const addonTotal = otherAddons.filter(i => addons[i.id]).reduce((s, i) => s + i.price, 0)
  const challengeTotal = challenge ? challengePrices[challenge] : 0
  const baseFee = single ? 100 : 200
  const total = baseFee + addonTotal + challengeTotal + (Number(donation) || 0)

  // Validate step 1 on click (instead of a silently-disabled button) so we can
  // tell the user exactly what's missing.
  function continueToAddons() {
    const missing: string[] = []
    if (!teamName.trim()) missing.push('Team name')
    golfers.slice(0, numGolfers).forEach((g, i) => {
      const who = single ? 'Golfer' : `Golfer ${i + 1}`
      if (!g.name.trim()) missing.push(`${who} name`)
      if (!g.email.trim()) missing.push(`${who} email`)
    })
    setStep1Error(missing)
    if (missing.length === 0) setStep(2)
  }

  return (
    <section id="register" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <div className={styles.eyebrow}>Register</div>
          <h2 className={styles.heading}>Get your team in.</h2>

          <StepIndicator step={step} labels={['Team', 'Add-ons', 'Pay']} />

          {step === 1 && (
            <div className={styles.stepBody}>
              <Field label="Team name" required>
                <Input
                  placeholder={single ? 'Just yours, or a fun handle' : 'Nittany Drivers'}
                  value={teamName}
                  onChange={e => setTeamName(e.target.value)}
                />
              </Field>

              <label className={`${styles.singleCheck} ${single ? styles.singleCheckOn : ''}`}>
                <input
                  type="checkbox"
                  checked={single}
                  onChange={e => {
                    setSingle(e.target.checked)
                    if (e.target.checked) {
                      // A solo golfer can't enter the Team challenge
                      setChallenge(c => (c === 'team' ? null : c))
                      setShowSoloModal(true)
                    }
                  }}
                  className={styles.singleCheckInput}
                />
                <div>
                  <div className={styles.singleCheckTitle}>I&apos;m signing up as a single golfer</div>
                  <div className={styles.singleCheckSub}>
                    We&apos;ll pair you with another solo golfer or assign a partner. Your fee is $100.
                  </div>
                </div>
              </label>

              {golfers.slice(0, numGolfers).map((g, i) => (
                <div key={i} className={styles.golferBlock}>
                  <div className={styles.golferLabel}>
                    <div className={styles.golferNum}>{i + 1}</div>
                    <span className={styles.golferTitle}>{single ? 'Golfer' : `Golfer ${i + 1}`}</span>
                  </div>
                  <div className={styles.golferFields}>
                    <Field label="Full name" required>
                      <Input placeholder="Jane Smith" value={g.name}
                        onChange={e => setGolfer(i, { name: e.target.value })} />
                    </Field>
                    <Field label="Email" required>
                      <Input type="email" placeholder="jane@example.com" value={g.email}
                        onChange={e => setGolfer(i, { email: e.target.value })} />
                    </Field>
                    <Field label="Phone">
                      <Input type="tel" placeholder="(513) 555-0100" value={g.phone}
                        onChange={e => setGolfer(i, { phone: e.target.value })} />
                    </Field>
                    {SHOW_SHIRT_SIZE && (
                      <Field label="Shirt size">
                        <Select value={g.shirt} onChange={e => setGolfer(i, { shirt: e.target.value })}>
                          {SHIRT_SIZES.map(s => <option key={s}>{s}</option>)}
                        </Select>
                      </Field>
                    )}
                    <Field label="Skill level" hint="Helps us with flighting & prizes">
                      <Select value={g.skill} onChange={e => setGolfer(i, { skill: e.target.value })}>
                        <option value="">— Select —</option>
                        {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                      </Select>
                    </Field>
                    <Field label="Dietary needs" hint="Allergies, preferences, etc.">
                      <Input placeholder="None" value={g.dietary}
                        onChange={e => setGolfer(i, { dietary: e.target.value })} />
                    </Field>
                  </div>
                </div>
              ))}

              <div className={styles.stepFooter}>
                {step1Error.length > 0 && (
                  <div className={styles.missingBox}>
                    <strong>Please fill in:</strong> {step1Error.join(' · ')}
                  </div>
                )}
                <Button size="lg" onClick={continueToAddons}>
                  Continue to add-ons <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepBody}>
              <div className={styles.sectionLabel}>Add-ons (optional)</div>

              {/* Combined Long-Drive + Closest-to-Pin challenge */}
              <div className={styles.challengeCard}>
                <div className={styles.challengeTitle}>Long-Drive &amp; Closest-to-Pin Challenge</div>
                <div className={styles.challengeDesc}>Pay once — you&apos;re entered in both contests.</div>
                <div className={styles.pillRow}>
                  <button
                    type="button"
                    className={`${styles.pill} ${challenge === 'individual' ? styles.pillActive : ''}`}
                    onClick={() => setChallenge(c => (c === 'individual' ? null : 'individual'))}
                  >
                    Individual <span className={styles.pillPrice}>${challengePrices.individual}</span>
                  </button>
                  {!single && (
                    <button
                      type="button"
                      className={`${styles.pill} ${challenge === 'team' ? styles.pillActive : ''}`}
                      onClick={() => setChallenge(c => (c === 'team' ? null : 'team'))}
                    >
                      Team <span className={styles.pillPrice}>${challengePrices.team}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.addonList}>
                {otherAddons.map(a => (
                  <Checkbox
                    key={a.id}
                    checked={!!addons[a.id]}
                    onChange={v => setAddons(s => ({ ...s, [a.id]: v }))}
                    label={a.description ? `${a.name} · ${a.description}` : a.name}
                    price={a.price}
                  />
                ))}
              </div>
              <div className={styles.donationBlock}>
                <Field
                  label="Optional donation to Last Mile Food Rescue"
                  hint="100% passes through. The chapter covers processing fees."
                >
                  <Input type="number" min={0} placeholder="0" value={donation}
                    onChange={e => setDonation(e.target.value)} />
                </Field>
              </div>
              <div className={styles.stepFooterTwo}>
                <Button variant="secondary" size="lg" onClick={() => setStep(1)}>
                  <ArrowLeft size={18} /> Back
                </Button>
                <Button size="lg" onClick={() => setStep(3)}>
                  Review &amp; pay <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className={styles.stepBody}>
              <div className={styles.sectionLabel}>Review</div>
              <div className={styles.reviewCard}>
                <div className={styles.reviewEyebrow}>Team</div>
                <div className={styles.reviewTeam}>{teamName || (single ? 'Solo golfer' : 'Your team')}</div>
                {golfers.slice(0, numGolfers).map((g, i) => (
                  <div key={i} className={styles.reviewGolfer}>
                    <div>
                      <div className={styles.reviewGolferName}>{g.name || `Golfer ${i + 1}`}</div>
                      <div className={styles.reviewGolferSub}>{[g.email, g.phone].filter(Boolean).join(' · ') || '(contact info)'}</div>
                    </div>
                    {g.skill && <div className={styles.reviewGolferShirt}>{g.skill}</div>}
                  </div>
                ))}
              </div>

              <div className={styles.zeffyBlock}>
                {/* Payment method */}
                <div className={styles.sectionLabel}>Payment method</div>
                <div className={styles.pillRow}>
                  <button
                    type="button"
                    className={`${styles.pill} ${payMethod === 'card' ? styles.pillActive : ''}`}
                    onClick={() => setPayMethod('card')}
                  >
                    Credit / debit card
                  </button>
                  <button
                    type="button"
                    className={`${styles.pill} ${payMethod === 'venmo' ? styles.pillActive : ''}`}
                    onClick={() => setPayMethod('venmo')}
                  >
                    Venmo
                  </button>
                </div>

                {submitError && (
                  <div className={styles.submitError}>{submitError}</div>
                )}
                <Button
                  size="lg"
                  disabled={submitting}
                  onClick={async () => {
                    setSubmitError('')
                    setSubmitting(true)
                    const result = await registerTeam({
                      teamName,
                      isSingle: single,
                      golfers: golfers.slice(0, numGolfers),
                      addons: otherAddons.filter(i => addons[i.id]).map(i => i.id),
                      challenge,
                      donation: Number(donation) || 0,
                      paymentMethod: payMethod,
                    })
                    if (result.error || !result.pin || !result.teamId) {
                      setSubmitting(false)
                      setSubmitError(result.error ?? 'Something went wrong. Please try again.')
                      return
                    }

                    if (payMethod === 'venmo') {
                      // Open Venmo prefilled to the chapter treasurer, then confirm.
                      const note = encodeURIComponent(`Drive Out Hunger — ${teamName} (PIN ${result.pin})`)
                      const venmoUrl = `https://venmo.com/?txn=pay&recipients=psucincy_treasurer&amount=${total}&note=${note}`
                      window.open(venmoUrl, '_blank', 'noopener,noreferrer')
                      router.push(`/confirmation?team=${encodeURIComponent(teamName)}&pin=${result.pin}&method=venmo`)
                      return
                    }

                    // Card → Stripe Checkout; the webhook marks the team paid.
                    const checkout = await createCheckoutSession({
                      teamId: result.teamId,
                      amount: total,
                      teamName,
                      pin: result.pin,
                      origin: window.location.origin,
                    })
                    if (checkout.error || !checkout.url) {
                      setSubmitting(false)
                      setSubmitError(checkout.error ?? 'Could not start checkout. Please try again.')
                      return
                    }
                    window.location.href = checkout.url
                  }}
                >
                  {submitting
                    ? <><Loader2 size={18} className={styles.spinner} /> {payMethod === 'venmo' ? 'Opening Venmo…' : 'Starting checkout…'}</>
                    : <>Pay ${total} {payMethod === 'venmo' ? 'with Venmo' : ''} <ArrowRight size={18} /></>}
                </Button>
                <p className={styles.zeffyNote}>
                  {payMethod === 'venmo' ? (
                    <>You&apos;ll be taken to Venmo to pay <strong>@psucincy_treasurer</strong>. Your
                    team is reserved — we&apos;ll confirm once payment is received. Tax-deductible (EIN&nbsp;31-1100175).</>
                  ) : (
                    <>You&apos;ll be taken to our secure Stripe checkout to finish paying —
                    cards and wallets accepted. Tax-deductible (EIN&nbsp;31-1100175).</>
                  )}
                </p>
              </div>

              <div className={styles.stepFooterTwo}>
                <Button variant="secondary" size="lg" onClick={() => setStep(2)}>
                  <ArrowLeft size={18} /> Back
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sticky order summary */}
        <aside className={styles.summary}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryTitle}>Order summary</div>
            <div className={styles.summaryLine}>
              <span>{single ? 'Single golfer registration' : 'Team registration · 2 golfers'}</span>
              <span className={styles.summaryAmt}>${baseFee}</span>
            </div>
            {challenge && (
              <div className={styles.summaryLine}>
                <span>LD &amp; CTP Challenge ({challenge === 'individual' ? 'Individual' : 'Team'})</span>
                <span className={styles.summaryAmt}>${challengePrices[challenge]}</span>
              </div>
            )}
            {otherAddons.filter(i => addons[i.id]).map(i => (
              <div key={i.id} className={styles.summaryLine}>
                <span>{i.name}</span>
                <span className={styles.summaryAmt}>${i.price}</span>
              </div>
            ))}
            {Number(donation) > 0 && (
              <div className={styles.summaryLine}>
                <span>Donation to Last Mile</span>
                <span className={styles.summaryAmt}>${Number(donation)}</span>
              </div>
            )}
            <div className={styles.summaryTotal}>
              <span>Total</span>
              <span className={`${styles.summaryAmt} ${styles.summaryTotalNum}`}>${total}</span>
            </div>
            <div className={styles.summaryNote}>
              Tax-deductible · EIN 31-1100175
            </div>
          </div>
        </aside>
      </div>

      {/* Solo-golfer confirmation modal */}
      {showSoloModal && (
        <div className={styles.modalOverlay} onClick={() => setShowSoloModal(false)}>
          <div className={styles.modalCard} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTitle}>Signing up solo?</div>
            <p className={styles.modalBody}>
              No problem — we&apos;ll pair you with another single golfer to form a
              two-person team. If you already have a partner, add them as your
              second golfer instead so you&apos;re guaranteed to play together.
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setSingle(false)
                  setShowSoloModal(false)
                }}
              >
                I&apos;ll add my partner
              </Button>
              <Button size="md" onClick={() => setShowSoloModal(false)}>
                Pair me up
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
})

function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className={styles.stepIndicator}>
      {labels.map((label, i) => {
        const n = i + 1
        const done = n < step
        const active = n === step
        return (
          <div key={n} className={styles.stepItem}>
            <div className={`${styles.stepDot} ${done ? styles.stepDone : ''} ${active ? styles.stepActive : ''}`}>
              {done ? <Check size={14} strokeWidth={2.5} /> : n}
            </div>
            <span className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ''} ${done ? styles.stepLabelDone : ''}`}>
              {label}
            </span>
            {i < labels.length - 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}
