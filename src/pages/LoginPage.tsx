import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { Notice } from '../components/States'
import { PasswordField } from '../components/PasswordField'
import { TextField } from '../components/TextField'
import { errorMessage } from '../lib/errors'
import { safeNext } from '../lib/navigation'

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unverified, setUnverified] = useState(false)
  const [resent, setResent] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setUnverified(false)
    try {
      const session = await login(email, password)
      // Without a specific destination, barbers go to their schedule and admins to approvals.
      const home = session.role === 'BARBER' ? '/barber' : session.role === 'ADMIN' ? '/admin' : '/'
      navigate(next === '/' ? home : next, { replace: true })
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setError(t('auth.invalidCredentials'))
      else if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        setUnverified(true)
        setError(t('auth.emailNotVerified'))
      } else setError(errorMessage(e, t))
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    await authApi.resendVerification(email).catch(() => undefined)
    setResent(true)
  }

  return (
    <div className="flex flex-col gap-8 pt-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('auth.loginTitle')}</h1>
        <p className="text-muted">{t('auth.loginSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <TextField label={t('auth.email')} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <PasswordField label={t('auth.password')} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <Link to="/forgot-password" className="-mt-2 flex min-h-11 items-center self-end text-sm font-semibold text-accent">
          {t('auth.forgotLink')}
        </Link>

        {error && <Notice tone="error">{error}</Notice>}
        {unverified && !resent && (
          <Button type="button" variant="secondary" onClick={resend}>
            {t('auth.resend')}
          </Button>
        )}
        {resent && <Notice tone="success">{t('auth.resent')}</Notice>}

        <Button type="submit" disabled={submitting || !email || !password}>
          {t('auth.loginButton')}
        </Button>
      </form>

      <p className="text-center text-muted">
        {t('auth.noAccount')}{' '}
        <Link to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-accent">
          {t('auth.registerButton')}
        </Link>
      </p>
    </div>
  )
}

