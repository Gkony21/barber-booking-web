import { useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { appointmentsApi } from '../api/endpoints'
import type { Appointment } from '../api/types'
import { Button } from '../components/Button'
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
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('appointments.title')}</h1>

      {appointments.data.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-muted">{t('appointments.empty')}</p>
          <Link to="/" className="flex min-h-12 items-center rounded-2xl bg-accent px-6 font-semibold text-ground">
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
}

function AppointmentCard({ appointment, cancellable = false }: { appointment: Appointment; cancellable?: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const cancel = useMutation({
    mutationFn: () => appointmentsApi.cancel(appointment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  })

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-2xl leading-tight font-extrabold uppercase">{appointment.barberName}</h3>
          <p className="text-muted">
            {servicesOf(appointment)} · {formatPrice(appointment.price)}
          </p>
        </div>
        <span className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${statusStyles[appointment.status]}`}>
          {t(`appointments.status.${appointment.status}`)}
        </span>
      </div>
      <p className="font-semibold first-letter:uppercase">{formatAppointmentTime(appointment.startTime)}</p>

      {cancel.isError && (
        <Notice tone="error">
          {errorMessage(cancel.error, t)}
        </Notice>
      )}
      {cancellable && (
        <Button
          variant="tonal"
          disabled={cancel.isPending}
          onClick={() => {
            if (window.confirm(t('appointments.confirmCancel'))) cancel.mutate()
          }}
        >
          {t('appointments.cancel')}
        </Button>
      )}
    </article>
  )
}
