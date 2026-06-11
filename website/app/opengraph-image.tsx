import { ImageResponse } from 'next/og';

// Branded social-share preview (Discord/Twitter/etc.), generated at build time —
// no static asset to maintain. Next wires this into the page's OpenGraph and
// Twitter image automatically.
export const runtime = 'edge';
export const alt = 'Hynex Bots — Premium custom Discord bots';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #08090b 0%, #0d0f1a 100%)',
          padding: '90px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 90,
            right: 90,
            width: 104,
            height: 104,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: 60,
            fontWeight: 800,
          }}
        >
          H
        </div>

        <div style={{ fontSize: 32, letterSpacing: 6, color: '#8b8fa3', fontWeight: 600 }}>HYNEX BOTS</div>
        <div style={{ fontSize: 78, fontWeight: 800, color: '#ffffff', marginTop: 26, lineHeight: 1.05, maxWidth: 880 }}>
          Premium Discord bots, shipped fast.
        </div>
        <div style={{ fontSize: 30, color: '#a9adbe', marginTop: 30 }}>
          Ready-made &amp; bespoke · hosting included · live dashboard
        </div>

        <div style={{ display: 'flex', gap: 14, marginTop: 44 }}>
          {['Security', 'FiveM', 'Custom'].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 24,
                color: '#c7cbe0',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 999,
                padding: '10px 22px',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
