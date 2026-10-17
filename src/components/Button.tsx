import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-ground hover:bg-accent-strong disabled:bg-surface-2 disabled:text-faint',
  secondary: 'bg-surface text-ink hover:bg-surface-2 disabled:text-faint',
  // Secondary for buttons on a card (bg-surface), where the secondary colour would not show.
  tonal: 'bg-surface-2 text-ink hover:bg-line disabled:text-faint',
  ghost: 'bg-transparent text-muted hover:text-ink',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`min-h-12 rounded-2xl px-5 font-semibold transition-colors disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
