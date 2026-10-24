import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { Appointment } from '../../api/types'
import { Button } from '../../components/Button'
import { Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'
import { athensDate, bookableDays, formatPrice, formatServicePrice, formatTime } from '../../lib/format'

// Quarter-hour choices; a barber may squeeze someone in outside their usual hours.
const TIMES = Array.from({ length: (24 - 6) * 4 }, (_, i) => {
  const minutes = 6 * 60 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

/**
 * For customers who call or walk in: books the time so online customers cannot take it. With
 * `appointment`, changes that one instead (time, services, and for one entered by hand its details).
 */
export function AppointmentForm({
  onDone,
  appointment,
  initialDate,
  initialTime,
  walkIn = false,
}: {
  onDone: (saved: boolean) => void
  appointment?: Appointment
  /** Pre-filled from a free stretch in the schedule ("+ Κλείσε"). */
  initialDate?: string
  initialTime?: string
  /** "Τώρα": someone just sat down, so the current quarter hour, whatever the working hours. */
  walkIn?: boolean
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const services = useQuery({ queryKey: ['barber', 'services'], queryFn: barberMeApi.services })
  const active = services.data?.filter((s) => s.active && s.kind === 'MAIN') ?? []
  const extras = services.data?.filter((s) => s.active && s.kind === 'EXTRA') ?? []
  const editing = appointment !== undefined
  // An app customer's own name, phone and note stay theirs; only times and services change.
  const ownDetails = !editing || appointment.manual

  const [today] = useState(() => bookableDays(1)[0].iso)
  const [serviceId, setServiceId] = useState<number | null>(appointment?.serviceId ?? null)
  const [extraIds, setExtraIds] = useState<number[]>(appointment?.extras.map((e) => e.serviceId) ?? [])
  const [date, setDate] = useState(appointment ? athensDate(appointment.startTime) : (initialDate ?? today))
  const [time, setTime] = useState(() => {
    const start = appointment ? formatTime(appointment.startTime) : walkIn ? currentQuarter() : initialTime
    return start && TIMES.includes(start) ? start : nextQuarter()
  })
  const [name, setName] = useState(appointment?.manual ? appointment.customerName : '')
  const [phone, setPhone] = useState(appointment?.manual ? (appointment.customerPhone ?? '') : '')
  const [note, setNote] = useState(appointment?.manual ? (appointment.note ?? '') : '')
  // Off: only free times within working hours. On: any quarter hour, e.g. a regular at 23:00.
  const [anyTime, setAnyTime] = useState(walkIn)

  // Starts on the service the barber shows on their card, usually the plain haircut.
  const chosenService = serviceId ?? (active.find((s) => s.featured) ?? active[0])?.id ?? null
  const minutes = (services.data ?? [])
    .filter((s) => s.id === chosenService || extraIds.includes(s.id))
    .reduce((sum, s) => sum + s.durationMinutes, 0)

  const free = useQuery({
    queryKey: ['barber', 'free', date, minutes, appointment?.id],
    queryFn: () => barberMeApi.availability(minutes, date, appointment?.id),
    enabled: chosenService !== null && minutes > 0 && !anyTime,
  })
  // The appointment's own time stays on offer, even if it lies outside the working hours.
  const ownTime = appointment && date === athensDate(appointment.startTime) ? formatTime(appointment.startTime) : null
  const freeTimes = free.data?.startTimes ?? []
  const options = anyTime ? TIMES : ownTime && !freeTimes.includes(ownTime) ? [...freeTimes, ownTime].sort() : freeTimes
  // Keep the chosen time while it is still on offer; otherwise the first one that is.
  const chosenTime = options.includes(time) ? time : (options[0] ?? '')

  const save = useMutation({
    mutationFn: () => {
      const start = { serviceId: chosenService!, extraIds, startTime: `${date}T${chosenTime}` }
      const details = { customerName: name.trim(), customerPhone: phone.trim() || undefined, note: note.trim() || undefined }
      if (!editing) return barberMeApi.bookManually({ ...start, ...details })
      return barberMeApi.updateAppointment(appointment.id, ownDetails ? { ...start, ...details } : start)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber', 'appointments'] })
      onDone(true)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (chosenService && chosenTime && (!ownDetails || name.trim())) save.mutate()
  }

  if (services.isSuccess && active.length === 0) {
    return <Notice>{t('barber.schedule.noServices')}</Notice>
  }

  const selectClass =
    'min-h-12 w-full rounded-xl border-2 border-surface-2 bg-surface-2 px-3 text-base text-ink [color-scheme:dark] focus:border-accent focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border-2 border-accent bg-surface p-4" noValidate>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-black italic uppercase">
          {editing ? t('barber.schedule.editTitle') : walkIn ? t('barber.schedule.walkInTitle') : t('barber.schedule.addTitle')}
        </h2>
        <p className="text-sm text-muted">
          {editing
            ? appointment.manual
              ? t('barber.schedule.editHint')
              : t('barber.schedule.editAppHint', { name: appointment.customerName })
            : t('barber.schedule.addHint')}
        </p>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
        {t('barber.schedule.service')}
        <select value={chosenService ?? ''} onChange={(e) => setServiceId(Number(e.target.value))} className={selectClass}>
          {active.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {t('common.minutes', { count: s.durationMinutes })} · {formatPrice(s.price)}
            </option>
          ))}
        </select>
      </label>

      {extras.length > 0 && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium text-muted">{t('barber.schedule.extras')}</legend>
          {extras.map((s) => (
            <label key={s.id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-surface-2 px-3">
              <input
                type="checkbox"
                checked={extraIds.includes(s.id)}
                onChange={(e) => setExtraIds(e.target.checked ? [...extraIds, s.id] : extraIds.filter((id) => id !== s.id))}
                className="size-5 accent-accent"
              />
              <span className="flex-1">{s.name}</span>
              <span className="text-sm text-muted">
                +{t('common.minutes', { count: s.durationMinutes })} · {formatServicePrice(s.price, t)}
              </span>
            </label>
          ))}
        </fieldset>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
          {t('barber.schedule.date')}
          <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value)} className={selectClass} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
          {t('barber.schedule.time')}
          <select value={chosenTime} onChange={(e) => setTime(e.target.value)} disabled={options.length === 0} className={selectClass}>
            {options.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!anyTime && free.isSuccess && options.length === 0 && (
        <p className="-mt-2 text-sm text-muted">{t('barber.schedule.noFreeTimes')}</p>
      )}
      <label className="-mt-1 flex min-h-11 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={anyTime} onChange={(e) => setAnyTime(e.target.checked)} className="size-5 accent-accent" />
        <span className="flex flex-col">
          <span className="font-semibold text-ink">{t('barber.schedule.anyTime')}</span>
          <span className="text-muted">{t('barber.schedule.anyTimeHint')}</span>
        </span>
      </label>

      {ownDetails && (
        <>
          <TextField onSurface label={t('barber.schedule.customerName')} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
          <TextField onSurface label={t('barber.schedule.customerPhone')} type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <TextField onSurface label={t('barber.schedule.note')} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        </>
      )}

      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={(ownDetails && !name.trim()) || !chosenService || !chosenTime || save.isPending}>
          {editing ? t('barber.schedule.saveChanges') : t('barber.schedule.save')}
        </Button>
        <Button type="button" variant="tonal" onClick={() => onDone(false)}>
          {t('barber.schedule.close')}
        </Button>
      </div>
    </form>
  )
}

/** The next quarter hour from now in Athens (the barbers' time zone), within the selectable range. */
function nextQuarter(): string {
  return quarter((total) => Math.ceil(total / 15) * 15)
}

/** The quarter hour that has just begun, e.g. 10:00 at 10:07, for someone who just sat down. */
function currentQuarter(): string {
  return quarter((total) => Math.floor(total / 15) * 15)
}

function quarter(round: (minutes: number) => number): string {
  const [hours, mins] = formatTime(new Date().toISOString()).split(':').map(Number)
  const minutes = Math.min(23 * 60 + 45, Math.max(6 * 60, round(hours * 60 + mins)))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
