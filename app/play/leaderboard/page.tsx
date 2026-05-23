import styles from './page.module.css'
import { PlayerShell } from '@/components/player/PlayerShell'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { LEADERBOARD } from '@/lib/mockData'

export default function LeaderboardPage() {
  return (
    <PlayerShell
      title="Leaderboard"
      subtitle={`Live · ${LEADERBOARD.length} teams`}
      syncStatus="synced"
    >
      <div className={styles.wrap}>
        <div className={styles.sectionLabel}>Top of the field</div>
        <div className={styles.table}>
          {LEADERBOARD.map((t, i) => {
            const isLeader = t.rank === 1
            const isYou = t.you
            const toParDisplay = t.toPar === 0 ? 'E' : t.toPar > 0 ? `+${t.toPar}` : `${t.toPar}`
            const toParColor =
              t.toPar < 0 ? (isLeader ? 'var(--psu-pugh)' : 'var(--score-birdie)')
              : t.toPar > 0 ? (isLeader ? '#fff' : 'var(--score-bogey)')
              : (isLeader ? '#fff' : 'var(--ink-700)')

            return (
              <div
                key={t.rank}
                data-testid="lb-row"
                className={`
                  ${styles.row}
                  ${isLeader ? styles.rowLeader : ''}
                  ${isYou && !isLeader ? styles.rowYou : ''}
                  ${i > 0 ? styles.rowBorder : ''}
                `}
              >
                <div className={`${styles.rank} num`}>{t.rank}</div>
                <div className={styles.teamInfo}>
                  <div className={styles.teamNameRow}>
                    {isLeader && <span data-testid="trophy-icon"><Icon name="trophy" size={14} color="var(--psu-pugh)" /></span>}
                    <span className={styles.teamName}>{t.name}</span>
                    {isYou && <Badge tone="pugh" size="sm">YOU</Badge>}
                  </div>
                  <div className={styles.players}>{t.players}</div>
                </div>
                <div className={styles.thru}>thru {t.thru}</div>
                <div
                  className={`${styles.toPar} num`}
                  style={{ color: toParColor }}
                >
                  {toParDisplay}
                </div>
              </div>
            )
          })}
        </div>
        <div className={styles.hint}>
          Scores update as teams enter them.
        </div>
      </div>
    </PlayerShell>
  )
}
