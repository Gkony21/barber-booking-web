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

      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      {saved && <Notice tone="success">{t('barber.setupDone')}</Notice>}

      <Button type="submit" disabled={save.isPending}>
        {barber ? t('barber.profile.save') : t('barber.profile.create')}
      </Button>
    </form>
  )
}
