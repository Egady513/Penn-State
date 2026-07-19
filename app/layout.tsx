import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Drive Out Hunger Golf Outing',
  description:
    'Greater Cincinnati Penn State Alumni Association — August 30, 2026 at Beckett Ridge Golf Club. Benefits Last Mile Food Rescue.',
  metadataBase: new URL('https://penn-state-topaz.vercel.app'),
  openGraph: {
    title: 'Drive Out Hunger Golf Outing',
    description: 'August 30, 2026 · Beckett Ridge Golf Club · Benefits Last Mile Food Rescue',
    type: 'website',
    images: [
      {
        url: '/lastmile-hero.png',
        width: 1181,
        height: 686,
        alt: 'Last Mile Food Rescue',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Drive Out Hunger Golf Outing',
    description: 'August 30, 2026 · Beckett Ridge Golf Club · Benefits Last Mile Food Rescue',
    images: ['/lastmile-hero.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#001E44',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
