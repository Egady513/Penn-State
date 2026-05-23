import { forwardRef } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import styles from './DetailsSection.module.css'
import { Button } from '@/components/ui/Button'

const SCHEDULE = [
  { time: '8:00 AM',  label: 'Check-in opens · breakfast' },
  { time: '8:45 AM',  label: 'Pre-round briefing' },
  { time: '9:00 AM',  label: 'Shotgun start' },
  { time: '12:30 PM', label: 'Lunch on the course' },
  { time: '3:30 PM',  label: 'Dinner & awards' },
]

const INCLUDED = [
  'Greens fee and cart for both golfers',
  'Range balls + practice green',
  'Breakfast and on-course lunch',
  'Dinner and awards reception',
  'Tournament gift bag',
  'Live mobile scoring app',
]

export const DetailsSection = forwardRef<HTMLElement>(function DetailsSection(_, ref) {
  return (
    <section id="details" ref={ref} className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.eyebrow}>The day</div>
        <h2 className={styles.heading}>Two players. Eighteen holes. One cause.</h2>
        <p className={styles.intro}>
          A two-person scramble at Beckett Ridge with a shotgun start, lunch on the
          course, and dinner with awards in the clubhouse.
        </p>

        <div className={styles.grid}>
          <div>
            <h3 className={styles.subhead}>Schedule</h3>
            <div className={styles.schedule}>
              {SCHEDULE.map((s, i) => (
                <div key={i} className={`${styles.scheduleRow} ${i ? styles.scheduleRowBorder : ''}`}>
                  <div className={styles.scheduleTime}>{s.time}</div>
                  <div className={styles.scheduleLabel}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className={styles.subhead}>What&apos;s included</h3>
            <ul className={styles.included}>
              {INCLUDED.map((item, i) => (
                <li key={i} className={styles.includedItem}>
                  <span className={styles.checkBubble}>
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.locationCard}>
          <div>
            <div className={styles.eyebrowSmall}>Location</div>
            <div className={styles.courseName}>Beckett Ridge Golf Club</div>
            <div className={styles.courseAddr}>2960 Beckett Ridge Blvd, West Chester, OH 45069</div>
          </div>
          <Button
            variant="secondary"
            size="md"
            as="a"
            href="https://maps.google.com/?q=Beckett+Ridge+Golf+Club+West+Chester+OH"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open in maps <ExternalLink size={15} />
          </Button>
        </div>
      </div>
    </section>
  )
})
