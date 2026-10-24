import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/endpoints'
import { Loading } from '../components/States'
import { buttonClass } from '../components/buttonStyles'

type Status = 'verifying' | 'verified' | 'failed'

export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token')
  const [status, setStatus] = useState<Status>(token ? 'verifying' : 'failed')
  const started = useRef(false)

  useEffect(() => {
    // Links work once: guard against React running the effect twice in development.
    if (!token || started.current) return
    started.current = true
    authApi
      .verifyEmail(token)
      .then(() => setStatus('verified'))
      .catch(() => setStatus('failed'))
  }, [token])

  if (status === 'verifying') {
    return (
      <div className="pt-10 text-center">
        <Loading />
        <p className="text-muted">{t('auth.verifying')}</p>
      </div>
    )
  }

  const ok = status === 'verified'
  return (
    <div className="flex flex-col gap-6 pt-10">
      <h1 className={`font-display text-[52px] leading-[0.88] font-black italic uppercase ${ok ? 'text-accent' : ''}`}>
        {ok ? t('auth.verifiedTitle') : t('auth.verifyFailedTitle')}
      </h1>
      <p className="text-muted">{ok ? t('auth.verifiedBody') : t('auth.verifyFailedBody')}</p>
      <Link to="/login" className={buttonClass('primary', 'w-full')}>
        {t('auth.loginButton')}
      </Link>
    </div>
  )
}
