import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { authApi } from '../api/endpoints'
import { Button } from '../components/Button'
import { PasswordField } from '../components/PasswordField'
import { Notice } from '../components/States'
import { errorMessage } from '../lib/errors'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<{ message: string; linkExpired: boolean } | null>(null)

  const tooShort = password.length > 0 && password.length < 8
  const differ = confirm.length > 0 && confirm !== password

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authApi.resetPassword(token, password)
      setDone(true)
    } catch (e) {
      const linkExpired = e instanceof ApiError && e.status === 400 && e.code !== 'WEAK_PASSWORD'
      setError({ message: linkExpired ? t('auth.resetInvalid') : errorMessage(e, t), linkExpired })
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6 pt-10">
        <h1 className="font-display text-5xl leading-none font-extrabold text-accent uppercase">{t('auth.resetDoneTitle')}</h1>
        <p className="text-muted">{t('auth.resetDoneBody')}</p>
        <Link to="/login" className="flex min-h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-ground">
          {t('auth.loginButton')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pt-6">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('auth.resetTitle')}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <PasswordField
          label={t('auth.newPassword')}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={t('auth.passwordHint')}
          error={tooShort ? t('auth.passwordTooShort') : undefined}
        />
        <PasswordField
          label={t('auth.confirmPassword')}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={differ ? t('auth.passwordsDiffer') : undefined}
        />
        {error && <Notice tone="error">{error.message}</Notice>}
        {error?.linkExpired && (
          <Link to="/forgot-password" className="font-semibold text-accent">
            {t('auth.requestNewLink')}
          </Link>
        )}
        <Button type="submit" disabled={submitting || !token || password.length < 8 || confirm !== password}>
          {t('auth.resetButton')}
        </Button>
      </form>
    </div>
  )
}
