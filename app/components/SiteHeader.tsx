'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import styles from './SiteHeader.module.css'
import { Button } from '@/components/ui/Button'

interface SiteHeaderProps {
  onJump: (id: string) => void
}

const navLinks = [
  { id: 'details',  label: 'Event' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'cause',    label: 'The cause' },
  { id: 'register', label: 'Register' },
]

export function SiteHeader({ onJump }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <Image
          src="/logo-ribbon-white-brown.png"
          alt="PSU Cincinnati Alumni Association"
          width={148}
          height={44}
          style={{ height: 44, width: 'auto' }}
          priority
        />
        <div className={styles.spacer} />
        <nav className={styles.nav}>
          {navLinks.map(l => (
            <a
              key={l.id}
              href={`#${l.id}`}
              className={styles.navLink}
              onClick={e => { e.preventDefault(); onJump(l.id) }}
            >
              {l.label}
            </a>
          ))}
          <Button variant="pugh" size="sm" onClick={() => onJump('register')}>
            Register your team
          </Button>
        </nav>
      </div>
    </header>
  )
}
