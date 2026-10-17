import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import { Button } from '../../components/Button'
import { Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'
import { bookableDays, formatPrice, formatServicePrice, formatTime } from '../../lib/format'

// Quarter-hour choices; a barber may squeeze someone in outside their usual hours.
const TIMES = Array.from({ length: (24 - 6) * 4 }, (_, i) => {
  const minutes = 6 * 60 + i * 15
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
})

/** For customers who call or walk in: books the time so online customers cannot take it. */
export function NewAppointmentForm({ onDone }: { onDone: (saved: boolean) => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const services = useQuery({ queryKey: ['barber', 'services'], queryFn: barberMeApi.services })
  const active = services.data?.filter((s) => s.active && s.kind === 'MAIN') ?? []
  const extras = services.data?.filter((s) => s.active && s.kind === 'EXTRA') ?? []

  const [today] = useState(() => bookableDays(1)[0].iso)
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [extraIds, setExtraIds] = useState<number[]>([])
  const [date, setDate] = useState(today)
  const [time, setTime] = useState(() => nextQuarter())
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [note, setNote] = useState('')

  const chosenService = serviceId ?? active[0]?.id ?? null

  const save = useMutation({
    mutationFn: () =>
      barberMeApi.bookManually({
        serviceId: chosenService!,
        extraIds,
        startTime: `${date}T${time}`,
        customerName: name.trim(),
        customerPhone: phone.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber', 'appointments'] })
      onDone(true)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (chosenService && name.trim()) save.mutate()
  }

  if (services.isSuccess && active.length === 0) {
    return <Notice>{t('barber.schedule.noServices')}</Notice>
  }

  const selectClass =
    'min-h-12 w-full rounded-xl border-2 border-surface-2 bg-surface-2 px-3 text-base text-ink [color-scheme:dark] focus:border-accent focus:outline-none'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border-2 border-accent bg-surface p-4" noValidate>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold uppercase">{t('barber.schedule.addTitle')}</h2>
        <p className="text-sm text-muted">{t('barber.schedule.addHint')}</p>
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
          <select value={time} onChange={(e) => setTime(e.target.value)} className={selectClass}>
            {TIMES.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TextField onSurface label={t('barber.schedule.customerName')} required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
      <TextField onSurface label={t('barber.schedule.customerPhone')} type="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
      <TextField onSurface label={t('barber.schedule.note')} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />

      {save.isError && (
        <Notice tone="error">
          {errorMessage(save.error, t)}
        </Notice>
      )}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!name.trim() || !chosenService || save.isPending}>
          {t('barber.schedule.save')}
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
  const [hours, mins] = formatTime(new Date().toISOString()).split(':').map(Number)
  const minutes = Math.min(23 * 60 + 45, Math.max(6 * 60, Math.ceil((hours * 60 + mins) / 15) * 15))
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}
