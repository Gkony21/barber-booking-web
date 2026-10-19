import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { DayOfWeek, TimeOff, WorkingHours } from '../../api/types'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'
import { bookableDays, formatShortDate } from '../../lib/format'
import { addBreak, isValidWeek, WEEK, type Shift, type Week } from './week'

export function BarberHoursPage() {
  const { t } = useTranslation()
  const hours = useQuery({ queryKey: ['barber', 'hours'], queryFn: barberMeApi.workingHours })

  return (
    <div className="flex flex-col gap-10 pt-4">
      <section className="flex flex-col gap-5">
        <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('barber.hours.title')}</h1>
        {hours.isPending && <Loading />}
        {hours.isError && <ErrorState error={hours.error} onRetry={() => hours.refetch()} />}
        {hours.isSuccess && <WeekEditor initial={toWeek(hours.data)} />}
      </section>
      <TimeOffSection />
    </div>
  )
}

function toWeek(hours: WorkingHours[]): Week {
  const week = Object.fromEntries(WEEK.map((day) => [day, [] as Shift[]])) as Week
  for (const h of hours) week[h.dayOfWeek].push({ start: h.startTime, end: h.endTime })
  return week
}

function WeekEditor({ initial }: { initial: Week }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [week, setWeek] = useState<Week>(initial)
  const [saved, setSaved] = useState(false)

  const update = (day: DayOfWeek, shifts: Shift[]) => {
    setSaved(false)
    setWeek({ ...week, [day]: shifts })
  }

  const save = useMutation({
    mutationFn: () =>
      barberMeApi.saveWorkingHours(
        WEEK.flatMap((day) => week[day].map((s) => ({ dayOfWeek: day, startTime: s.start, endTime: s.end }))),
      ),
    onSuccess: (data) => {
      queryClient.setQueryData(['barber', 'hours'], data)
      setSaved(true)
    },
  })

  const valid = isValidWeek(week)

  return (
    <div className="flex flex-col gap-3">
      {WEEK.map((day) => {
        const shifts = week[day]
        const open = shifts.length > 0
        return (
          <fieldset key={day} className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <legend className="contents font-semibold">{t(`barber.days.${day}`)}</legend>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <span className={open ? 'text-accent' : 'text-muted'}>{open ? t('barber.hours.open') : t('barber.hours.closed')}</span>
                <input
                  type="checkbox"
                  role="switch"
                  aria-label={`${t(`barber.days.${day}`)}: ${t('barber.hours.open')}`}
                  checked={open}
                  onChange={(e) => update(day, e.target.checked ? [{ start: '10:00', end: '20:00' }] : [])}
                  className="size-5 accent-accent"
                />
              </label>
            </div>

            {shifts.map((shift, index) => (
              <div key={index} className="flex items-end gap-2">
                <TimeInput
                  label={t('barber.hours.from')}
                  value={shift.start}
                  onChange={(start) => update(day, shifts.map((s, i) => (i === index ? { ...s, start } : s)))}
                />
                <TimeInput
                  label={t('barber.hours.to')}
                  value={shift.end}
                  onChange={(end) => update(day, shifts.map((s, i) => (i === index ? { ...s, end } : s)))}
                />
                {index > 0 && (
                  <button
                    type="button"
                    aria-label={t('barber.hours.removeShift')}
                    onClick={() => update(day, shifts.filter((_, i) => i !== index))}
                    className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted hover:text-ink"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            {open && shifts.length < 3 && (
              <button
                type="button"
                onClick={() => update(day, addBreak(shifts))}
                className="min-h-11 self-start text-sm font-semibold text-accent"
              >
                {t('barber.hours.addBreak')}
              </button>
            )}
          </fieldset>
        )
      })}

      {!valid && <Notice tone="error">{t('barber.hours.invalid')}</Notice>}
      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      {saved && <Notice tone="success">{t('barber.hours.saved')}</Notice>}

      <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
        {t('barber.hours.save')}
      </Button>
    </div>
  )
}

// Quarter-hour choices on a 24-hour clock; native time pickers follow the phone's AM/PM setting.
const TIMES = Array.from({ length: (24 - 6) * 4 }, (_, i) => {
  const minutes = 6 * 60 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const options = TIMES.includes(value) ? TIMES : [...TIMES, value].sort()
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 w-full rounded-xl border-2 border-surface-2 bg-surface-2 px-3 text-base text-ink focus:border-accent focus:outline-none"
      >
        {options.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </label>
  )
}

function TimeOffSection() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const timeOff = useQuery({ queryKey: ['barber', 'time-off'], queryFn: barberMeApi.timeOff })
  const [today] = useState(() => bookableDays(1)[0].iso)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [warning, setWarning] = useState<number | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['barber', 'time-off'] })

  const add = useMutation({
    mutationFn: () => barberMeApi.addTimeOff({ startDate, endDate: endDate || startDate, reason: reason.trim() || null }),
    onSuccess: (created: TimeOff) => {
      setWarning(created.activeAppointments > 0 ? created.activeAppointments : null)
      setStartDate('')
      setEndDate('')
      setReason('')
      void refresh()
    },
  })
  const remove = useMutation({ mutationFn: (id: number) => barberMeApi.deleteTimeOff(id), onSuccess: refresh })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (startDate) add.mutate()
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-3xl leading-none font-extrabold uppercase">{t('barber.timeOff.title')}</h2>
        <p className="text-sm text-muted">{t('barber.timeOff.body')}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-surface p-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <DateInput label={t('barber.timeOff.from')} min={today} value={startDate} onChange={setStartDate} />
          <DateInput label={t('barber.timeOff.to')} min={startDate || today} value={endDate} onChange={setEndDate} />
        </div>
        <TextField onSurface label={t('barber.timeOff.reason')} maxLength={255} value={reason} onChange={(e) => setReason(e.target.value)} />
        {add.isError && <Notice tone="error">{errorMessage(add.error, t)}</Notice>}
        <Button type="submit" disabled={!startDate || (endDate !== '' && endDate < startDate) || add.isPending}>
          {t('barber.timeOff.add')}
        </Button>
      </form>

      {warning !== null && <Notice tone="error">{t('barber.timeOff.hasAppointments', { count: warning })}</Notice>}

      {timeOff.isError && <ErrorState error={timeOff.error} onRetry={() => timeOff.refetch()} />}
      {timeOff.data?.length === 0 && <p className="text-muted">{t('barber.timeOff.empty')}</p>}
      <ul className="flex flex-col gap-2">
        {timeOff.data?.map((period) => (
          <li key={period.id} className="flex items-center gap-3 rounded-2xl bg-surface p-4">
            <div className="flex flex-1 flex-col gap-0.5">
              <span className="font-semibold">
                {period.startTime
                  ? `${formatShortDate(period.startDate)} · ${period.startTime}–${period.endTime}`
                  : period.startDate === period.endDate
                    ? formatShortDate(period.startDate)
                    : `${formatShortDate(period.startDate)} – ${formatShortDate(period.endDate)}`}
              </span>
              {period.reason && <span className="text-sm text-muted">{period.reason}</span>}
            </div>
            <Button variant="ghost" className="min-h-11 px-3 text-sm" disabled={remove.isPending} onClick={() => remove.mutate(period.id)}>
              {t('barber.timeOff.remove')}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function DateInput({ label, min, value, onChange }: { label: string; min: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-muted">
      {label}
      <input
        type="date"
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-12 rounded-xl border-2 border-surface-2 bg-surface-2 px-3 text-base text-ink [color-scheme:dark] focus:border-accent focus:outline-none"
      />
    </label>
  )
}
