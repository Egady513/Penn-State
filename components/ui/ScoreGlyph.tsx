import styles from './ScoreGlyph.module.css'

interface ScoreGlyphProps {
  score: number | null
  par: number
  size?: number
  dark?: boolean
}

function getScoreStyle(score: number, par: number) {
  const diff = score - par
  if (diff <= -2) return { bg: 'var(--score-eagle)', shape: 'circle', double: true }
  if (diff === -1) return { bg: 'var(--score-birdie)', shape: 'circle', double: false }
  if (diff === 0)  return { bg: 'transparent', shape: 'none', double: false }
  if (diff === 1)  return { bg: 'var(--score-bogey)', shape: 'square', double: false }
  return { bg: 'var(--score-double)', shape: 'square', double: true }
}

export function ScoreGlyph({ score, par, size = 44, dark = false }: ScoreGlyphProps) {
  if (score == null) {
    return (
      <div
        className={styles.empty}
        style={{
          width: size,
          height: size,
          fontSize: size * 0.45,
          background: dark ? 'rgba(255,255,255,0.06)' : 'var(--ink-050)',
          border: dark
            ? '1px dashed rgba(255,255,255,0.25)'
            : '1px dashed var(--ink-300)',
          color: dark ? 'rgba(255,255,255,0.4)' : 'var(--ink-300)',
        }}
      >
        —
      </div>
    )
  }

  const { bg, shape, double } = getScoreStyle(score, par)
  const borderRadius =
    shape === 'circle' ? '50%' : shape === 'square' ? 6 : 6
  const boxShadow = double
    ? `0 0 0 3px #fff, 0 0 0 4px ${bg}`
    : undefined
  const color = bg === 'transparent' ? 'var(--fg)' : '#fff'

  return (
    <div
      className={`${styles.glyph} num`}
      style={{
        width: size,
        height: size,
        borderRadius,
        background: bg,
        color,
        fontSize: size * 0.5,
        boxShadow,
      }}
    >
      {score}
    </div>
  )
}
