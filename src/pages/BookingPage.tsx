import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, mediaUrl } from '../api/client'
import { appointmentsApi, barbersApi } from '../api/endpoints'
import type { Appointment, Barber } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { BackLink } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { Gallery } from '../components/Gallery'
import { BookingTicket } from '../components/BookingTicket'
import { NotFoundPage } from './NotFoundPage'
import { FadeLines } from '../components/Logo'
import { Button } from '../components/Button'
import { DayPicker } from '../components/DayPicker'
import { ErrorState, Loading, Notice } from '../components/States'
import { errorMessage, hasCode } from '../lib/errors'
import { bookableDays, formatPrice } from '../lib/format'

export function BookingPage() {
  const { t } = useTranslation()
  // Reached as /barbers/12 or through the barber's short link, /giorgos.
  const params = useParams()
  const byLink = params.slug !== undefined

  const barber = useQuery({
    queryKey: byLink ? ['barber', 'link', params.slug] : ['barber', Number(params.id)],
    queryFn: () => (byLink ? barbersApi.byLink(params.slug!) : barbersApi.get(Number(params.id))),
  })
  const barberId = barber.data?.id
  const services = useQuery({
    queryKey: ['services', barberId],
    queryFn: () => barbersApi.services(barberId!),
    enabled: barberId !== undefined,
  })
  const photos = useQuery({
    queryKey: ['photos', barberId],
    queryFn: () => barbersApi.photos(barberId!),
    enabled: barberId !== undefined,
  })

  if (barber.isError) {
    return byLink && barber.error instanceof ApiError && barber.error.status === 404 ? (
      <NotFoundPage />
    ) : (
      <ErrorState error={barber.error} onRetry={() => barber.refetch()} />
    )
  }
  if (barber.isPending || services.isPending) return <Loading />
  if (services.isError) return <ErrorState error={services.error} onRetry={() => services.refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <BarberHero barber={barber.data} />
      <BarberAbout barber={barber.data} />
      {photos.data && <Gallery layout="strip" title={t('booking.gallery')} photos={photos.data} />}
      {services.data.length === 0 ? (
        <p className="text-muted">{t('booking.noServices')}</p>
      ) : (
        <BookingForm barber={barber.data} services={services.data} />
      )}
    </div>
  )
}

/** Full-width cover (latest work photo) with the barber's photo and name over its bottom edge. */
function BarberHero({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  return (
    <section className="relative -mx-5 -mt-2 mb-9 h-[260px] bg-surface-2">
      {barber.coverUrl ? (
        <img src={mediaUrl(barber.coverUrl)} alt="" className="size-full object-cover" />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-b from-surface-2 to-ground">
          <FadeLines className="w-28 opacity-30" />
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ground to-transparent" />
      <div className="absolute top-3 left-5">
        <BackLink to="/" label={t('nav.back')} />
      </div>
      <div className="absolute inset-x-5 -bottom-9 flex items-end gap-3.5">
        <span className="rounded-[22px] border-4 border-ground">
          <Avatar name={barber.name} url={barber.avatarUrl} size={80} />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5 pb-1.5">
          <span className="text-[13px] font-semibold text-accent">{t('booking.eyebrow')}</span>
          <h1 className="font-display text-[40px] leading-[0.95] font-extrabold break-words uppercase">{barber.name}</h1>
        </div>
      </div>
    </section>
  )
}

function BarberAbout({ barber }: { barber: Barber }) {
  const place = [barber.shopName, barber.address, barber.city].filter(Boolean).join(', ')
  if (!place && !barber.bio) return null
  return (
    <section className="flex flex-col gap-2">
      {place && (
        <p className="flex items-center gap-1.5 text-sm text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {place}
        </p>
      )}
      {barber.bio && <p className="text-[15px] leading-relaxed text-ink/85">{barber.bio}</p>}
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
      if (hasCode(error, 'SLOT_TAKEN')) {
        setTime(null)
        void availability.refetch()
      }
    },
  })

  if (booked) return <BookingTicket appointment={booked} barber={barber} />

  const choose = (change: () => void) => {
    change()
    setTime(null)
    book.reset()
  }

  return (
    <>
      {/* Read like the price board on a barbershop wall: name, dotted leader, price. */}
      <section className="flex flex-col gap-1">
        <h2 className="mb-2 font-display text-[26px] font-extrabold uppercase">{t('booking.stepService')}</h2>
        {services.map((s) => {
          const selected = s.id === serviceId
          return (
            <button
              key={s.id}
              aria-pressed={selected}
              onClick={() => choose(() => setServiceId(s.id))}
              className={`flex min-h-14 flex-col gap-0.5 py-3 text-left ${selected ? 'text-accent' : 'text-ink'}`}
            >
              <span className="flex w-full items-baseline gap-2">
                <span aria-hidden="true" className={`size-2 shrink-0 self-center rounded-full ${selected ? 'bg-accent' : 'bg-transparent'}`} />
                <span className="text-[17px] font-semibold">{s.name}</span>
                <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-line" />
                <span className="font-display text-[22px] font-extrabold">{formatPrice(s.price)}</span>
              </span>
              <span className="pl-4 text-[13px] text-muted">{t('common.minutes', { count: s.durationMinutes })}</span>
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
        <div className="grid grid-cols-4 gap-2">
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
          {/* In the bar, next to the button, so it is seen without scrolling. */}
          {book.isError && <Notice tone="error">{errorMessage(book.error, t)}</Notice>}
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

function StepTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-extrabold uppercase">{children}</h2>
}
