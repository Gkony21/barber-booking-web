import { useTranslation } from 'react-i18next'
import { errorMessage } from '../lib/errors'
import { Button } from './Button'

export function Loading() {
  const { t } = useTranslation()
  return (
    <div role="status" className="flex justify-center py-16">
      <span className="size-8 animate-spin rounded-full border-4 border-surface-2 border-t-accent" aria-hidden="true" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation()
  return (
    <div role="alert" className="flex flex-col items-center gap-4 py-12 text-center">
      <p className="text-muted">{errorMessage(error, t)}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      )}
    </div>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const tones = {
    info: 'border-line text-muted',
    error: 'border-danger/40 text-danger',
    success: 'border-success/40 text-success',
  }
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl border bg-surface px-4 py-3 text-sm ${tones[tone]}`}>
      {children}
    </div>
  )
}
