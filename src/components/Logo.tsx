import { useId } from 'react'

// Letters drawn as shapes (no font needed), each 56 wide and 100 tall, 8 apart.
const LETTERS = [
  { x: 0, d: 'M0 0H56V20H22V40H46V58H22V100H0Z' },
  { x: 64, d: 'M0 100V22L22 0H56V100H34V64H22V100Z M22 22H34V44H22Z' },
  { x: 128, d: 'M0 0H38L56 18V82L38 100H0Z M22 20H30L34 24V76L30 80H22Z' },
  { x: 192, d: 'M0 0H56V20H22V40H48V58H22V80H56V100H0Z' },
]

// Solid on top, then lines that get thinner towards the bottom, like a skin fade.
// Small sizes use fewer, thicker lines so they stay visible.
const BANDS = {
  full: [[0, 56], [59, 6], [68, 5], [76, 4], [83, 3], [89, 2], [94, 1], [98, 0.6]],
  compact: [[0, 56], [60, 8], [73, 6], [84, 4], [94, 2]],
}

function maskId(raw: string) {
  return `fade-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/** The FADE wordmark. Set `height`; the width follows. */
export function Logo({ height = 24, color = 'currentColor', label = 'FADE' }: { height?: number; color?: string; label?: string }) {
  const id = maskId(useId())
  const bands = height < 40 ? BANDS.compact : BANDS.full
  return (
    <svg viewBox="0 0 248 100" height={height} width={(height * 248) / 100} role="img" aria-label={label}>
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="248" height="100">
          {bands.map(([y, h]) => (
            <rect key={y} x="0" y={y} width="248" height={h} fill="#fff" />
          ))}
        </mask>
      </defs>
      <g mask={`url(#${id})`} fill={color} fillRule="evenodd">
        {LETTERS.map((letter) => (
          <path key={letter.x} transform={`translate(${letter.x} 0)`} d={letter.d} />
        ))}
      </g>
    </svg>
  )
}

/**
 * The fade lines on their own: a full-width band that thins out, used as the app's one
 * signature detail (booking confirmation, loading).
 */
export function FadeLines({ className = '', animated = false }: { className?: string; animated?: boolean }) {
  const lines = [6, 5, 4, 3, 2, 1]
  return (
    <div aria-hidden="true" className={`flex flex-col gap-[3px] ${className}`}>
      {lines.map((h, i) => (
        <span
          key={h}
          className={`block w-full rounded-full bg-accent ${animated ? 'motion-safe:animate-[fade-line_1.2s_ease-in-out_infinite]' : ''}`}
          style={{ height: h, animationDelay: animated ? `${i * 0.1}s` : undefined }}
        />
      ))}
    </div>
  )
}
