import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import { Button } from '../components/Button'
import { Notice } from '../components/States'
import { TextField } from '../components/TextField'
import { errorMessage } from '../lib/errors'

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', password: '' })
  const [isBarber, setIsBarber] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })

  const passwordTooShort = form.password.length > 0 && form.password.length < 8

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authApi.register({ ...form, role: isBarber ? 'BARBER' : 'CUSTOMER' })
      navigate(`/check-email?email=${encodeURIComponent(form.email.trim())}`)
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setError(t('auth.emailTaken'))
      else setError(errorMessage(e, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('auth.registerTitle')}</h1>
        <p className="text-muted">{t('auth.registerSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField label={t('auth.name')} autoComplete="name" required value={form.name} onChange={update('name')} />
        <TextField label={t('auth.email')} type="email" autoComplete="email" required value={form.email} onChange={update('email')} />
        <TextField label={t('auth.phone')} type="tel" autoComplete="tel" value={form.phoneNumber} onChange={update('phoneNumber')} />
        <TextField
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={update('password')}
          hint={t('auth.passwordHint')}
          error={passwordTooShort ? t('auth.passwordHint') : undefined}
        />

        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl bg-surface px-4">
          <input type="checkbox" checked={isBarber} onChange={(e) => setIsBarber(e.target.checked)} className="size-5 accent-accent" />
          <span className="font-medium">{t('auth.iAmBarber')}</span>
        </label>

        {error && <Notice tone="error">{error}</Notice>}

        <Button type="submit" disabled={submitting || !form.name || !form.email || form.password.length < 8}>
          {t('auth.registerButton')}
        </Button>
      </form>

      <p className="text-center text-muted">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-accent">
          {t('auth.loginButton')}
        </Link>
      </p>
    </div>
  )
}
