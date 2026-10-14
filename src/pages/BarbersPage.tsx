import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barbersApi } from '../api/endpoints'
import type { Barber } from '../api/types'
import { Avatar } from '../components/Avatar'
import { ErrorState, Loading } from '../components/States'

export function BarbersPage() {
  const { t } = useTranslation()
  const [cityInput, setCityInput] = useState('')
  const [city, setCity] = useState('')

  const barbers = useQuery({ queryKey: ['barbers', city], queryFn: () => barbersApi.list(city || undefined) })

  function onSearch(event: FormEvent) {
    event.preventDefault()
    setCity(cityInput.trim())
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 pt-4">
        <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('barbers.title')}</h1>
        <p className="text-muted">{t('app.tagline')}</p>
      </div>

      <form onSubmit={onSearch} role="search" className="flex gap-2">
        <label htmlFor="city" className="sr-only">
          {t('barbers.cityPlaceholder')}
        </label>
        <input
          id="city"
          value={cityInput}
          onChange={(e) => setCityInput(e.target.value)}
          placeholder={t('barbers.cityPlaceholder')}
          className="min-h-12 flex-1 rounded-xl border-2 border-surface bg-surface px-4 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
        />
        <button type="submit" aria-label="Αναζήτηση" className="flex size-12 items-center justify-center rounded-xl bg-surface-2 text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </form>

      {barbers.isPending && <Loading />}
      {barbers.isError && <ErrorState error={barbers.error} onRetry={() => barbers.refetch()} />}
      {barbers.data?.length === 0 && <p className="py-12 text-center text-muted">{t('barbers.empty')}</p>}

      <ul className="flex flex-col gap-3">
        {barbers.data?.map((barber) => (
          <li key={barber.id}>
            <BarberCard barber={barber} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function BarberCard({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  const place = [barber.shopName ?? t('barbers.independent'), barber.city].filter(Boolean).join(' · ')
  return (
    <Link
      to={`/barbers/${barber.id}`}
      className="flex min-h-20 items-center gap-4 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface-2"
    >
      <Avatar name={barber.name} url={barber.avatarUrl} size={56} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-display text-2xl leading-tight font-extrabold uppercase">{barber.name}</span>
        <span className="truncate text-sm text-muted">{place}</span>
      </span>
      <span className="rounded-lg bg-accent px-3 py-2 text-sm font-bold text-ground">{t('barbers.book')}</span>
    </Link>
  )
}

