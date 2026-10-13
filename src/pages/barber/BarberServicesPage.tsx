import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { ServiceInput, ServiceOffering } from '../../api/types'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'
import { formatPrice } from '../../lib/format'

const DURATIONS = [10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120]

export function BarberServicesPage() {
  const { t } = useTranslation()
  const services = useQuery({ queryKey: ['barber', 'services'], queryFn: barberMeApi.services })
  // null = no form open, 'new' = adding, a number = editing that service
  const [editing, setEditing] = useState<number | 'new' | null>(null)

  if (services.isPending) return <Loading />
  if (services.isError) return <ErrorState error={services.error} onRetry={() => services.refetch()} />

  const sorted = [...services.data].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'el'))

  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('barber.services.title')}</h1>

      {editing === 'new' ? (
        <ServiceForm onDone={() => setEditing(null)} />
      ) : (
        <Button onClick={() => setEditing('new')}>{t('barber.services.add')}</Button>
      )}

      {sorted.length === 0 && editing !== 'new' && <p className="py-6 text-center text-muted">{t('barber.services.empty')}</p>}

      <ul className="flex flex-col gap-3">
        {sorted.map((service) => (
          <li key={service.id}>
            {editing === service.id ? (
              <ServiceForm service={service} onDone={() => setEditing(null)} />
            ) : (
              <ServiceRow service={service} onEdit={() => setEditing(service.id)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ServiceRow({ service, onEdit }: { service: ServiceOffering; onEdit: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['barber', 'services'] })

  const deactivate = useMutation({ mutationFn: () => barberMeApi.deactivateService(service.id), onSuccess: refresh })
  // Saving a service makes it visible again, so "restore" re-sends its current details.
  const reactivate = useMutation({
    mutationFn: () =>
      barberMeApi.updateService(service.id, {
        name: service.name,
        description: service.description,
        durationMinutes: service.durationMinutes,
        price: service.price,
      }),
    onSuccess: refresh,
  })

  return (
    <article className={`flex flex-col gap-3 rounded-2xl bg-surface p-4 ${service.active ? '' : 'opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="font-semibold">
            {service.name}
            {!service.active && <span className="ml-2 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">{t('barber.services.hidden')}</span>}
          </span>
          <span className="text-sm text-muted">{t('common.minutes', { count: service.durationMinutes })}</span>
          {service.description && <span className="text-sm text-muted">{service.description}</span>}
        </div>
        <span className="font-display text-2xl font-extrabold">{formatPrice(service.price)}</span>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="min-h-11 px-3 text-sm" onClick={onEdit}>
          {t('barber.services.edit')}
        </Button>
        {service.active ? (
          <Button
            variant="ghost"
            className="min-h-11 px-3 text-sm"
            disabled={deactivate.isPending}
            onClick={() => window.confirm(t('barber.services.confirmDeactivate')) && deactivate.mutate()}
          >
            {t('barber.services.deactivate')}
          </Button>
        ) : (
          <Button variant="secondary" className="min-h-11 px-3 text-sm" disabled={reactivate.isPending} onClick={() => reactivate.mutate()}>
            {t('barber.services.reactivate')}
          </Button>
        )}
      </div>
    </article>
  )
}

function ServiceForm({ service, onDone }: { service?: ServiceOffering; onDone: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState(service?.name ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [duration, setDuration] = useState(service?.durationMinutes ?? 30)
  const [price, setPrice] = useState(service ? String(service.price) : '')

  const priceValue = Number(price.replace(',', '.'))
  const valid = name.trim().length > 0 && price !== '' && Number.isFinite(priceValue) && priceValue >= 0

  const save = useMutation({
    mutationFn: () => {
      const body: ServiceInput = { name: name.trim(), description: description.trim() || null, durationMinutes: duration, price: priceValue }
      return service ? barberMeApi.updateService(service.id, body) : barberMeApi.createService(body)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['barber', 'services'] })
      onDone()
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (valid) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border-2 border-accent bg-surface p-4" noValidate>
      <TextField onSurface label={t('barber.services.name')} placeholder={t('barber.services.namePlaceholder')} maxLength={100} required value={name} onChange={(e) => setName(e.target.value)} />
      <TextField onSurface label={t('barber.services.description')} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="duration" className="text-sm font-medium text-muted">
            {t('barber.services.duration')}
          </label>
          <select
            id="duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="min-h-12 rounded-xl border-2 border-surface-2 bg-surface-2 px-3 text-ink focus:border-accent focus:outline-none"
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {t('common.minutes', { count: minutes })}
              </option>
            ))}
          </select>
        </div>
        <TextField onSurface label={t('barber.services.price')} inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} />
      </div>

      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!valid || save.isPending}>
          {t('barber.services.save')}
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          {t('barber.services.cancelEdit')}
        </Button>
      </div>
    </form>
  )
}
