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
          A Cincinnati 501(c)(3) and the logistics link in the fight against
          hunger. Using volunteer drivers and a dispatch app, Last Mile rescues
          surplus food from grocers, restaurants, and kitchens and delivers it
          the same day — before it&apos;s wasted — to the food pantries, shelters,
          and partner agencies (like La Soupe) that get it to neighbors in need.
          Every dollar you spend on this outing helps cover that last mile.
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
