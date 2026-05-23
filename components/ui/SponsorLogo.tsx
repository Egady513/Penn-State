import styles from './SponsorLogo.module.css'

type SponsorLogoSize = 'sm' | 'md' | 'lg'

interface SponsorLogoProps {
  name: string
  size?: SponsorLogoSize
  className?: string
}

const heights: Record<SponsorLogoSize, number> = {
  lg: 110,
  md: 84,
  sm: 56,
}

const fontSizes: Record<SponsorLogoSize, number> = {
  lg: 16,
  md: 13,
  sm: 11,
}

export function SponsorLogo({ name, size = 'md', className = '' }: SponsorLogoProps) {
  return (
    <div
      className={`${styles.logo} ${className}`}
      style={{ height: heights[size], fontSize: fontSizes[size] }}
    >
      {name}
    </div>
  )
}
