import { forwardRef } from 'react'
import { ExternalLink } from 'lucide-react'
import styles from './CauseSection.module.css'
import { Button } from '@/components/ui/Button'

export const CauseSection = forwardRef<HTMLElement>(function CauseSection(_, ref) {
  return (
    <section id="cause" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>The cause</div>
        <h2 className={styles.heading}>Last Mile Food Rescue</h2>
        <p className={styles.body}>
          Last Mile rescues surplus food from grocers, restaurants, and kitchens
          and delivers it to the pantries and shelters that get it to families in need.
          Every dollar from this outing helps cover that last mile.
        </p>
        <div className={styles.ctas}>
          <Button
            variant="pugh"
            size="md"
            as="a"
            href="https://lastmilefood.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn more about Last Mile <ExternalLink size={16} />
          </Button>
        </div>
      </div>
    </section>
  )
})
