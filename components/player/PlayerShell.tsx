'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './PlayerShell.module.css'
import { Icon } from '@/components/ui/Icon'

const TABS = [
  { id: 'home',      href: '/play/home',        label: 'Home',     icon: 'home'       },
  { id: 'scorecard', href: '/play/scorecard',   label: 'Scorecard',icon: 'scorecard'  },
  { id: 'board',     href: '/play/leaderboard', label: 'Board',    icon: 'leaderboard'},
  { id: 'chat',      href: '/play/chat',         label: 'Chat',     icon: 'megaphone'  },
  { id: 'owe',       href: '/play/owe',         label: 'Owe',      icon: 'owe'        },
]

interface PlayerShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  syncStatus?: 'synced' | 'offline'
  liftBar?: boolean
}

export function PlayerShell({
  children,
  title,
  subtitle,
  syncStatus = 'synced',
  liftBar = false,
}: PlayerShellProps) {
  const pathname = usePathname()

  const syncIcon = syncStatus === 'offline' ? 'wifi-off' : 'cloud-check'
  const syncColor = syncStatus === 'offline' ? 'var(--warning)' : 'var(--psu-pugh)'

  return (
    <div className={styles.shell}>
      {/* AppBar */}
      <div className={`${styles.appBar} ${liftBar ? styles.appBarLifted : ''}`}>
        <div>
          {subtitle && <div className={styles.appBarSub}>{subtitle}</div>}
          <div className={styles.appBarTitle}>{title}</div>
        </div>
        <div className={styles.syncBadge} style={{ color: syncColor }}>
          <Icon name={syncIcon} size={16} color={syncColor} />
          <span>{syncStatus === 'offline' ? 'Offline' : 'Live'}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className={styles.content}>
        {children}
        <div className={styles.bottomPad} />
      </div>

      {/* Floating BottomNav pill */}
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
    </div>
  )
}
