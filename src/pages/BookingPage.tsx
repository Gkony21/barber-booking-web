import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { appointmentsApi, barbersApi } from '../api/endpoints'
import type { Appointment, Barber } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { BackLink } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { Gallery } from '../components/Gallery'
import { FadeLines } from '../components/Logo'
import { Button } from '../components/Button'
import { DayPicker } from '../components/DayPicker'
import { ErrorState, Loading, Notice } from '../components/States'
import { errorMessage } from '../lib/errors'
import { bookableDays, formatAppointmentTime, formatPrice } from '../lib/format'

export function BookingPage() {
  const { t } = useTranslation()
  const barberId = Number(useParams().id)

  const barber = useQuery({ queryKey: ['barber', barberId], queryFn: () => barbersApi.get(barberId) })
  const services = useQuery({ queryKey: ['services', barberId], queryFn: () => barbersApi.services(barberId) })
  const photos = useQuery({ queryKey: ['photos', barberId], queryFn: () => barbersApi.photos(barberId) })

  if (barber.isPending || services.isPending) return <Loading />
  if (barber.isError) return <ErrorState error={barber.error} onRetry={() => barber.refetch()} />
  if (services.isError) return <ErrorState error={services.error} onRetry={() => services.refetch()} />

  return (
    <div className="flex flex-col gap-7">
      <div className="pt-2">
        <BackLink to="/" label={t('nav.back')} />
      </div>
      <BarberHeader barber={barber.data} />
      {photos.data && <Gallery title={t('booking.gallery')} photos={photos.data} />}
      {services.data.length === 0 ? (
        <p className="text-muted">{t('booking.noServices')}</p>
      ) : (
        <BookingForm barber={barber.data} services={services.data} />
      )}
    </div>
  )
}

function BarberHeader({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  const place = [barber.shopName ?? t('barbers.independent'), barber.address ?? barber.city].filter(Boolean).join(' · ')
  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex items-end gap-4">
        {barber.avatarUrl && <Avatar name={barber.name} url={barber.avatarUrl} size={72} />}
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-sm font-semibold tracking-wider text-accent uppercase">{t('booking.bookWith')}</p>
          <h1 className="font-display text-5xl leading-none font-extrabold break-words uppercase">{barber.name}</h1>
        </div>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        {place}
      </p>
      {barber.bio && <p className="pt-1 text-muted">{barber.bio}</p>}
    </section>
  )
}

function BookingForm({ barber, services }: { barber: Barber; services: { id: number; name: string; durationMinutes: number; price: number }[] }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  const days = bookableDays()

  const [serviceId, setServiceId] = useState(services[0].id)
  const [date, setDate] = useState(days[0].iso)
  const [time, setTime] = useState<string | null>(null)
  const [booked, setBooked] = useState<Appointment | null>(null)

  const service = services.find((s) => s.id === serviceId)!
  const day = days.find((d) => d.iso === date)!

  const availability = useQuery({
    queryKey: ['availability', barber.id, serviceId, date],
    queryFn: () => barbersApi.availability(barber.id, serviceId, date),
  })

  const book = useMutation({
    mutationFn: () => appointmentsApi.book({ barberId: barber.id, serviceId, startTime: `${date}T${time}` }),
    onSuccess: (appointment) => {
      setBooked(appointment)
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setTime(null)
        void availability.refetch()
      }
    },
  })

  if (booked) return <BookingDone appointment={booked} />

  const choose = (change: () => void) => {
    change()
    setTime(null)
    book.reset()
  }

  return (
    <>
      <section className="flex flex-col gap-2.5">
        <StepTitle>{t('booking.stepService')}</StepTitle>
        {services.map((s) => {
          const selected = s.id === serviceId
          return (
            <button
              key={s.id}
              aria-pressed={selected}
              onClick={() => choose(() => setServiceId(s.id))}
              className={`flex min-h-16 items-center gap-3 rounded-2xl border-2 bg-surface px-4 py-3 text-left ${selected ? 'border-accent' : 'border-surface'}`}
            >
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-semibold">{s.name}</span>
                <span className="text-sm text-muted">{t('common.minutes', { count: s.durationMinutes })}</span>
              </span>
              <span className={`font-display text-2xl font-extrabold ${selected ? 'text-accent' : ''}`}>{formatPrice(s.price)}</span>
            </button>
          )
        })}
      </section>

      <DayPicker
        title={<StepTitle>{t('booking.stepDay')}</StepTitle>}
        days={days}
        selected={date}
        onSelect={(iso) => choose(() => setDate(iso))}
      />

      <section className="flex flex-col gap-2.5">
        <StepTitle>{t('booking.stepTime')}</StepTitle>
        {availability.isPending && <Loading />}
        {availability.isError && <ErrorState error={availability.error} onRetry={() => availability.refetch()} />}
        {availability.data?.startTimes.length === 0 && <p className="py-4 text-muted">{t('booking.noTimes')}</p>}
        <div className="grid grid-cols-3 gap-2">
          {availability.data?.startTimes.map((slot) => {
            const selected = slot === time
            return (
              <button
                key={slot}
                aria-pressed={selected}
                onClick={() => {
                  setTime(slot)
                  book.reset()
                }}
                className={`min-h-12 rounded-xl font-semibold ${selected ? 'bg-accent text-ground' : 'bg-surface text-ink hover:bg-surface-2'}`}
              >
                {slot}
              </button>
            )
          })}
        </div>
      </section>

      {book.isError && (
        <Notice tone="error">
          {book.error instanceof ApiError && book.error.status === 409 ? t('booking.slotTaken') : errorMessage(book.error, t)}
        </Notice>
      )}

      {/* Keeps the last time slots reachable above the fixed booking bar. */}
      <div aria-hidden="true" className="h-24" />

      {/* Sits above the customer's bottom menu when it is shown. */}
      <div
        className={`fixed inset-x-0 z-10 bg-ground px-5 pt-3 shadow-[0_-12px_24px_rgba(0,0,0,0.5)] ${
          session?.role === 'CUSTOMER'
            ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))] pb-3'
            : 'bottom-0 pb-[max(1.25rem,env(safe-area-inset-bottom))]'
        }`}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          {!session ? (
            <Link
              to={`/login?next=${encodeURIComponent(location.pathname)}`}
              className="flex min-h-14 items-center justify-center rounded-2xl bg-accent font-bold text-ground"
            >
              {t('booking.loginToBook')}
            </Link>
          ) : session.role !== 'CUSTOMER' ? (
            <Notice>{t('booking.onlyCustomers')}</Notice>
          ) : (
            <Button
              className="flex min-h-14 items-center justify-between text-lg"
              disabled={!time || book.isPending}
              onClick={() => book.mutate()}
            >
              <span>{time ? t('booking.cta', { day: `${day.weekday} ${day.day}`, time }) : t('booking.pickTime')}</span>
              <span className="font-display text-2xl font-extrabold">{formatPrice(service.price)}</span>
            </Button>
          )}
          <p className="text-center text-sm text-muted">{t('common.payInShop')}</p>
        </div>
      </div>
    </>
  )
}

function BookingDone({ appointment }: { appointment: Appointment }) {
  const { t } = useTranslation()
  const confirmed = appointment.status === 'CONFIRMED'
  return (
    <section className="flex flex-col gap-4 overflow-hidden rounded-2xl bg-surface p-6 pt-0" aria-live="polite">
      <FadeLines className="-mx-6 mb-2" />
      <h2 className={`font-display text-4xl font-extrabold uppercase ${confirmed ? 'text-accent' : ''}`}>
        {confirmed ? t('booking.confirmedTitle') : t('booking.pendingTitle')}
      </h2>
      <p className="text-muted">
        {confirmed ? t('booking.confirmedBody', { when: formatAppointmentTime(appointment.startTime) }) : t('booking.pendingBody')}
      </p>
      <p className="font-semibold">
        {appointment.serviceName} · {formatPrice(appointment.price)}
      </p>
      <Link to="/appointments" className="flex min-h-12 items-center justify-center rounded-2xl bg-accent font-semibold text-ground">
        {t('booking.seeAppointments')}
      </Link>
    </section>
  )
}

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{children}</h2>
}
