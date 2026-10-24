/**
 * The cover for barbers who have not uploaded their own: poster dots with a large "FADE" outlined in
 * gold, cropped at the edges. Drawn, not an image, so it is sharp at any size and costs nothing to load.
 */
export function DefaultCover({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true" className={`halftone block size-full ${className}`}>
      <text
        x="200"
        y="152"
        textAnchor="middle"
        fontFamily='"Fira Sans Extra Condensed", sans-serif'
        fontWeight="900"
        fontStyle="italic"
        fontSize="200"
        letterSpacing="-4"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        opacity="0.32"
      >
        FADE
      </text>
    </svg>
  )
}
