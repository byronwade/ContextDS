import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Design Contracts — scan sites into installable design systems'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#f7f7f4',
          color: '#161612',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b6560',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          designcontracts.sh
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            Design Contracts
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              maxWidth: 820,
              color: '#3f3a35',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Scan public sites into installable design systems agents can uphold.
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            color: '#8a4b32',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          }}
        >
          Scan → DESIGN.md → ZIP pack
        </div>
      </div>
    ),
    { ...size }
  )
}
