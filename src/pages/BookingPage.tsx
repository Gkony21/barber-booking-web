import { useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, mediaUrl } from '../api/client'
import { appointmentsApi, barbersApi } from '../api/endpoints'
import type { Appointment, Barber, ServiceOffering } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { BackLink } from '../components/AppShell'
import { Avatar } from '../components/Avatar'
import { Gallery } from '../components/Gallery'
import { BookingTicket } from '../components/BookingTicket'
import { NotFoundPage } from './NotFoundPage'
import { DefaultCover } from '../components/DefaultCover'
import { Button } from '../components/Button'
import { DayPicker } from '../components/DayPicker'
import { ErrorState, Loading, Notice } from '../components/States'
import { errorMessage, hasCode } from '../lib/errors'
import { bookableDays, formatAppointmentTime, formatPrice, placeOf, servicesOf } from '../lib/format'

export function BookingPage() {
  const { t } = useTranslation()
  // Reached as /barbers/12 or through the barber's short link, /giorgos.
  const params = useParams()
  const byLink = params.slug !== undefined
  // "Αλλαγή ώρας" from the customer's appointments: /barbers/12?reschedule=34
  const [search] = useSearchParams()
  const rescheduleId = Number(search.get('reschedule')) || null
  const mine = useQuery({ queryKey: ['appointments', 'mine'], queryFn: appointmentsApi.mine, enabled: rescheduleId !== null })
  const moving = mine.data?.find((a) => a.id === rescheduleId && (a.status === 'PENDING' || a.status === 'CONFIRMED'))

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
  if (barber.isPending || services.isPending || (rescheduleId !== null && mine.isPending)) return <Loading />
  if (services.isError) return <ErrorState error={services.error} onRetry={() => services.refetch()} />

  return (
    <div className="flex flex-col gap-6">
      <BarberHero barber={barber.data} />
      <BarberAbout barber={barber.data} />
      {photos.data && <Gallery layout="strip" title={t('booking.gallery')} photos={photos.data} />}
      {moving || services.data.some((s) => s.kind === 'MAIN') ? (
        <BookingForm barber={barber.data} services={services.data} moving={moving} />
      ) : (
        <p className="text-muted">{t('booking.noServices')}</p>
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
        <DefaultCover />
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
  const place = placeOf(barber)
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

/** Books a new appointment, or with `moving` picks a new time for an existing one (same services). */
function BookingForm({ barber, services, moving }: { barber: Barber; services: ServiceOffering[]; moving?: Appointment }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const location = useLocation()
  const queryClient = useQueryClient()
  // Today plus as many days ahead as this barber takes bookings.
  const days = bookableDays(barber.bookingWindowDays + 1)

  const mains = services.filter((s) => s.kind === 'MAIN')
  const extras = services.filter((s) => s.kind === 'EXTRA')
  // Starts on the service the barber shows on their card, usually the plain haircut.
  const [serviceId, setServiceId] = useState((mains.find((s) => s.featured) ?? mains[0])?.id ?? 0)
  const [extraIds, setExtraIds] = useState<number[]>([])
  const [note, setNote] = useState('')
  // The day the customer tapped; until then, the first day with free times.
  const [pickedDate, setPickedDate] = useState<string | null>(null)
  const [time, setTime] = useState<string | null>(null)
  const [booked, setBooked] = useState<Appointment | null>(null)

  // Extras add their time and price to the chosen main service.
  const chosen = services.filter((s) => s.id === serviceId || extraIds.includes(s.id))
  const totalPrice = moving ? moving.price : chosen.reduce((sum, s) => sum + s.price, 0)
  const totalMinutes = moving ? moving.durationMinutes : chosen.reduce((sum, s) => sum + s.durationMinutes, 0)
  const dayStatuses = useQuery({
    queryKey: moving ? ['days', barber.id, 'move', moving.id] : ['days', barber.id, serviceId, extraIds],
    queryFn: () =>
      moving
        ? appointmentsApi.moveDays(moving.id, days[0].iso, days[days.length - 1].iso)
        : barbersApi.days(barber.id, serviceId, extraIds, days[0].iso, days[days.length - 1].iso),
  })
  const statusOf = (iso: string) => dayStatuses.data?.find((d) => d.date === iso)?.status
  const firstOpen = dayStatuses.data?.find((d) => d.status === 'OPEN')?.date
  const date = pickedDate ?? firstOpen ?? days[0].iso
  const closed = statusOf(date) === 'CLOSED'
  const day = days.find((d) => d.iso === date)!

  const availability = useQuery({
    queryKey: moving ? ['availability', barber.id, 'move', moving.id, date] : ['availability', barber.id, serviceId, extraIds, date],
    queryFn: () =>
      moving
        ? appointmentsApi.moveAvailability(moving.id, date)
        : barbersApi.availability(barber.id, serviceId, extraIds, date),
    // Wait for the day statuses, so the first request is already for the day shown; skip closed days.
    enabled: (pickedDate !== null || !dayStatuses.isPending) && !closed,
  })

  const book = useMutation({
    mutationFn: () =>
      moving
        ? appointmentsApi.reschedule(moving.id, `${date}T${time}`)
        : appointmentsApi.book({ barberId: barber.id, serviceId, extraIds, startTime: `${date}T${time}`, note: note.trim() || undefined }),
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
      {moving && (
        <section className="flex flex-col gap-1 rounded-2xl border-2 border-accent bg-surface p-4">
          <h2 className="font-display text-xl font-extrabold uppercase">{t('booking.moveTitle')}</h2>
          <p className="font-semibold">{servicesOf(moving)}</p>
          <p className="text-sm text-muted first-letter:uppercase">
            {t('booking.moveFrom')}: {formatAppointmentTime(moving.startTime)}
          </p>
        </section>
      )}

      {/* Read like the price board on a barbershop wall: name, dotted leader, price. The empty circle on
          every line shows it can be picked; one is filled. */}
      {!moving && (
        <section role="radiogroup" aria-labelledby="step-service" className="flex flex-col gap-1">
          <h2 id="step-service" className="mb-2 font-display text-[26px] font-extrabold uppercase">
            {t('booking.stepService')}
          </h2>
          {mains.map((s) => {
            const selected = s.id === serviceId
            return (
              <button
                key={s.id}
                role="radio"
                aria-checked={selected}
                onClick={() => choose(() => setServiceId(s.id))}
                className={`flex min-h-14 items-start gap-3 py-3 text-left ${selected ? 'text-accent' : 'text-ink'}`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                    selected ? 'border-accent' : 'border-faint'
                  }`}
                >
                  {selected && <span className="size-2.5 rounded-full bg-accent" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex w-full items-baseline gap-2">
                    <span className="text-[17px] font-semibold">{s.name}</span>
                    <span aria-hidden="true" className="min-w-6 flex-1 -translate-y-1 border-b-2 border-dotted border-line" />
                    <span className="font-display text-[22px] font-extrabold">{formatPrice(s.price)}</span>
                  </span>
                  {s.description && <span className="text-[13px] leading-snug text-ink/75">{s.description}</span>}
                  <span className="text-[13px] text-muted">{t('common.minutes', { count: s.durationMinutes })}</span>
                </span>
              </button>
            )
          })}
        </section>
      )}

      {!moving && extras.length > 0 && (
        <section className="flex flex-col gap-1">
          <StepTitle>{t('booking.stepExtras')}</StepTitle>
          <p className="mb-1 text-[13px] text-muted">{t('booking.extrasHint')}</p>
          {extras.map((s) => {
            const selected = extraIds.includes(s.id)
            return (
              <button
                key={s.id}
                role="checkbox"
                aria-checked={selected}
                onClick={() =>
                  choose(() => setExtraIds(selected ? extraIds.filter((id) => id !== s.id) : [...extraIds, s.id]))
                }
                className={`flex min-h-12 items-center gap-3 py-2 text-left ${selected ? 'text-accent' : 'text-ink'}`}
              >
                <span
                  aria-hidden="true"
                  className={`flex size-5 shrink-0 items-center justify-center rounded-md border-2 text-[13px] font-bold ${
                    selected ? 'border-accent bg-accent text-ground' : 'border-faint'
                  }`}
                >
                  {selected && '✓'}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[16px] font-semibold">{s.name}</span>
                  {s.description && <span className="text-[13px] text-muted">{s.description}</span>}
                </span>
                <span className="flex flex-col items-end">
                  <span className="font-display text-lg font-extrabold">
                    {s.price === 0 ? t('common.free') : `+${formatPrice(s.price)}`}
                  </span>
                  <span className="text-[12px] text-muted">+{t('common.minutes', { count: s.durationMinutes })}</span>
                </span>
              </button>
            )
          })}
        </section>
      )}

      <DayPicker
        title={<StepTitle>{t('booking.stepDay')}</StepTitle>}
        days={days}
        selected={date}
        onSelect={(iso) => choose(() => setPickedDate(iso))}
        statusOf={statusOf}
      />

      <section className="flex flex-col gap-2.5">
        <StepTitle>{t('booking.stepTime')}</StepTitle>
        {availability.isLoading && <Loading />}
        {availability.isError && <ErrorState error={availability.error} onRetry={() => availability.refetch()} />}
        {closed && <p className="py-4 text-muted">{t('booking.closedDay')}</p>}
        {!closed && availability.data?.startTimes.length === 0 && <p className="py-4 text-muted">{t('booking.noTimes')}</p>}
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

      {session?.role === 'CUSTOMER' && !moving && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="note" className="text-sm font-medium text-muted">
            {t('booking.note')}
          </label>
          <textarea
            id="note"
            rows={2}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('booking.notePlaceholder')}
            className="rounded-xl border-2 border-surface bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
          />
        </div>
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
          {/* In the bar, next to the button, so it is seen without scrolling. */}
          {book.isError && (
            <Notice tone="error">
              {errorMessage(book.error, t)}
              {hasCode(book.error, 'PHONE_REQUIRED') && (
                <>
                  {' '}
                  <Link to="/account" className="font-semibold underline">
                    {t('booking.addPhone')}
                  </Link>
                </>
              )}
            </Notice>
          )}
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
              <span>
                {time
                  ? t(moving ? 'booking.moveCta' : 'booking.cta', { day: `${day.weekday} ${day.day}`, time })
                  : t('booking.pickTime')}
              </span>
              <span className="flex flex-col items-end leading-none">
                <span className="font-display text-2xl font-extrabold">{formatPrice(totalPrice)}</span>
                {extraIds.length > 0 && <span className="text-xs font-semibold">{t('common.minutes', { count: totalMinutes })}</span>}
              </span>
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
