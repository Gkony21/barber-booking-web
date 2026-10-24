import type { ReactNode } from 'react'

/**
 * A small tilted label, like a sticker on a lamp post. One per screen at most, on the thing that
 * matters there (a barber's next free time, a change of time, a booking that just went through).
 */
export function Sticker({ children, tilt = -5, className = '' }: { children: ReactNode; tilt?: number; className?: string }) {
  return (
    <span
      style={{ rotate: `${tilt}deg` }}
      className={`inline-block border-2 border-ground bg-accent px-2 pt-0.5 font-display text-[13px] font-black tracking-wide whitespace-nowrap text-ground uppercase ${className}`}
    >
      {children}
    </span>
  )
}

/** A slanted amber strip whose words scroll by. Decoration only; the words are said elsewhere too. */
export function Tape({ words }: { words: string[] }) {
  const line = words.map((word) => `${word} ★ `).join('')
  return (
    <div aria-hidden="true" className="-mx-5 -rotate-2 overflow-hidden bg-accent py-1.5 font-display text-sm font-black whitespace-nowrap text-ground italic uppercase">
      <span className="inline-block motion-safe:animate-[tape_22s_linear_infinite]">
        {line}
        {line}
        {line}
        {line}
      </span>
    </div>
  )
}
