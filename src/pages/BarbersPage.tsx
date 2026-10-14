import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../api/client'
import { barbersApi } from '../api/endpoints'
import type { Barber } from '../api/types'
import { Avatar } from '../components/Avatar'
import { FadeLines } from '../components/Logo'
import { ErrorState, Loading, Notice } from '../components/States'
import { formatPrice, nextFreeKind } from '../lib/format'

export function BarbersPage() {
  const { t } = useTranslation()
  const [cityInput, setCityInput] = useState('')
  const [city, setCity] = useState('')
  const [onlyToday, setOnlyToday] = useState(false)
  // e.g. "account deleted", passed along when navigating here
  const notice = (useLocation().state as { notice?: string } | null)?.notice

  const barbers = useQuery({
    queryKey: ['barbers', city, onlyToday],
    queryFn: () => barbersApi.list({ city: city || undefined, availableToday: onlyToday }),
  })

  function onSearch(event: FormEvent) {
    event.preventDefault()
    setCity(cityInput.trim())
  }

  return (
    <div className="flex flex-col gap-5">
      {notice && <Notice tone="success">{notice}</Notice>}
      <h1 className="pt-4 font-display text-5xl leading-[0.95] font-extrabold uppercase">{t('barbers.title')}</h1>

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

      <div className="flex gap-2" role="group" aria-label={t('barbers.title')}>
        <FilterChip selected={!onlyToday} onClick={() => setOnlyToday(false)}>
          {t('barbers.filterAll')}
        </FilterChip>
        <FilterChip selected={onlyToday} onClick={() => setOnlyToday(true)}>
          {t('barbers.filterToday')}
        </FilterChip>
      </div>

      {barbers.isPending && <Loading />}
      {barbers.isError && <ErrorState error={barbers.error} onRetry={() => barbers.refetch()} />}
      {barbers.data?.length === 0 && (
        <p className="py-10 text-center text-muted">{onlyToday ? t('barbers.emptyToday') : t('barbers.empty')}</p>
      )}

      <ul className="flex flex-col gap-4">
        {barbers.data?.map((barber) => (
          <li key={barber.id}>
            <BarberCard barber={barber} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterChip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold whitespace-nowrap ${
        selected ? 'border-ink bg-ink text-ground' : 'border-line text-ink hover:border-muted'
      }`}
    >
      {children}
    </button>
  )
}

function BarberCard({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  const place = [barber.shopName, barber.address ?? barber.city].filter(Boolean).join(', ')
  const next = barber.nextAvailable ? nextFreeKind(barber.nextAvailable) : null
  const nextLabel =
    next &&
    (next.kind === 'today'
      ? t('barbers.freeToday', { time: next.time })
      : next.kind === 'tomorrow'
        ? t('barbers.freeTomorrow', { time: next.time })
        : t('barbers.freeLater', { day: next.day, time: next.time }))

  return (
    <Link to={barber.slug ? `/${barber.slug}` : `/barbers/${barber.id}`} className="block overflow-hidden rounded-[22px] bg-surface transition-colors hover:bg-surface-2">
      <div className="relative h-48 bg-surface-2">
        {barber.coverUrl ? (
          <img src={mediaUrl(barber.coverUrl)} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-surface-2 to-surface">
            <FadeLines className="w-24 opacity-30" />
          </div>
        )}
        {nextLabel && (
          <span
            className={`absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-bold ${
              next!.kind === 'today' ? 'bg-accent text-ground' : 'bg-ground/75 text-ink backdrop-blur'
            }`}
          >
            <span className={`size-[7px] rounded-full ${next!.kind === 'today' ? 'bg-ground' : 'bg-muted'}`} aria-hidden="true" />
            {nextLabel}
          </span>
        )}
        {barber.photoCount > 0 && (
          <span className="absolute top-3 right-3 rounded-full bg-ground/70 px-2.5 py-1.5 text-xs font-semibold backdrop-blur">
            {t('barbers.photos', { count: barber.photoCount })}
          </span>
        )}
      </div>
      {/* Only the photo overlaps the cover; the name sits below it so it stays readable on any image. */}
      <div className="relative flex items-center gap-3 py-3.5 pr-4 pl-[92px]">
        <span className="absolute -top-8 left-4 rounded-2xl border-[3px] border-surface">
          <Avatar name={barber.name} url={barber.avatarUrl} size={60} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-display text-[26px] leading-none font-extrabold uppercase">{barber.name}</span>
          {place && <span className="truncate text-[13px] text-muted">{place}</span>}
        </span>
        {barber.fromPrice !== null && barber.fromPrice > 0 && (
          <span className="text-[13px] whitespace-nowrap text-muted">
            {t('barbers.from')} <strong className="font-display text-xl text-ink">{formatPrice(barber.fromPrice)}</strong>
          </span>
        )}
      </div>
    </Link>
  )
}
