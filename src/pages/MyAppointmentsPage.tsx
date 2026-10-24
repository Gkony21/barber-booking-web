import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { appointmentsApi } from '../api/endpoints'
import type { Appointment } from '../api/types'
import { Button } from '../components/Button'
import { buttonClass } from '../components/buttonStyles'
import { ErrorState, Loading, Notice } from '../components/States'
import { errorMessage } from '../lib/errors'
import { formatAppointmentTime, formatPrice, servicesOf } from '../lib/format'

export function MyAppointmentsPage() {
  const { t } = useTranslation()
  const appointments = useQuery({ queryKey: ['appointments', 'mine'], queryFn: appointmentsApi.mine })
  const [now] = useState(() => Date.now())

  if (appointments.isPending) return <Loading />
  if (appointments.isError) return <ErrorState error={appointments.error} onRetry={() => appointments.refetch()} />

  const isUpcoming = (a: Appointment) =>
    new Date(a.startTime).getTime() > now && (a.status === 'PENDING' || a.status === 'CONFIRMED')
  const upcoming = appointments.data.filter(isUpcoming).sort((a, b) => a.startTime.localeCompare(b.startTime))
  const past = appointments.data.filter((a) => !isUpcoming(a))

  return (
    <div className="flex flex-col gap-8 pt-4">
      <h1 className="font-display text-[52px] leading-[0.88] font-black italic uppercase">{t('appointments.title')}</h1>

      {appointments.data.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted">{t('appointments.empty')}</p>
          <Link to="/" className={buttonClass('primary', 'px-6')}>
            {t('appointments.findBarber')}
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold tracking-wide text-muted uppercase">{t('appointments.upcoming')}</h2>
          {upcoming.map((a) => (
            <AppointmentCard key={a.id} appointment={a} cancellable />
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold tracking-wide text-muted uppercase">{t('appointments.past')}</h2>
          {past.map((a) => (
            <AppointmentCard key={a.id} appointment={a} />
          ))}
        </section>
      )}
    </div>
  )
}

const statusStyles: Record<Appointment['status'], string> = {
  CONFIRMED: 'bg-accent text-ground',
  PENDING: 'bg-surface-2 text-ink',
  REJECTED: 'bg-surface-2 text-muted',
  CANCELLED: 'bg-surface-2 text-muted',
  EXPIRED: 'bg-surface-2 text-muted',
  NO_SHOW: 'bg-surface-2 text-muted',
}

function AppointmentCard({ appointment, cancellable = false }: { appointment: Appointment; cancellable?: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => appointmentsApi.cancel(appointment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })
  const withdraw = useMutation({
    mutationFn: () => appointmentsApi.withdrawChange(appointment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })
  const change = cancellable ? appointment.requestedStartTime : null

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-2xl leading-tight font-black italic uppercase">{appointment.barberName}</h3>
          <p className="text-muted">
            {servicesOf(appointment)} · {formatPrice(appointment.price)}
          </p>
        </div>
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.status]}`}>
          {t(`appointments.status.${appointment.status}`)}
        </span>
      </div>
      <p className="font-semibold first-letter:uppercase">{formatAppointmentTime(appointment.startTime)}</p>

      {/* Asked to move; until the barber answers, the time above holds. */}
      {change && (
        <div className="flex flex-col gap-2 rounded-xl border-2 border-dashed border-accent/60 p-3">
          <p className="text-sm">
            <span className="font-semibold text-accent">{t('appointments.changeRequested', { when: formatAppointmentTime(change) })}</span>
            <br />
            <span className="text-muted">{t('appointments.changeWaiting')}</span>
          </p>
          <Button
            variant="ghost"
            className="min-h-11 self-start px-3 text-sm"
            disabled={withdraw.isPending}
            onClick={() => {
              if (window.confirm(t('appointments.confirmWithdraw'))) withdraw.mutate()
            }}
          >
            {t('appointments.withdrawChange')}
          </Button>
        </div>
      )}

      {(cancel.isError || withdraw.isError) && (
        <Notice tone="error">
          {errorMessage(cancel.error ?? withdraw.error, t)}
        </Notice>
      )}
      {cancellable && (
        <div className="flex gap-2">
          {/* Opens the barber's page to pick a new time; the services stay the same. */}
          <Link
            to={`/barbers/${appointment.barberId}?reschedule=${appointment.id}`}
            className={buttonClass('tonal', 'flex-1 px-4')}
          >
            {t('appointments.reschedule')}
          </Link>
          <Button
            variant="tonal"
            className="flex-1"
            disabled={cancel.isPending}
            onClick={() => {
              if (window.confirm(t('appointments.confirmCancel'))) cancel.mutate()
            }}
          >
            {t('appointments.cancel')}
          </Button>
        </div>
      )}
    </article>
  )
}
