import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { Appointment, Barber } from '../api/types'
import { buildIcs, directionsUrl, downloadIcs } from '../lib/calendar'
import { athensDate, formatDayHeading, formatPrice, formatTime, servicesOf } from '../lib/format'

/** The booking confirmation, laid out like a ticket. */
export function BookingTicket({ appointment, barber }: { appointment: Appointment; barber: Barber }) {
  const { t } = useTranslation()
  const confirmed = appointment.status === 'CONFIRMED'
  const where = [barber.shopName, barber.address, barber.city].filter(Boolean)
  const address = where.join(', ')
  const ticket = useRef<HTMLElement>(null)

  // Bring the whole ticket into view; it replaces the booking form further down the page.
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ticket.current?.scrollIntoView?.({ block: 'start', behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  function addToCalendar() {
    downloadIcs(
      'fade-rantevou.ics',
      buildIcs({
        uid: `appointment-${appointment.id}@fade`,
        start: appointment.startTime,
        end: appointment.endTime,
        title: t('booking.calendarTitle', { service: servicesOf(appointment) }),
        location: address || undefined,
        description: `${t('booking.ticketBarber')}: ${barber.name}`,
      }),
    )
  }

  return (
    <section ref={ticket} aria-live="polite" className="flex scroll-mt-4 flex-col gap-4">
      <article className="overflow-hidden rounded-3xl bg-surface">
        {/* The logo's fade lines draw in once when the booking is made. */}
        <div aria-hidden="true" className="flex flex-col gap-[3px]">
          {[7, 5, 4, 3, 2, 1].map((h, i) => (
            <span
              key={h}
              className="block origin-left bg-accent motion-safe:animate-[ticket-line_0.6s_ease-out_both]"
              style={{ height: h, animationDelay: `${i * 70}ms` }}
            />
          ))}
        </div>

        <div className="flex flex-col gap-1 px-[22px] pt-[22px] pb-[18px]">
          <span className="font-display text-[22px] font-extrabold text-accent uppercase">
            {confirmed ? t('booking.ticketBooked') : t('booking.ticketRequested')}
          </span>
          <span className="font-display text-[84px] leading-[0.9] font-extrabold tracking-tight">{formatTime(appointment.startTime)}</span>
          <span className="text-[17px] font-semibold first-letter:uppercase">{formatDayHeading(athensDate(appointment.startTime))}</span>
        </div>

        <div aria-hidden="true" className="relative flex h-6 items-center">
          <span className="absolute -left-3 size-6 rounded-full bg-ground" />
          <span className="mx-[22px] flex-1 border-t-2 border-dashed border-line" />
          <span className="absolute -right-3 size-6 rounded-full bg-ground" />
        </div>

        <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-[18px] gap-y-3 px-[22px] pt-3.5 pb-[22px] text-[15px]">
          <dt className="text-muted">{t('booking.ticketService')}</dt>
          <dd className="m-0 font-semibold">
            {servicesOf(appointment)}, {t('common.minutes', { count: appointment.durationMinutes })}
          </dd>
          <dt className="text-muted">{t('booking.ticketBarber')}</dt>
          <dd className="m-0 font-semibold">{barber.name}</dd>
          {where.length > 0 && (
            <>
              <dt className="text-muted">{t('booking.ticketWhere')}</dt>
              <dd className="m-0 font-semibold">{address}</dd>
            </>
          )}
          <dt className="text-muted">{t('booking.ticketPrice')}</dt>
          <dd className="m-0 font-semibold">
            {formatPrice(appointment.price)} <span className="font-normal text-muted">{t('booking.ticketInShop')}</span>
          </dd>
        </dl>
      </article>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={addToCalendar}
          className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-accent font-bold text-ground hover:bg-accent-strong"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" />
            <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
          </svg>
          {t('booking.addToCalendar')}
        </button>
        {address ? (
          <a
            href={directionsUrl(address)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-surface font-bold text-ink hover:bg-surface-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 11l18-8-8 18-2-8z" />
            </svg>
            {t('booking.directions')}
          </a>
        ) : (
          <span />
        )}
      </div>

      <p className="text-center text-sm text-muted">{confirmed ? t('booking.ticketNote') : t('booking.pendingBody')}</p>
      <Link to="/appointments" className="flex min-h-11 items-center justify-center font-semibold text-accent">
        {t('booking.seeAppointments')}
      </Link>
    </section>
  )
}
