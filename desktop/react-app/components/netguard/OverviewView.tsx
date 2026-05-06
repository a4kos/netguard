'use client'

import type { Extension, Stats } from '@/lib/types'
import { Badge, ScoreBar, AiBtn } from './helpers'

interface Props {
  stats: Stats | null
  threats: Extension[]
  onOpenDetail: (ext: Extension) => void
  lastUpdated: string
}

export default function OverviewView({ stats, threats, onOpenDetail, lastUpdated }: Props) {
  return (
    <>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Преглед на сигурността
        </div>
        <div style={{ fontSize: '11px', color: '#495970', marginTop: '3px' }}>{lastUpdated || 'Зареждане…'}</div>
      </div>

      {}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px' }}>
        <StatCard color="#39d0ff" label="Сканирани"  value={stats?.total    ?? '—'} />
        <StatCard color="#f14c4c" label="Критични"   value={stats?.critical ?? '—'} />
        <StatCard color="#e8834a" label="Високи"     value={stats?.high     ?? '—'} />
        <StatCard color="#e5c07b" label="Средни"     value={stats?.medium   ?? '—'} />
      </div>

      {}
      <div style={{ background: '#111820', border: '1px solid #1c2535', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1c2535' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Топ заплахи</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Разширение','Ниво','Рисков резултат','Действие'].map(h => (
                <th key={h} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#495970', padding: '10px 20px', textAlign: 'left', borderBottom: '1px solid #1c2535', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {threats.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '60px 20px', color: '#495970' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>✓</div>
                <div style={{ fontSize: '13px' }}>Няма открити заплахи</div>
              </td></tr>
            ) : threats.slice(0, 10).map(t => (
              <tr key={t.ext_id} onClick={() => onOpenDetail(t)} style={{ borderBottom: '1px solid #1c2535', cursor: 'pointer' }}>
                <td style={{ padding: '11px 20px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 500 }}>{t.name}</div>
                </td>
                <td style={{ padding: '11px 20px' }}><Badge severity={t.severity} /></td>
                <td style={{ padding: '11px 20px' }}><ScoreBar score={t.risk_score} /></td>
                <td style={{ padding: '11px 20px' }}>
                  <AiBtn onClick={() => onOpenDetail(t)}>Детайли</AiBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function StatCard({ color, label, value }: { color: string; label: string; value: number | string }) {
  return (
    <div style={{
      background: '#111820', border: '1px solid #1c2535', borderRadius: '8px',
      padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color }} />
      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#495970' }}>{label}</div>
      <div style={{ fontSize: '36px', fontWeight: 700, lineHeight: 1.1, margin: '6px 0 2px', color }}>{value}</div>
    </div>
  )
}
