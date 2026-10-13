import { useId, type InputHTMLAttributes } from 'react'

export function TextField({
  label,
  hint,
  error,
  onSurface = false,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  error?: string
  /** Set when the field sits on a card, so it stays visible against the card's colour. */
  onSurface?: boolean
}) {
  const id = useId()
  const describedBy = error || hint ? `${id}-desc` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`min-h-12 rounded-xl border-2 px-4 text-ink placeholder:text-faint focus:border-accent focus:outline-none aria-invalid:border-danger ${
          onSurface ? 'border-surface-2 bg-surface-2' : 'border-surface bg-surface'
        }`}
        {...props}
      />
      {(error || hint) && (
        <p id={describedBy} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
