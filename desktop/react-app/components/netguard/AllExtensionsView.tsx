'use client'

import type { Extension } from '@/lib/types'
import { Badge, ScoreBar, AiBtn } from './helpers'

interface Props {
  extensions: Extension[]
  onOpenDetail: (ext: Extension) => void
}

export default function AllExtensionsView({ extensions, onOpenDetail }: Props) {
  return (
    <>
      <div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: '22px', fontWeight: 700, letterSpacing: '-0.01em' }}>
          Всички разширения
        </div>
        <div style={{ fontSize: '11px', color: '#495970', marginTop: '3px' }}>
          Пълен списък от последното сканиране
        </div>
      </div>

      <div style={{ background: '#111820', border: '1px solid #1c2535', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1c2535' }}>
          <span style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Разширения</span>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Разширение','Версия','Ниво','Резултат','Детайли'].map(h => (
                <th key={h} style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#495970', padding: '10px 20px', textAlign: 'left', borderBottom: '1px solid #1c2535', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {extensions.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '60px 20px', color: '#495970' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>◈</div>
                <div style={{ fontSize: '13px' }}>Няма разширения. Стартирайте сканиране от разширението.</div>
              </td></tr>
            ) : extensions.map(t => (
              <tr key={t.ext_id} onClick={() => onOpenDetail(t)} style={{ borderBottom: '1px solid #1c2535', cursor: 'pointer' }}>
                <td style={{ padding: '11px 20px', fontSize: '12px', fontWeight: 500 }}>{t.name}</td>
                <td style={{ padding: '11px 20px', fontSize: '11px', color: '#495970' }}>{t.version || '—'}</td>
                <td style={{ padding: '11px 20px' }}><Badge severity={t.severity} /></td>
                <td style={{ padding: '11px 20px' }}><ScoreBar score={t.risk_score} /></td>
                <td style={{ padding: '11px 20px' }}>
                  <AiBtn onClick={() => onOpenDetail(t)}>Преглед</AiBtn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
