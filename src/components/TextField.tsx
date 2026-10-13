import { useId, type InputHTMLAttributes } from 'react'

export function TextField({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
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
        className="min-h-12 rounded-xl border-2 border-surface bg-surface px-4 text-ink placeholder:text-faint focus:border-accent focus:outline-none aria-invalid:border-danger"
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
