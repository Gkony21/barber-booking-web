/**
 * The cover for barbers who have not uploaded their own: a large "FADE" wordmark outlined in gold,
 * cropped at the edges. Drawn, not an image, so it is sharp at any size and costs nothing to load.
 */
export function DefaultCover({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 170"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={`block size-full bg-[#141518] ${className}`}
    >
      <text
        x="200"
        y="150"
        textAnchor="middle"
        fontFamily='"Fira Sans Condensed", sans-serif'
        fontWeight="800"
        fontSize="190"
        letterSpacing="-4"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="1.5"
        opacity="0.28"
      >
        FADE
      </text>
    </svg>
  )
}
