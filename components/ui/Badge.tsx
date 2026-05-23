import styles from './Badge.module.css'

type BadgeTone =
  | 'neutral'
  | 'info'
  | 'paid'
  | 'unpaid'
  | 'danger'
  | 'onDark'
  | 'pugh'
  | 'bronze'
  | 'eagle'
  | 'birdie'
  | 'par'

type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  tone?: BadgeTone
  size?: BadgeSize
  children: React.ReactNode
  className?: string
}

export function Badge({ tone = 'neutral', size = 'sm', children, className = '' }: BadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[tone]} ${styles[size]} ${className}`}>
      {children}
    </span>
  )
}
