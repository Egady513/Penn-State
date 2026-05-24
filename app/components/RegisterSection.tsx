'use client'

import { forwardRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react'
import styles from './RegisterSection.module.css'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Checkbox } from '@/components/ui/Checkbox'
import { registerTeam } from '@/app/actions/register'

const ADDONS = [
  { id: 'gimme', label: 'Gimme rope (3-ft)',            desc: 'Use anywhere on the course', price: 10 },
  { id: 'ctp',   label: 'Closest-to-pin contest',       desc: 'Enter your team',           price: 10 },
  { id: 'ld',    label: 'Long-drive contest',           desc: 'Enter your team',           price: 10 },
  { id: 'adv',   label: 'Advantage cards (pack of 2)',  desc: 'Two plays for your team',   price: 10 },
]

const SHIRT_SIZES = ['S', 'M', 'L', 'XL', 'XXL']

interface GolferData {
  name: string; email: string; phone: string; shirt: string; dietary: string
}

const blankGolfer = (): GolferData => ({ name: '', email: '', phone: '', shirt: 'M', dietary: '' })

export const RegisterSection = forwardRef<HTMLElement>(function RegisterSection(_, ref) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [teamName, setTeamName] = useState('')
  const [single, setSingle] = useState(false)
  const [golfers, setGolfers] = useState<GolferData[]>([blankGolfer(), blankGolfer()])
  const [addons, setAddons] = useState<Record<string, boolean>>({})
  const [donation, setDonation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const numGolfers = single ? 1 : 2
  const setGolfer = (i: number, patch: Partial<GolferData>) =>
    setGolfers(g => g.map((x, idx) => idx === i ? { ...x, ...patch } : x))

  const addonTotal = ADDONS.filter(a => addons[a.id]).reduce((s, a) => s + a.price, 0)
  const baseFee = single ? 100 : 200
  const total = baseFee + addonTotal + (Number(donation) || 0)

  const canContinue =
    teamName.trim() !== '' &&
    golfers.slice(0, numGolfers).every(g => g.name.trim() !== '' && g.email.trim() !== '')

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
                  onChange={e => setSingle(e.target.checked)}
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
                    <Field label="Shirt size">
                      <Select value={g.shirt} onChange={e => setGolfer(i, { shirt: e.target.value })}>
                        {SHIRT_SIZES.map(s => <option key={s}>{s}</option>)}
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
                <Button size="lg" onClick={() => setStep(2)} disabled={!canContinue}>
                  Continue to add-ons <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className={styles.stepBody}>
              <div className={styles.sectionLabel}>Add-ons (optional)</div>
              <div className={styles.addonList}>
                {ADDONS.map(a => (
                  <Checkbox
                    key={a.id}
                    checked={!!addons[a.id]}
                    onChange={v => setAddons(s => ({ ...s, [a.id]: v }))}
                    label={`${a.label} · ${a.desc}`}
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
                    <div className={styles.reviewGolferShirt}>Shirt: {g.shirt}</div>
                  </div>
                ))}
              </div>

              <div className={styles.zeffyBlock}>
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
                      feeAmount: total,
                    })
                    setSubmitting(false)
                    if (result.error || !result.pin) {
                      setSubmitError(result.error ?? 'Something went wrong. Please try again.')
                      return
                    }
                    // Open Zeffy in a new tab, then send user to confirmation
                    window.open('https://www.zeffy.com', '_blank', 'noopener,noreferrer')
                    router.push(`/confirmation?team=${encodeURIComponent(teamName)}&pin=${result.pin}`)
                  }}
                >
                  {submitting
                    ? <><Loader2 size={18} className={styles.spinner} /> Saving…</>
                    : <>Pay ${total} with Zeffy <ArrowRight size={18} /></>}
                </Button>
                <p className={styles.zeffyNote}>
                  You&apos;ll be taken to Zeffy to complete payment. Zeffy charges $0 in fees — 100% goes to the cause.
                  Your registration is tax-deductible (EIN&nbsp;31-1100175).
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
            {ADDONS.filter(a => addons[a.id]).map(a => (
              <div key={a.id} className={styles.summaryLine}>
                <span>{a.label}</span>
                <span className={styles.summaryAmt}>${a.price}</span>
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
