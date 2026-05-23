import styles from './Input.module.css'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export function Input({ className = '', ...rest }: InputProps) {
  return (
    <input
      className={`${styles.input} ${className}`}
      {...rest}
    />
  )
}
