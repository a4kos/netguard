import type { Extension } from '@/lib/types'

export function severityBG(s: string) {
  return ({ critical: 'критичен', high: 'висок', medium: 'среден', low: 'нисък' } as Record<string, string>)[s] ?? s
}

export function severityColor(s: string) {
  return ({ critical: '#f14c4c', high: '#e8834a', medium: '#e5c07b', low: '#39d0ff' } as Record<string, string>)[s] ?? '#cdd9e5'
}

export function Badge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    critical: { bg: 'rgba(241,76,76,0.18)', color: '#f14c4c' },
    high:     { bg: 'rgba(232,131,74,0.18)', color: '#e8834a' },
    medium:   { bg: 'rgba(229,192,123,0.15)', color: '#e5c07b' },
    low:      { bg: 'rgba(57,208,255,0.12)', color: '#39d0ff' },
  }
  const c = colors[severity] ?? colors.low
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '9px',
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: '3px',
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      background: c.bg,
      color: c.color,
    }}>
      {severityBG(severity)}
    </span>
  )
}

export function ScoreBar({ score }: { score: number }) {
  const pct = Math.min((score / 10) * 100, 100)
  const color = score >= 7 ? '#f14c4c' : score >= 5 ? '#e8834a' : score >= 3 ? '#e5c07b' : '#23d18b'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ height: '4px', borderRadius: '2px', background: '#2a3a4d', flex: 1, minWidth: '60px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '2px', width: `${pct}%`, background: color, transition: 'width 0.4s' }} />
      </div>
      <span style={{ fontSize: '11px', color: '#495970', minWidth: '26px', textAlign: 'right' }}>
        {(score ?? 0).toFixed(1)}
      </span>
    </div>
  )
}

export function AiBtn({ onClick, children, variant = 'default', disabled }: {
  onClick: () => void
  children: React.ReactNode
  variant?: 'default' | 'research'
  disabled?: boolean
}) {
  const styles = variant === 'research'
    ? { background: 'rgba(180,142,173,0.12)', borderColor: 'rgba(180,142,173,0.3)', color: '#b48ead' }
    : { background: 'rgba(57,208,255,0.1)', borderColor: 'rgba(57,208,255,0.25)', color: '#39d0ff' }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '10px',
        padding: '4px 10px',
        borderRadius: '4px',
        border: `1px solid ${styles.borderColor}`,
        background: styles.background,
        color: styles.color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.12s',
      }}
    >
      {children}
    </button>
  )
}
