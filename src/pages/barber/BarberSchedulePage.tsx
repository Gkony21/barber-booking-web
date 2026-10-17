import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { Appointment, Barber } from '../../api/types'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { athensDate, bookableDays, formatDayHeading, formatPrice, formatTime, servicesOf } from '../../lib/format'
import { NewAppointmentForm } from './NewAppointmentForm'
import { ProfileForm } from './ProfileForm'
import { useMyBarber } from './useMyBarber'

export function BarberSchedulePage() {
  const { t } = useTranslation()
  const profile = useMyBarber()

  if (profile.isPending) return <Loading />
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />

  if (!profile.data) {
    return (
      <div className="flex flex-col gap-6 pt-4">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('barber.setupTitle')}</h1>
          <p className="text-muted">{t('barber.setupBody')}</p>
        </div>
        <ProfileForm barber={null} />
      </div>
    )
  }

  return <Schedule barber={profile.data} />
}

function Schedule({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  // As far ahead as the barber can enter appointments by hand (90 days), not just the customers' 14.
  const [days] = useState(() => bookableDays(91))
  const [adding, setAdding] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const from = days[0].iso
  const to = days[days.length - 1].iso

  const appointments = useQuery({
    queryKey: ['barber', 'appointments', from, to],
    queryFn: () => barberMeApi.appointments(from, to),
    refetchInterval: 60_000, // new bookings show up without a manual refresh
  })
  const services = useQuery({ queryKey: ['barber', 'services'], queryFn: barberMeApi.services })
  const hours = useQuery({ queryKey: ['barber', 'hours'], queryFn: barberMeApi.workingHours })

  const needsServices = services.data?.filter((s) => s.active).length === 0
  const needsHours = hours.data?.length === 0

  const active = (appointments.data ?? []).filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED')
  const requests = active.filter((a) => a.status === 'PENDING')
  const byDay = new Map<string, Appointment[]>()
  for (const a of active.filter((a) => a.status === 'CONFIRMED')) {
    const day = athensDate(a.startTime)
    byDay.set(day, [...(byDay.get(day) ?? []), a])
  }

  const dayTitle = (iso: string) =>
    iso === days[0].iso ? t('barber.schedule.today') : iso === days[1].iso ? t('barber.schedule.tomorrow') : formatDayHeading(iso)

  return (
    <div className="flex flex-col gap-7 pt-4">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('barber.schedule.title')}</h1>

      {barber.status === 'PENDING' && <Notice>{t('barber.pendingApproval')}</Notice>}
      {barber.status === 'SUSPENDED' && <Notice tone="error">{t('barber.suspended')}</Notice>}

      {(needsServices || needsHours) && (
        <section className="flex flex-col gap-2 rounded-2xl border border-accent/40 bg-surface p-4">
          <h2 className="font-display text-lg font-semibold tracking-wide text-accent uppercase">{t('barber.checklist.title')}</h2>
          {needsServices && (
            <Link to="/barber/services" className="flex min-h-11 items-center font-semibold underline decoration-accent underline-offset-4">
              {t('barber.checklist.services')}
            </Link>
          )}
          {needsHours && (
            <Link to="/barber/hours" className="flex min-h-11 items-center font-semibold underline decoration-accent underline-offset-4">
              {t('barber.checklist.hours')}
            </Link>
          )}
        </section>
      )}

      {adding ? (
        <NewAppointmentForm
          onDone={(saved) => {
            setAdding(false)
            setJustSaved(saved)
          }}
        />
      ) : (
        <Button
          onClick={() => {
            setAdding(true)
            setJustSaved(false)
          }}
        >
          {t('barber.schedule.add')}
        </Button>
      )}
      {justSaved && <Notice tone="success">{t('barber.schedule.saved')}</Notice>}

      {appointments.isPending && <Loading />}
      {appointments.isError && <ErrorState error={appointments.error} onRetry={() => appointments.refetch()} />}

      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold tracking-wide text-accent uppercase">
            {t('barber.schedule.requests')} · {requests.length}
          </h2>
          {requests.map((a) => (
            <AppointmentRow key={a.id} appointment={a} dayLabel={dayTitle(athensDate(a.startTime))} />
          ))}
        </section>
      )}

      {appointments.isSuccess && active.length === 0 && <p className="py-8 text-center text-muted">{t('barber.schedule.empty')}</p>}

      {[...byDay.entries()].map(([day, list]) => (
        <section key={day} className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold tracking-wide text-muted uppercase">{dayTitle(day)}</h2>
          {list.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))}
        </section>
      ))}
    </div>
  )
}

function AppointmentRow({ appointment, dayLabel }: { appointment: Appointment; dayLabel?: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const pending = appointment.status === 'PENDING'

  const action = useMutation({
    mutationFn: (kind: 'confirm' | 'reject' | 'cancel') => barberMeApi[kind](appointment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barber', 'appointments'] }),
  })

  const run = (kind: 'confirm' | 'reject' | 'cancel') => {
    if (kind === 'reject' && !window.confirm(t('barber.schedule.confirmReject'))) return
    if (kind === 'cancel' && !window.confirm(t('barber.schedule.confirmCancel'))) return
    action.mutate(kind)
  }

  return (
    <article className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 ${pending ? 'border-2 border-accent' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col">
          <span className="font-display text-2xl leading-none font-extrabold">{formatTime(appointment.startTime)}</span>
          <span className="text-sm text-muted">{formatTime(appointment.endTime)}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          {dayLabel && <span className="text-sm font-semibold text-accent first-letter:uppercase">{dayLabel}</span>}
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-semibold">{appointment.customerName}</span>
            {appointment.manual && (
              <span className="shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">
                {t('barber.schedule.manualBadge')}
              </span>
            )}
          </span>
          <span className="text-sm text-muted">
            {servicesOf(appointment)} · {formatPrice(appointment.price)}
          </span>
          {appointment.note && <span className="text-sm text-muted italic">“{appointment.note}”</span>}
        </div>
        {appointment.customerPhone && (
          <a
            href={`tel:${appointment.customerPhone}`}
            aria-label={`${t('barber.schedule.call')} ${appointment.customerName}`}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
            </svg>
          </a>
        )}
      </div>

      {action.isError && <Notice tone="error">{errorMessage(action.error, t)}</Notice>}

      <div className="flex gap-2">
        {pending ? (
          <>
            <Button className="flex-1" disabled={action.isPending} onClick={() => run('confirm')}>
              {t('barber.schedule.confirm')}
            </Button>
            <Button variant="tonal" className="flex-1" disabled={action.isPending} onClick={() => run('reject')}>
              {t('barber.schedule.reject')}
            </Button>
          </>
        ) : (
          <Button variant="ghost" className="ml-auto min-h-11 px-3 text-sm" disabled={action.isPending} onClick={() => run('cancel')}>
            {t('barber.schedule.cancel')}
          </Button>
        )}
      </div>
    </article>
  )
}
