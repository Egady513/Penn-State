import Image from 'next/image'
import styles from './SiteFooter.module.css'

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <Image
            src="/logo-ribbon-white-brown.png"
            alt="PSU Cincinnati Alumni Association"
            width={120}
            height={36}
            style={{ height: 36, width: 'auto' }}
          />
          <div className={styles.tagline}>
            Greater Cincinnati Penn State Alumni Association · 501(c)(3) EIN 31-1100175
          </div>
        </div>
        <div className={styles.divider} />
        <div className={styles.bottom}>
          <p className={styles.cause}>
            All proceeds benefit <strong>Last Mile Food Rescue</strong> — a Cincinnati
            nonprofit rescuing food before it&apos;s wasted.
          </p>
          <p className={styles.legal}>
            &copy; 2026 Greater Cincinnati Penn State Alumni Association.
            Contributions may be tax-deductible to the extent allowed by law.
          </p>
        </div>
      </div>
    </footer>
  )
}
