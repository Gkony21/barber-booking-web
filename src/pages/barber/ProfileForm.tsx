import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { Barber, BarberProfileInput } from '../../api/types'
import { Button } from '../../components/Button'
import { Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'

/** Creates the profile when `barber` is null, otherwise edits it. */
export function ProfileForm({ barber }: { barber: Barber | null }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    bio: barber?.bio ?? '',
    specialty: barber?.specialty ?? '',
    experienceYears: barber?.experienceYears?.toString() ?? '',
    address: barber?.address ?? '',
    city: barber?.city ?? '',
    autoConfirmBookings: barber?.autoConfirmBookings ?? true,
    slotStepMinutes: barber?.slotStepMinutes ?? 30,
    bookingWindowDays: barber?.bookingWindowDays ?? 14,
    minNoticeMinutes: barber?.minNoticeMinutes ?? 60,
    bufferMinutes: barber?.bufferMinutes ?? 0,
  })
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => {
      const body: BarberProfileInput = {
        bio: form.bio.trim() || null,
        specialty: form.specialty.trim() || null,
        experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        latitude: null,
        longitude: null,
        autoConfirmBookings: form.autoConfirmBookings,
        slotStepMinutes: form.slotStepMinutes,
        bookingWindowDays: form.bookingWindowDays,
        minNoticeMinutes: form.minNoticeMinutes,
        bufferMinutes: form.bufferMinutes,
      }
      return barber ? barberMeApi.updateProfile(body) : barberMeApi.createProfile(body)
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['barber', 'me'], updated)
      setSaved(true)
    },
  })

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setSaved(false)
    setForm({ ...form, [field]: e.target.value })
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-muted">
          {t('barber.profile.bio')}
        </label>
        <textarea
          id="bio"
          rows={3}
          maxLength={1000}
          value={form.bio}
          onChange={set('bio')}
          placeholder={t('barber.profile.bioPlaceholder')}
          className="rounded-xl border-2 border-surface bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
      </div>
      <TextField label={t('barber.profile.specialty')} maxLength={100} value={form.specialty} onChange={set('specialty')} />
      <TextField
        label={t('barber.profile.experience')}
        type="number"
        inputMode="numeric"
        min={0}
        max={80}
        value={form.experienceYears}
        onChange={set('experienceYears')}
      />
      <TextField label={t('barber.profile.address')} hint={t('barber.profile.addressHint')} maxLength={255} value={form.address} onChange={set('address')} />
      <TextField label={t('barber.profile.city')} maxLength={100} value={form.city} onChange={set('city')} />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-4">
        <input
          type="checkbox"
          checked={form.autoConfirmBookings}
          onChange={(e) => {
            setSaved(false)
            setForm({ ...form, autoConfirmBookings: e.target.checked })
          }}
          className="mt-0.5 size-5 shrink-0 accent-accent"
        />
        <span className="flex flex-col gap-0.5">
          <span className="font-semibold">{t('barber.profile.autoConfirm')}</span>
          <span className="text-sm text-muted">
            {form.autoConfirmBookings ? t('barber.profile.autoConfirmOn') : t('barber.profile.autoConfirmOff')}
          </span>
        </span>
      </label>

      <ChoiceGroup
        legend={t('barber.profile.slotStep')}
        hint={t('barber.profile.slotStepHint')}
        name="slotStep"
        options={[15, 30] as const}
        label={(minutes) => t('barber.profile.minutes', { count: minutes })}
        value={form.slotStepMinutes}
        onChange={(minutes) => {
          setSaved(false)
          setForm({ ...form, slotStepMinutes: minutes })
        }}
      />

      <ChoiceGroup
        legend={t('barber.profile.bookingWindow')}
        hint={t('barber.profile.bookingWindowHint')}
        name="bookingWindow"
        options={[14, 30, 60] as const}
        label={(days) => t(`barber.profile.bookingWindow${days}`)}
        value={form.bookingWindowDays}
        onChange={(days) => {
          setSaved(false)
          setForm({ ...form, bookingWindowDays: days })
        }}
      />

      <ChoiceGroup
        legend={t('barber.profile.minNotice')}
        hint={t('barber.profile.minNoticeHint')}
        name="minNotice"
        options={[30, 60, 120] as const}
        label={(minutes) => t(`barber.profile.minNotice${minutes}`)}
        value={form.minNoticeMinutes}
        onChange={(minutes) => {
          setSaved(false)
          setForm({ ...form, minNoticeMinutes: minutes })
        }}
      />

      <ChoiceGroup
        legend={t('barber.profile.buffer')}
        hint={t('barber.profile.bufferHint')}
        name="buffer"
        options={[0, 5, 10, 15] as const}
        label={(minutes) => (minutes === 0 ? t('barber.profile.bufferNone') : t('barber.profile.bufferMinutes', { count: minutes }))}
        value={form.bufferMinutes}
        onChange={(minutes) => {
          setSaved(false)
          setForm({ ...form, bufferMinutes: minutes })
        }}
      />

      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      {saved && <Notice tone="success">{t('barber.setupDone')}</Notice>}

      <Button type="submit" disabled={save.isPending}>
        {barber ? t('barber.profile.save') : t('barber.profile.create')}
      </Button>
    </form>
  )
}

/** A few mutually exclusive choices shown side by side, like a segmented control. */
function ChoiceGroup<T extends number>({
  legend,
  hint,
  name,
  options,
  label,
  value,
  onChange,
}: {
  legend: string
  hint: string
  name: string
  options: readonly T[]
  label: (option: T) => string
  value: T
  onChange: (option: T) => void
}) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-xl bg-surface p-4">
      <legend className="contents font-semibold">{legend}</legend>
      <div role="radiogroup" className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {options.map((option) => (
          <label
            key={option}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ${
              value === option ? 'bg-accent text-ground' : 'text-muted'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
              className="sr-only"
            />
            {label(option)}
          </label>
        ))}
      </div>
      <span className="text-sm text-muted">{hint}</span>
    </fieldset>
  )
}
