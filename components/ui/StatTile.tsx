import styles from './StatTile.module.css'

type StatTileAccent = 'navy' | 'pugh' | 'white'

interface StatTileProps {
  label: string
  value: string | number
  sub?: string
  accent?: StatTileAccent
  className?: string
}

export function StatTile({ label, value, sub, accent = 'navy', className = '' }: StatTileProps) {
  return (
    <div className={`${styles.tile} ${styles[accent]} ${className}`}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} num`}>{value}</div>
      {sub && <div className={styles.sub}>{sub}</div>}
    </div>
  )
}
