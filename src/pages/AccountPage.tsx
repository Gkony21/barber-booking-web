import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { ChangePassword, MyDetails } from './AccountForms'
import { Button } from '../components/Button'
import { PasswordField } from '../components/PasswordField'
import { Notice } from '../components/States'
import { errorMessage } from '../lib/errors'

export function AccountPage() {
  const { t } = useTranslation()
  const { session, logout } = useAuth()
  const [deleted, setDeleted] = useState(false)
  const deletedRef = useRef(false)
  const [deleting, setDeleting] = useState(false)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onDelete(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await authApi.deleteAccount(password)
      deletedRef.current = true
      setDeleted(true)
    } catch (e) {
      setError(errorMessage(e, t))
    } finally {
      setSubmitting(false)
    }
  }

  // Sign out only once this page has been left; signing out while on it would send the person
  // to the login page instead of home.
  useEffect(() => () => {
    if (deletedRef.current) logout()
  }, [logout])

  if (deleted) return <Navigate to="/" replace state={{ notice: t('account.deleted') }} />

  return (
    <div className="flex flex-col gap-8 pt-4">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('account.title')}</h1>

      <section className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
        <span className="text-sm text-muted">{t('account.signedInAs')}</span>
        <span className="font-semibold break-all">{session?.email}</span>
      </section>

      <MyDetails />
      <ChangePassword />

      <Button variant="secondary" onClick={logout}>
        {t('account.logout')}
      </Button>

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-extrabold uppercase">{t('account.legal')}</h2>
        <Link to="/terms" className="flex min-h-11 items-center font-semibold text-accent">
          {t('nav.terms')}
        </Link>
        <Link to="/privacy" className="flex min-h-11 items-center font-semibold text-accent">
          {t('nav.privacy')}
        </Link>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-danger/40 p-4">
        <h2 className="font-display text-xl font-extrabold text-danger uppercase">{t('account.deleteTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted">{t('account.deleteBody')}</p>
        {!deleting ? (
          <Button variant="secondary" onClick={() => setDeleting(true)}>
            {t('account.deleteStart')}
          </Button>
        ) : (
          <form onSubmit={onDelete} className="flex flex-col gap-3" noValidate>
            <PasswordField
              label={t('account.deletePassword')}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!password || submitting}
                className="min-h-12 flex-1 rounded-2xl bg-danger px-5 font-semibold text-ground disabled:bg-surface-2 disabled:text-faint"
              >
                {t('account.deleteConfirm')}
              </button>
              <Button type="button" variant="secondary" onClick={() => setDeleting(false)}>
                {t('account.deleteCancel')}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}
