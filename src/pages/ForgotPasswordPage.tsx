import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/endpoints'
import { Button } from '../components/Button'
import { Notice } from '../components/States'
import { TextField } from '../components/TextField'
import { errorMessage } from '../lib/errors'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authApi.forgotPassword(email.trim())
      setSent(true)
    } catch (e) {
      setError(errorMessage(e, t))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[52px] leading-[0.88] font-black italic uppercase">{t('auth.forgotTitle')}</h1>
        <p className="text-muted">{t('auth.forgotBody')}</p>
      </div>

      {sent ? (
        <Notice tone="success">{t('auth.forgotSent')}</Notice>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <TextField label={t('auth.email')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" disabled={submitting || !email.includes('@')}>
            {t('auth.forgotButton')}
          </Button>
        </form>
      )}

      <Link to="/login" className="text-center font-semibold text-accent">
        {t('auth.loginButton')}
      </Link>
    </div>
  )
}
