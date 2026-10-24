import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/endpoints'
import { Button } from '../components/Button'
import { buttonClass } from '../components/buttonStyles'
import { Notice } from '../components/States'

export function CheckEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const email = params.get('email') ?? ''
  const [resent, setResent] = useState(false)

  async function resend() {
    await authApi.resendVerification(email).catch(() => undefined)
    setResent(true)
  }

  return (
    <div className="flex flex-col gap-6 pt-10">
      <MailIcon />
      <h1 className="font-display text-[52px] leading-[0.88] font-black italic uppercase">{t('auth.checkEmailTitle')}</h1>
      <p className="text-muted">{t('auth.checkEmailBody', { email })}</p>
      {resent ? (
        <Notice tone="success">{t('auth.resent')}</Notice>
      ) : (
        email && (
          <Button variant="secondary" onClick={resend}>
            {t('auth.resend')}
          </Button>
        )
      )}
      <Link to="/login" className={buttonClass('primary', 'w-full')}>
        {t('auth.loginButton')}
      </Link>
    </div>
  )
}

function MailIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#E8B04B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  )
}
