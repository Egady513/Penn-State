import Image from 'next/image'

interface LogoRibbonProps {
  height?: number
  className?: string
}

export function LogoRibbon({ height = 44, className = '' }: LogoRibbonProps) {
  return (
    <Image
      src="/logo-ribbon-white-brown.png"
      alt="Greater Cincinnati Penn State Alumni Association"
      height={height}
      width={height * 3}
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  )
}
