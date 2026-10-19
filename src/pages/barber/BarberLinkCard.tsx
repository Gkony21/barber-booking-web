import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../../lib/errors'
import { barberMeApi } from '../../api/endpoints'
import type { Barber } from '../../api/types'
import { Button } from '../../components/Button'
import { Notice } from '../../components/States'

/** The barber's public link: copy it, share it (e.g. to Instagram), or change it. */
export function BarberLinkCard({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(barber.slug ?? '')

  const origin = window.location.origin
  const url = barber.slug ? `${origin}/${barber.slug}` : null

  const save = useMutation({
    mutationFn: () =>
      barberMeApi.updateProfile({
        bio: barber.bio,
        experienceYears: barber.experienceYears,
        specialty: barber.specialty,
        address: barber.address,
        city: barber.city,
        latitude: null,
        longitude: null,
        autoConfirmBookings: barber.autoConfirmBookings,
        slotStepMinutes: barber.slotStepMinutes,
        bookingWindowDays: barber.bookingWindowDays,
        minNoticeMinutes: barber.minNoticeMinutes,
        slug: value.trim().toLowerCase(),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['barber', 'me'], updated)
      setEditing(false)
    },
  })

  if (!url) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(url!)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked: the link stays visible to copy by hand.
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  const saveError = save.error ? errorMessage(save.error, t) : null

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-accent/40 bg-surface p-4">
      <h2 className="font-display text-xl font-extrabold uppercase">{t('barber.profile.link')}</h2>
      <p className="font-semibold break-all text-accent">{url}</p>
      <p className="text-sm text-muted">{t('barber.profile.linkHint')}</p>

      {!editing ? (
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-11 text-sm" onClick={copy}>
            {copied ? t('barber.profile.linkCopied') : t('barber.profile.linkCopy')}
          </Button>
          {typeof navigator.share === 'function' && (
            <Button variant="tonal" className="min-h-11 text-sm" onClick={() => navigator.share({ url, title: barber.name }).catch(() => undefined)}>
              {t('barber.profile.linkShare')}
            </Button>
          )}
          <Button variant="ghost" className="min-h-11 text-sm" onClick={() => setEditing(true)}>
            {t('barber.profile.linkEdit')}
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
          <label htmlFor="slug" className="text-sm font-medium text-muted">
            {t('barber.profile.linkLabel')}
          </label>
          <div className="flex items-center rounded-xl border-2 border-surface-2 bg-surface-2 focus-within:border-accent">
            <span className="pl-3 text-sm text-muted">{origin.replace(/^https?:\/\//, '')}/</span>
            <input
              id="slug"
              value={value}
              onChange={(e) => setValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              maxLength={30}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="min-h-12 min-w-0 flex-1 bg-transparent pr-3 text-ink focus:outline-none"
            />
          </div>
          <p className="text-xs text-muted">{t('barber.profile.linkRules')}</p>
          {saveError && <Notice tone="error">{saveError}</Notice>}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={value.length < 3 || save.isPending}>
              {t('barber.profile.save')}
            </Button>
            <Button type="button" variant="tonal" onClick={() => setEditing(false)}>
              {t('barber.services.cancelEdit')}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
