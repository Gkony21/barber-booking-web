import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { ServiceInput, ServiceKind, ServiceOffering } from '../../api/types'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'
import { formatServicePrice } from '../../lib/format'

const DURATIONS = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 120]

export function BarberServicesPage() {
  const { t } = useTranslation()
  const services = useQuery({ queryKey: ['barber', 'services'], queryFn: barberMeApi.services })
  // null = no form open, a kind = adding one of that kind, a number = editing that service
  const [editing, setEditing] = useState<number | ServiceKind | null>(null)

  if (services.isPending) return <Loading />
  if (services.isError) return <ErrorState error={services.error} onRetry={() => services.refetch()} />

  const sorted = [...services.data].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, 'el'))

  return (
    <div className="flex flex-col gap-8 pt-4">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('barber.services.title')}</h1>
      {(['MAIN', 'EXTRA'] as const).map((kind) => (
        <ServiceGroup
          key={kind}
          kind={kind}
          services={sorted.filter((s) => s.kind === kind)}
          editing={editing}
          setEditing={setEditing}
        />
      ))}
    </div>
  )
}

/** Main services (the customer picks one) or extras (added on top), with examples of each. */
function ServiceGroup({
  kind,
  services,
  editing,
  setEditing,
}: {
  kind: ServiceKind
  services: ServiceOffering[]
  editing: number | ServiceKind | null
  setEditing: (value: number | ServiceKind | null) => void
}) {
  const { t } = useTranslation()
  const main = kind === 'MAIN'

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl font-extrabold uppercase">{main ? t('barber.services.mainTitle') : t('barber.services.extrasTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted">{main ? t('barber.services.mainHint') : t('barber.services.extrasHint')}</p>
      </div>

      {services.length === 0 && editing !== kind && (
        <p className="py-2 text-sm text-muted">{main ? t('barber.services.emptyMain') : t('barber.services.emptyExtras')}</p>
      )}

      <ul className="flex flex-col gap-3">
        {services.map((service) => (
          <li key={service.id}>
            {editing === service.id ? (
              <ServiceForm kind={kind} service={service} onDone={() => setEditing(null)} />
            ) : (
              <ServiceRow service={service} onEdit={() => setEditing(service.id)} />
            )}
          </li>
        ))}
      </ul>

      {editing === kind ? (
        <ServiceForm kind={kind} onDone={() => setEditing(null)} />
      ) : (
        <Button variant={main ? 'primary' : 'secondary'} onClick={() => setEditing(kind)}>
          {main ? t('barber.services.addMain') : t('barber.services.addExtra')}
        </Button>
      )}
    </section>
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
        kind: service.kind,
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
        <span className="font-display text-2xl font-extrabold">{formatServicePrice(service.price, t)}</span>
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
          <Button variant="tonal" className="min-h-11 px-3 text-sm" disabled={reactivate.isPending} onClick={() => reactivate.mutate()}>
            {t('barber.services.reactivate')}
          </Button>
        )}
      </div>
    </article>
  )
}

function ServiceForm({ kind: initialKind, service, onDone }: { kind: ServiceKind; service?: ServiceOffering; onDone: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState(service?.name ?? '')
  const [description, setDescription] = useState(service?.description ?? '')
  const [duration, setDuration] = useState(service?.durationMinutes ?? 30)
  const [price, setPrice] = useState(service ? String(service.price) : '')
  const [kind, setKind] = useState<ServiceKind>(initialKind)
  const main = kind === 'MAIN'

  const priceValue = Number(price.replace(',', '.'))
  const valid = name.trim().length > 0 && price !== '' && Number.isFinite(priceValue) && priceValue >= 0

  const save = useMutation({
    mutationFn: () => {
      const body: ServiceInput = { name: name.trim(), description: description.trim() || null, durationMinutes: duration, price: priceValue, kind }
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
      <TextField
        onSurface
        label={t('barber.services.name')}
        placeholder={main ? t('barber.services.namePlaceholderMain') : t('barber.services.namePlaceholderExtra')}
        maxLength={100}
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextField
        onSurface
        label={t('barber.services.description')}
        placeholder={main ? t('barber.services.descriptionPlaceholderMain') : undefined}
        maxLength={500}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
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

      {/* Lets a barber move a service between the two lists, e.g. turn a 0 € wash into an extra. */}
      <div role="radiogroup" aria-label={t('barber.services.kind')} className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {(['MAIN', 'EXTRA'] as const).map((option) => (
          <label
            key={option}
            className={`flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold ${
              kind === option ? 'bg-accent text-ground' : 'text-muted'
            }`}
          >
            <input type="radio" name="kind" checked={kind === option} onChange={() => setKind(option)} className="sr-only" />
            {option === 'MAIN' ? t('barber.services.kindMain') : t('barber.services.kindExtra')}
          </label>
        ))}
      </div>

      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}

      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!valid || save.isPending}>
          {t('barber.services.save')}
        </Button>
        <Button type="button" variant="tonal" onClick={onDone}>
          {t('barber.services.cancelEdit')}
        </Button>
      </div>
    </form>
  )
}
