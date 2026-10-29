import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { pushApi } from '../../api/endpoints'
import { Button } from '../../components/Button'
import { Notice } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { disablePush, enablePush, pushState, type PushState } from '../../lib/push'

/**
 * Turning phone notifications on for this device, with what to do where they cannot work yet.
 * `onlyWhenOff`: in the schedule, shown only until they are on (the profile always has it).
 */
export function NotificationsCard({ onlyWhenOff = false }: { onlyWhenOff?: boolean }) {
  const { t } = useTranslation()
  // Off on the server (no keys) means nothing to offer.
  const available = useQuery({ queryKey: ['push', 'key'], queryFn: pushApi.key, retry: false, staleTime: Infinity })
  const [state, setState] = useState<PushState | null>(null)

  useEffect(() => {
    let current = true
    void pushState().then((found) => current && setState(found))
    return () => {
      current = false
    }
  }, [])

  const toggle = useMutation({
    mutationFn: () => (state === 'on' ? disablePush() : enablePush()),
    onSuccess: setState,
  })
  const test = useMutation({ mutationFn: pushApi.test })

  if (!available.isSuccess || state === null) return null
  if (onlyWhenOff && (state === 'on' || state === 'unsupported')) return null

  return (
    <section aria-label={t('barber.push.title')} className="flex flex-col gap-3 rounded-md border-2 border-accent bg-surface p-4">
      <h2 className="font-display text-xl font-black italic uppercase">{t('barber.push.title')}</h2>
      <p className="text-sm text-muted">{t(`barber.push.${state}`)}</p>

      {toggle.isError && <Notice tone="error">{errorMessage(toggle.error, t)}</Notice>}
      {test.isSuccess && <Notice tone="success">{t('barber.push.testSent')}</Notice>}

      {state === 'off' && (
        <Button disabled={toggle.isPending} onClick={() => toggle.mutate()}>
          {t('barber.push.enable')}
        </Button>
      )}
      {state === 'on' && (
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" disabled={test.isPending} onClick={() => test.mutate()}>
            {t('barber.push.test')}
          </Button>
          <Button variant="ghost" disabled={toggle.isPending} onClick={() => toggle.mutate()}>
            {t('barber.push.disable')}
          </Button>
        </div>
      )}
    </section>
  )
}
