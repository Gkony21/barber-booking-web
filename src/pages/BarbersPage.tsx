import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../api/client'
import { barbersApi } from '../api/endpoints'
import type { Barber } from '../api/types'
import { Avatar } from '../components/Avatar'
import { DefaultCover } from '../components/DefaultCover'
import { Sticker, Tape } from '../components/Street'
import { ErrorState, Loading, Notice } from '../components/States'
import { formatPrice, nextFreeKind, placeOf } from '../lib/format'

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
      <Tape words={t('barbers.tape', { returnObjects: true }) as string[]} />
      <h1 className="pt-2 font-display text-[56px] leading-[0.86] font-black italic uppercase">
        {t('barbers.title')}
        <span aria-hidden="true" className="text-accent">.</span>
      </h1>

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
        <button type="submit" aria-label="Αναζήτηση" className="flex size-12 items-center justify-center rounded-md bg-accent text-ground hover:bg-accent-strong">
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
      className={`min-h-10 rounded-md border-2 px-4 text-sm font-semibold whitespace-nowrap ${
        selected ? 'border-ink bg-ink text-ground' : 'border-line text-ink hover:border-muted'
      }`}
    >
      {children}
    </button>
  )
}

function BarberCard({ barber }: { barber: Barber }) {
  const { t } = useTranslation()
  const place = placeOf(barber)
  const next = barber.nextAvailable ? nextFreeKind(barber.nextAvailable) : null
  const nextLabel =
    next &&
    (next.kind === 'today'
      ? t('barbers.freeToday', { time: next.time })
      : next.kind === 'tomorrow'
        ? t('barbers.freeTomorrow', { time: next.time })
        : t('barbers.freeLater', { day: next.day, time: next.time }))

  return (
    <Link to={barber.slug ? `/${barber.slug}` : `/barbers/${barber.id}`} className="block overflow-hidden rounded-md bg-surface transition-colors hover:bg-surface-2">
      <div className="relative h-48 bg-surface-2">
        {barber.coverUrl ? (
          <img src={mediaUrl(barber.coverUrl)} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <DefaultCover />
        )}
        {/* Free today is the card's one sticker; later days get a quiet label. */}
        {nextLabel &&
          (next!.kind === 'today' ? (
            <Sticker className="absolute top-3 left-3">{nextLabel}</Sticker>
          ) : (
            <span className="absolute top-3 left-3 rounded-md bg-ground/80 px-2.5 py-1 text-[13px] font-semibold text-ink backdrop-blur">{nextLabel}</span>
          ))}
        {barber.photoCount > 0 && (
          <span className="absolute top-3 right-3 rounded-md bg-ground/75 px-2.5 py-1 text-xs font-medium backdrop-blur">
            {t('barbers.photos', { count: barber.photoCount })}
          </span>
        )}
      </div>
      {/* Only the photo overlaps the cover; the name sits below it so it stays readable on any image. */}
      <div className="relative flex items-center gap-3 py-3.5 pr-4 pl-[92px]">
        <span className="absolute -top-8 left-4 rounded-md border-[3px] border-surface">
          <Avatar name={barber.name} url={barber.avatarUrl} size={60} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate font-display text-[26px] leading-none font-black italic uppercase">{barber.name}</span>
          {place && <span className="truncate text-[13px] text-muted">{place}</span>}
        </span>
        {/* The barber's usual service, not the cheapest one (a kids' cut would mislead). */}
        {barber.featuredServiceName && barber.featuredPrice !== null && (
          <span className="flex max-w-32 shrink-0 flex-col items-end leading-tight">
            <span className="max-w-full truncate text-[13px] text-muted">{barber.featuredServiceName}</span>
            <strong className="font-display text-[22px] font-black text-ink">{formatPrice(barber.featuredPrice)}</strong>
          </span>
        )}
      </div>
    </Link>
  )
}
