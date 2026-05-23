'use client'

import { useRef } from 'react'
import styles from './page.module.css'
import { SiteHeader } from './components/SiteHeader'
import { HeroSection } from './components/HeroSection'
import { DetailsSection } from './components/DetailsSection'
import { SponsorsSection } from './components/SponsorsSection'
import { CauseSection } from './components/CauseSection'
import { RegisterSection } from './components/RegisterSection'
import { SiteFooter } from './components/SiteFooter'

export default function RegistrationPage() {
  const sectionRefs = {
    details: useRef<HTMLElement>(null),
    sponsors: useRef<HTMLElement>(null),
    cause: useRef<HTMLElement>(null),
    register: useRef<HTMLElement>(null),
  }

  function jumpTo(id: string) {
    const el = sectionRefs[id as keyof typeof sectionRefs]?.current
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className={styles.page}>
      <SiteHeader onJump={jumpTo} />
      <main>
        <HeroSection onJump={jumpTo} />
        <DetailsSection ref={sectionRefs.details} />
        <SponsorsSection ref={sectionRefs.sponsors} />
        <CauseSection ref={sectionRefs.cause} />
        <RegisterSection ref={sectionRefs.register} />
      </main>
      <SiteFooter />
    </div>
  )
}
