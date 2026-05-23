import styles from './Field.module.css'

interface FieldProps {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

export function Field({ label, hint, required, children, className = '' }: FieldProps) {
  return (
    <label className={`${styles.field} ${className}`}>
      <span className={styles.label}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </span>
      {children}
      {hint && <span className={styles.hint}>{hint}</span>}
    </label>
  )
}
