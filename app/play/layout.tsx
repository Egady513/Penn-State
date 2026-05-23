import type { Metadata, Viewport } from 'next'
import styles from './layout.module.css'

export const metadata: Metadata = {
  title: 'Drive Out Hunger — Player App',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent' },
}

export const viewport: Viewport = {
  themeColor: '#001E44',
  viewportFit: 'cover',
}

export default function PlayerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      {children}
    </div>
  )
}
