import styles from './Select.module.css'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string
  children: React.ReactNode
}

export function Select({ className = '', children, ...rest }: SelectProps) {
  return (
    <select className={`${styles.select} ${className}`} {...rest}>
      {children}
    </select>
  )
}
