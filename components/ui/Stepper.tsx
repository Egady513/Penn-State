'use client'

import styles from './Stepper.module.css'
import { Icon } from './Icon'

interface StepperProps {
  value: number
  onChange: (val: number) => void
  min?: number
  max?: number
  dark?: boolean
}

export function Stepper({ value, onChange, min = 0, max = 12, dark = true }: StepperProps) {
  return (
    <div className={`${styles.wrapper} ${dark ? styles.dark : styles.light}`}>
      <button
        type="button"
        aria-label="decrease"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={styles.btn}
      >
        <Icon name="minus" size={22} />
      </button>
      <div className={`${styles.value} num`}>{value}</div>
      <button
        type="button"
        aria-label="increase"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={styles.btn}
      >
        <Icon name="plus" size={22} />
      </button>
    </div>
  )
}
