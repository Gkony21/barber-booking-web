import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { Appointment, Barber, TimeOff } from '../../api/types'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'
import { athensDate, bookableDays, formatAppointmentTime, formatDayHeading, formatPrice, formatTime, servicesOf } from '../../lib/format'
import { byDay, dayOfWeek, isOff, monthGrid, planDay } from './calendar'
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
          <h1 className="font-display text-[52px] leading-[0.88] font-black italic uppercase">{t('barber.setupTitle')}</h1>
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
  const [today] = useState(() => bookableDays(1)[0].iso)
  const [month, setMonth] = useState(today.slice(0, 7)) // "YYYY-MM"
  const [selected, setSelected] = useState(today)
  const [onlyBooked, setOnlyBooked] = useState(false)
  // Open when adding by hand; a free stretch's "+ Κλείσε" fills in its day and time.
  const [adding, setAdding] = useState<{ date?: string; time?: string } | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  // The free stretch being turned into a block of hours, if any.
  const [blocking, setBlocking] = useState<{ start: string } | null>(null)
  const formAnchor = useRef<HTMLDivElement>(null)

  const [year, monthNumber] = month.split('-').map(Number)
  const grid = monthGrid(year, monthNumber)

  const monthAppointments = useQuery({
    queryKey: ['barber', 'appointments', 'month', month],
    queryFn: () => barberMeApi.appointments(grid.days[0], grid.days[grid.days.length - 1]),
    refetchInterval: 60_000, // new bookings show up without a manual refresh
  })
  // Requests waiting for an answer, whatever month is on screen.
  const [horizon] = useState(() => bookableDays(91))
  const upcoming = useQuery({
    queryKey: ['barber', 'appointments', horizon[0].iso, horizon[horizon.length - 1].iso],
    queryFn: () => barberMeApi.appointments(horizon[0].iso, horizon[horizon.length - 1].iso),
    refetchInterval: 60_000,
  })
  const services = useQuery({ queryKey: ['barber', 'services'], queryFn: barberMeApi.services })
  const hours = useQuery({ queryKey: ['barber', 'hours'], queryFn: barberMeApi.workingHours })
  const timeOff = useQuery({ queryKey: ['barber', 'time-off'], queryFn: barberMeApi.timeOff })

  const needsServices = services.data?.filter((s) => s.active && s.kind === 'MAIN').length === 0
  const needsHours = hours.data?.length === 0
  const requests = (upcoming.data ?? []).filter((a) => a.status === 'PENDING')

  const days = byDay(monthAppointments.data ?? [])
  const isClosed = (iso: string) =>
    isOff(iso, timeOff.data ?? []) || !(hours.data ?? []).some((h) => h.dayOfWeek === dayOfWeek(iso))

  const items = planDay(
    selected,
    days.get(selected) ?? [],
    hours.data ?? [],
    timeOff.data ?? [],
    selected === today ? formatTime(new Date().toISOString()) : null,
  ).filter((item) => item.kind === 'appointment' || (!onlyBooked && selected >= today))

  const showMonth = (next: string) => {
    setMonth(next)
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`)
  }
  const openForm = (prefill: { date?: string; time?: string }) => {
    setAdding(prefill)
    setJustSaved(false)
    requestAnimationFrame(() => formAnchor.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }))
  }

  const dayTitle =
    selected === today ? t('barber.schedule.today') : selected === horizon[1].iso ? t('barber.schedule.tomorrow') : formatDayHeading(selected)

  return (
    <div className="flex flex-col gap-7 pt-4">
      <h1 className="font-display text-[52px] leading-[0.88] font-black italic uppercase">{t('barber.schedule.title')}</h1>

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

      {requests.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-semibold tracking-wide text-accent uppercase">
            {t('barber.schedule.requests')} · {requests.length}
          </h2>
          {requests.map((a) => (
            <AppointmentRow key={a.id} appointment={a} dayLabel={formatDayHeading(athensDate(a.startTime))} />
          ))}
        </section>
      )}

      <MonthCalendar
        year={year}
        month={monthNumber}
        grid={grid}
        today={today}
        selected={selected}
        countOn={(iso) => days.get(iso)?.length ?? 0}
        isClosed={isClosed}
        onSelect={setSelected}
        onMonth={(delta) => showMonth(shiftMonth(month, delta))}
        onToday={() => showMonth(today.slice(0, 7))}
      />

      <div ref={formAnchor} className="scroll-mt-4">
        {adding ? (
          <NewAppointmentForm
            key={`${adding.date}-${adding.time}`}
            initialDate={adding.date}
            initialTime={adding.time}
            onDone={(saved) => {
              setAdding(null)
              setJustSaved(saved)
            }}
          />
        ) : (
          <Button className="w-full" onClick={() => openForm({ date: selected >= today ? selected : undefined })}>
            {t('barber.schedule.add')}
          </Button>
        )}
        {justSaved && (
          <div className="pt-3">
            <Notice tone="success">{t('barber.schedule.saved')}</Notice>
          </div>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-black italic uppercase first-letter:uppercase">{dayTitle}</h2>
        </div>
        <div role="radiogroup" aria-label={t('barber.schedule.view')} className="flex gap-1 rounded-xl bg-surface p-1">
          {([false, true] as const).map((only) => (
            <button
              key={String(only)}
              role="radio"
              aria-checked={onlyBooked === only}
              onClick={() => setOnlyBooked(only)}
              className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${onlyBooked === only ? 'bg-accent text-ground' : 'text-muted'}`}
            >
              {only ? t('barber.schedule.viewBooked') : t('barber.schedule.viewAll')}
            </button>
          ))}
        </div>

        {(monthAppointments.isPending || hours.isPending) && <Loading />}
        {monthAppointments.isError && <ErrorState error={monthAppointments.error} onRetry={() => monthAppointments.refetch()} />}

        {monthAppointments.isSuccess && items.length === 0 && (
          <p className="py-6 text-center text-muted">
            {onlyBooked || selected < today
              ? t('barber.schedule.noneThatDay')
              : isClosed(selected)
                ? t('barber.schedule.closed')
                : t('barber.schedule.fullyBooked')}
          </p>
        )}

        {items.map((item) =>
          item.kind === 'appointment' ? (
            <AppointmentRow key={item.appointment.id} appointment={item.appointment} />
          ) : item.kind === 'block' ? (
            <BlockRow key={`block-${item.timeOff.id}`} block={item.timeOff} />
          ) : blocking?.start === item.start ? (
            <BlockForm key={`blocking-${item.start}`} date={selected} from={item.start} to={item.end} onDone={() => setBlocking(null)} />
          ) : (
            <div
              key={`free-${item.start}`}
              className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-dashed border-line pr-2 pl-4 text-sm text-muted"
            >
              <span className="flex-1">{t('barber.schedule.free', { from: item.start, to: item.end })}</span>
              <button className="min-h-11 px-2 font-semibold text-muted hover:text-ink" onClick={() => setBlocking({ start: item.start })}>
                {t('barber.schedule.block')}
              </button>
              <button className="min-h-11 px-2 font-semibold text-accent" onClick={() => openForm({ date: selected, time: item.start })}>
                {t('barber.schedule.bookHere')}
              </button>
            </div>
          ),
        )}
      </section>
    </div>
  )
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

const monthTitleFormat = new Intl.DateTimeFormat('el-GR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const WEEKDAYS = ['Δευ', 'Τρί', 'Τετ', 'Πέμ', 'Παρ', 'Σάβ', 'Κυρ']

/** A month at a glance: one dot per appointment (up to three), closed days dimmed. */
function MonthCalendar({
  year,
  month,
  grid,
  today,
  selected,
  countOn,
  isClosed,
  onSelect,
  onMonth,
  onToday,
}: {
  year: number
  month: number
  grid: { lead: number; days: string[] }
  today: string
  selected: string
  countOn: (iso: string) => number
  isClosed: (iso: string) => boolean
  onSelect: (iso: string) => void
  onMonth: (delta: number) => void
  onToday: () => void
}) {
  const { t } = useTranslation()
  const arrow = 'flex size-10 items-center justify-center rounded-xl bg-surface text-ink hover:bg-surface-2'

  return (
    <section className="flex flex-col gap-3" aria-label={t('barber.schedule.calendar')}>
      <div className="flex items-center gap-2">
        <h2 className="flex-1 font-display text-2xl font-black italic uppercase">
          {monthTitleFormat.format(new Date(Date.UTC(year, month - 1, 15)))}
        </h2>
        <button className="min-h-10 rounded-xl bg-surface px-3 text-sm font-semibold text-accent hover:bg-surface-2" onClick={onToday}>
          {t('barber.schedule.today')}
        </button>
        <button className={arrow} aria-label={t('barber.schedule.previousMonth')} onClick={() => onMonth(-1)}>
          ‹
        </button>
        <button className={arrow} aria-label={t('barber.schedule.nextMonth')} onClick={() => onMonth(1)}>
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="pb-1 text-[11px] font-semibold text-muted">
            {day}
          </span>
        ))}
        {Array.from({ length: grid.lead }, (_, i) => (
          <span key={`lead-${i}`} />
        ))}
        {grid.days.map((iso) => {
          const count = countOn(iso)
          const isSelected = iso === selected
          const dim = iso < today || isClosed(iso)
          return (
            <button
              key={iso}
              onClick={() => onSelect(iso)}
              aria-pressed={isSelected}
              aria-label={`${formatDayHeading(iso)}${count ? `, ${t('barber.schedule.count', { count })}` : ''}`}
              className={`flex h-12 flex-col items-center justify-center gap-1 rounded-xl text-[15px] font-semibold ${
                isSelected ? 'bg-ink text-ground' : dim ? 'text-faint hover:bg-surface' : 'text-ink hover:bg-surface'
              } ${iso === today && !isSelected ? 'ring-2 ring-accent ring-inset' : ''}`}
            >
              {Number(iso.slice(8))}
              <span aria-hidden="true" className="flex h-1.5 gap-0.5">
                {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                  <span key={i} className={`size-1.5 rounded-full ${isSelected ? 'bg-ground' : 'bg-accent'}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function AppointmentRow({ appointment, dayLabel }: { appointment: Appointment; dayLabel?: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const pending = appointment.status === 'PENDING'
  const noShow = appointment.status === 'NO_SHOW'
  // A customer asking to move a confirmed appointment: this request holds the new time.
  const isChange = Boolean(appointment.originalStartTime)
  // Once it has started, a no-show can be marked instead of cancelling.
  const started = new Date(appointment.startTime).getTime() <= Date.now()

  const action = useMutation({
    mutationFn: (kind: 'confirm' | 'reject' | 'cancel' | 'noShow') => barberMeApi[kind](appointment.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barber', 'appointments'] }),
  })

  const run = (kind: 'confirm' | 'reject' | 'cancel' | 'noShow') => {
    if (kind === 'reject' && !window.confirm(t(isChange ? 'barber.schedule.confirmRejectChange' : 'barber.schedule.confirmReject')))
      return
    if (kind === 'cancel' && !window.confirm(t('barber.schedule.confirmCancel'))) return
    if (kind === 'noShow' && !window.confirm(t('barber.schedule.confirmNoShow'))) return
    action.mutate(kind)
  }

  return (
    <article className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 ${pending ? 'border-2 border-accent' : ''}`}>
      <div className="flex items-start gap-4">
        <div className="flex w-16 shrink-0 flex-col">
          <span className="font-display text-2xl leading-none font-black">{formatTime(appointment.startTime)}</span>
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
            {isChange && (
              <span className="shrink-0 rounded-md bg-accent/20 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                {t('barber.schedule.changeBadge')}
              </span>
            )}
            {noShow && (
              <span className="shrink-0 rounded-md bg-danger/20 px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                {t('barber.schedule.noShowBadge')}
              </span>
            )}
            {!noShow && (appointment.customerNoShows ?? 0) > 0 && (
              <span className="shrink-0 rounded-md bg-danger/20 px-1.5 py-0.5 text-[11px] font-semibold text-danger">
                {t('barber.schedule.pastNoShows', { count: appointment.customerNoShows })}
              </span>
            )}
          </span>
          <span className="text-sm text-muted">
            {servicesOf(appointment)} · {formatPrice(appointment.price)}
          </span>
          {appointment.originalStartTime && (
            <span className="text-sm font-semibold text-accent">
              {t('barber.schedule.changeFrom', { when: formatAppointmentTime(appointment.originalStartTime) })}
            </span>
          )}
          {appointment.requestedStartTime && (
            <span className="text-sm font-semibold text-accent">
              {t('barber.schedule.changeAskedFor', { when: formatAppointmentTime(appointment.requestedStartTime) })}
            </span>
          )}
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
        ) : noShow ? null : started ? (
          !appointment.manual && (
            <Button variant="ghost" className="ml-auto min-h-11 px-3 text-sm" disabled={action.isPending} onClick={() => run('noShow')}>
              {t('barber.schedule.markNoShow')}
            </Button>
          )
        ) : (
          <Button variant="ghost" className="ml-auto min-h-11 px-3 text-sm" disabled={action.isPending} onClick={() => run('cancel')}>
            {t('barber.schedule.cancel')}
          </Button>
        )}
      </div>
    </article>
  )
}

// Quarter hours from..to, for choosing part of a free stretch.
function quarters(from: string, to: string): string[] {
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const out: string[] = []
  for (let m = Math.ceil(minutes(from) / 15) * 15; m <= minutes(to); m += 15) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`)
  }
  return out
}

/** Keeps part of a free stretch for the barber (a doctor's visit, a break); customers cannot book it. */
function BlockForm({ date, from, to, onDone }: { date: string; from: string; to: string; onDone: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const options = quarters(from, to)
  const [start, setStart] = useState(options[0] ?? from)
  const [end, setEnd] = useState(options[options.length - 1] ?? to)
  const [reason, setReason] = useState('')

  const save = useMutation({
    mutationFn: () =>
      barberMeApi.addTimeOff({ startDate: date, endDate: date, startTime: start, endTime: end, reason: reason.trim() || null }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber', 'time-off'] })
      onDone()
    },
  })
  const select =
    'min-h-11 w-full rounded-xl border-2 border-surface-2 bg-surface-2 px-3 text-ink [color-scheme:dark] focus:border-accent focus:outline-none'

  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-accent bg-surface p-4">
      <span className="font-semibold">{t('barber.schedule.blockTitle')}</span>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t('barber.hours.from')}
          <select value={start} onChange={(e) => setStart(e.target.value)} className={select}>
            {options.slice(0, -1).map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          {t('barber.hours.to')}
          <select value={end} onChange={(e) => setEnd(e.target.value)} className={select}>
            {options.filter((time) => time > start).map((time) => (
              <option key={time}>{time}</option>
            ))}
          </select>
        </label>
      </div>
      <TextField onSurface label={t('barber.schedule.blockReason')} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />
      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={end <= start || save.isPending} onClick={() => save.mutate()}>
          {t('barber.schedule.blockSave')}
        </Button>
        <Button variant="tonal" onClick={onDone}>
          {t('barber.schedule.close')}
        </Button>
      </div>
    </div>
  )
}

function BlockRow({ block }: { block: TimeOff }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const remove = useMutation({
    mutationFn: () => barberMeApi.deleteTimeOff(block.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barber', 'time-off'] }),
  })
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-2xl bg-surface-2 pr-2 pl-4 text-sm">
      <span className="flex-1">
        <span className="font-semibold">{t('barber.schedule.blocked', { from: block.startTime, to: block.endTime })}</span>
        {block.reason && <span className="text-muted"> · {block.reason}</span>}
      </span>
      <button className="min-h-11 px-2 font-semibold text-muted hover:text-ink" disabled={remove.isPending} onClick={() => remove.mutate()}>
        {t('barber.schedule.unblock')}
      </button>
    </div>
  )
}
