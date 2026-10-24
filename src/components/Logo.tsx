// "FADE" in Fira Sans Extra Condensed Black Italic, as shapes: no font to wait for, sharp at any size.
// The letters are 193.9 wide and 69.6 tall; the box adds 26 on each side and 15 above and below.
const LETTERS =
  'M9.8 0L47.2 0L42.9 13.7L27.3 13.7L25.1 29.7L39.3 29.7L37.1 43.5L23.1 43.5L19.4 69.6L0 69.6L9.8 0ZM83.5 0L89.5 69.6L69.7 69.6L69.7 55.8L58.6 55.8L55 69.6L34.9 69.6L60.4 0L83.5 0ZM69.7 12.6L62.1 42.0L69.7 42.0L69.7 12.6ZM119.8 0Q131.9 0 139.1 5.4Q146.2 10.8 146.2 25.1L146.2 25.1Q146.2 45.9 137.7 57.8Q129.2 69.6 111.1 69.6L111.1 69.6L90.3 69.6L100.1 0L119.8 0ZM120.2 13.9L117.5 13.9L111.7 55.6L114.0 55.6Q120.7 55.6 123.7 45.9Q126.6 36.1 126.6 24.4L126.6 24.4Q126.6 18.8 125.1 16.4Q123.5 13.9 120.2 13.9L120.2 13.9ZM155.1 0L193.9 0L189.7 13.7L172.6 13.7L170.6 27.6L186 27.6L184 41.0L168.7 41.0L166.7 55.7L185.5 55.7L183.5 69.6L145.3 69.6L155.1 0Z'

/**
 * The FADE box logo: the word in an amber box (the box takes the text colour, so a parent with
 * `text-accent` makes it amber). `sticker` tilts it with a white border and shadow, as on a sticker.
 * Set `height`; the width follows.
 */
export function Logo({ height = 24, label = 'FADE', sticker = false }: { height?: number; label?: string; sticker?: boolean }) {
  const logo = (
    <svg viewBox="0 0 246 100" height={height} width={(height * 246) / 100} role="img" aria-label={label} className="block">
      <rect width="246" height="100" fill="currentColor" />
      <path transform="translate(26 15)" d={LETTERS} fill="var(--color-ground)" />
    </svg>
  )
  return sticker ? <span className="inline-block -rotate-4 border-[3px] border-ink shadow-press">{logo}</span> : logo
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
