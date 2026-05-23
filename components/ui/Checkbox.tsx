'use client'

import styles from './Checkbox.module.css'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  price?: number
  className?: string
}

export function Checkbox({ checked, onChange, label, price, className = '' }: CheckboxProps) {
  return (
    <label className={`${styles.wrapper} ${checked ? styles.checked : ''} ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.input}
      />
      <div className={styles.label}>{label}</div>
      {price != null && (
        <div className={styles.price}>${price}</div>
      )}
    </label>
  )
}
