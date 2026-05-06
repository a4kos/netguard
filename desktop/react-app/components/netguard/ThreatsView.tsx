'use client'

import { useState } from 'react'
import type { Extension } from '@/lib/types'
import { Badge, ScoreBar, AiBtn } from './helpers'

interface Props {
  threats: Extension[]
  onOpenDetail: (ext: Extension) => void
}

const FILTERS = ['all', 'critical', 'high', 'medium'] as const
const FILTER_LABELS: Record<string, string> = { all: 'Всички', critical: 'Критични', high: 'Високи', medium: 'Средни' }

export default function ThreatsView({ threats, onOpenDetail }: Props) {
  const [filter, setFilter] = useState<string>('all')

  const filtered = filter === 'all' ? threats : threats.filter(t => t.severity === filter)

  return (
    <>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Маркирани разширения
        </div>
        <div style={{ fontSize: '11px', color: '#495970', marginTop: '3px' }}>
          {'Рисков резултат ≥ 3 · сортирани по ниво'}
        </div>
      </div>

      <div style={{ background: '#111820', border: '1px solid #1c2535', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1c2535' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Заплахи</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: '10px', padding: '4px 10px', borderRadius: '4px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                border: '1px solid',
                borderColor: filter === f ? '#0096b4' : '#243040',
                background: filter === f ? '#0096b4' : 'transparent',
                color: filter === f ? '#fff' : '#495970',
                cursor: 'pointer', transition: 'all 0.12s',
              }}>
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Разширение','Разрешения','Ниво','Резултат','ИИ'].map(h => (
                <th key={h} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#495970', padding: '10px 20px', textAlign: 'left', borderBottom: '1px solid #1c2535', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: '#495970' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>✓</div>
                <div style={{ fontSize: '13px' }}>Няма заплахи за този филтър</div>
              </td></tr>
            ) : filtered.map(t => (
              <tr key={t.ext_id} onClick={() => onOpenDetail(t)} style={{ borderBottom: '1px solid #1c2535', cursor: 'pointer' }}>
                <td style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '11px 20px', color: '#495970', fontSize: '11px', maxWidth: '260px' }}>
                  <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {(t.permissions ?? []).join(', ') || '—'}
                  </div>
                </td>
                <td style={{ padding: '11px 20px' }}><Badge severity={t.severity} /></td>
                <td style={{ padding: '11px 20px' }}><ScoreBar score={t.risk_score} /></td>
                <td style={{ padding: '11px 20px' }}>
                  <AiBtn onClick={() => onOpenDetail(t)}>⚡ ИИ</AiBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
