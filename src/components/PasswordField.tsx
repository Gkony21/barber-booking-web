import { useId, useState, type InputHTMLAttributes } from 'react'
import { useTranslation } from 'react-i18next'

/** A password input with a show/hide button, so people can check what they typed on a phone. */
export function PasswordField({
  label,
  hint,
  error,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: string; hint?: string; error?: string }) {
  const { t } = useTranslation()
  const id = useId()
  const [visible, setVisible] = useState(false)
  const describedBy = error || hint ? `${id}-desc` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-muted">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="min-h-12 w-full rounded-xl border-2 border-surface bg-surface py-0 pr-14 pl-4 text-ink placeholder:text-faint focus:border-accent focus:outline-none aria-invalid:border-danger"
          {...props}
        />
        <button
          type="button"
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
          className="absolute top-0 right-0 flex size-12 items-center justify-center text-muted hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
            {visible && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </div>
      {(error || hint) && (
        <p id={describedBy} className={`text-sm ${error ? 'text-danger' : 'text-muted'}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}
