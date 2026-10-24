export type Variant = 'primary' | 'secondary' | 'tonal' | 'ghost' | 'outline'

export const baseButton =
  'min-h-12 rounded-md px-5 transition-[transform,box-shadow,background-color] duration-100 disabled:cursor-not-allowed motion-reduce:transition-none'

export const variants: Record<Variant, string> = {
  // The main action: sits on a hard white shadow and drops onto it when pressed.
  primary:
    'bg-accent font-display text-lg font-black text-ground italic uppercase shadow-press hover:bg-accent-strong active:translate-x-1 active:translate-y-1 active:shadow-none disabled:bg-surface-2 disabled:text-faint disabled:shadow-none disabled:active:translate-none',
  secondary: 'bg-surface font-semibold text-ink hover:bg-surface-2 disabled:text-faint',
  // Secondary for buttons on a card (bg-surface), where the secondary colour would not show.
  tonal: 'bg-surface-2 font-semibold text-ink hover:bg-line disabled:text-faint',
  ghost: 'bg-transparent font-semibold text-muted hover:text-ink',
  // Next to a primary button, for the other choice (e.g. directions next to "add to calendar").
  outline: 'border-2 border-ink bg-transparent font-semibold text-ink hover:bg-surface disabled:border-line disabled:text-faint',
}

/** The button look for links that act as buttons ("Βρες barber", "Οδηγίες"). */
export function buttonClass(variant: Variant = 'primary', className = '') {
  return `${baseButton} inline-flex items-center justify-center gap-2 ${variants[variant]} ${className}`
}
