import { useDeferredValue, useState } from 'react'
import { Link, useParams } from 'react-router'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi } from '../../api/endpoints'
import type { Appointment, Client } from '../../api/types'
import { BackLink } from '../../components/AppShell'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { athensDate, formatAppointmentTime, formatDayHeading, formatPrice, formatTime, servicesOf } from '../../lib/format'
import { GREETING, reminderText } from '../../lib/messages'
import { AppointmentForm } from './AppointmentForm'
import { MessagePanel } from './MessagePanel'
import { useMyBarber } from './useMyBarber'

/** Everyone who booked with the barber, by app or by phone, most recent first; searchable by name or number. */
export function ClientsPage() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const search = useDeferredValue(query.trim())
  const clients = useQuery({
    queryKey: ['barber', 'clients', 'list', search],
    queryFn: () => barberMeApi.clients(search),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="flex flex-col gap-5 pt-4">
      <h1 className="font-display text-[52px] leading-[0.88] font-black italic uppercase">{t('barber.clients.title')}</h1>
      <label htmlFor="client-search" className="sr-only">
        {t('barber.clients.search')}
      </label>
      <input
        id="client-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('barber.clients.search')}
        className="min-h-12 rounded-xl border-2 border-surface bg-surface px-4 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />

      {clients.isPending && <Loading />}
      {clients.isError && <ErrorState error={clients.error} onRetry={() => clients.refetch()} />}
      {clients.data?.length === 0 && <p className="py-8 text-center text-muted">{search ? t('barber.clients.noMatch') : t('barber.clients.empty')}</p>}

      <ul className="flex flex-col gap-2">
        {clients.data?.map((client) => (
          <li key={client.key}>
            <ClientRow client={client} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function ClientRow({ client }: { client: Client }) {
  const { t } = useTranslation()
  return (
    <Link
      to={`/barber/clients/${encodeURIComponent(client.key)}`}
      className="flex min-h-16 items-center gap-3 rounded-md bg-surface px-4 py-3 hover:bg-surface-2"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate font-semibold">{client.name}</span>
          {client.noShows > 0 && (
            <span className="shrink-0 rounded-md bg-danger/20 px-1.5 py-0.5 text-[11px] font-semibold text-danger">
              {t('barber.clients.noShows', { count: client.noShows })}
            </span>
          )}
        </span>
        <span className="truncate text-sm text-muted">
          {[client.phone, t('barber.clients.visits', { count: client.visits })].filter(Boolean).join(' · ')}
        </span>
        {client.note && <span className="truncate text-sm text-ink/75 italic">{client.note}</span>}
      </span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-faint">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </Link>
  )
}

/** One customer: how often they come, the barber's own note, booking the same again, and every visit. */
export function ClientPage() {
  const { t } = useTranslation()
  const key = useParams().key!
  const card = useQuery({ queryKey: ['barber', 'clients', 'card', key], queryFn: () => barberMeApi.client(key) })
  const [booking, setBooking] = useState(false)
  const [justBooked, setJustBooked] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const slug = useMyBarber().data?.slug
  const bookingLink = slug ? `${window.location.origin}/${slug}` : null

  if (card.isPending) return <Loading />
  if (card.isError) return <ErrorState error={card.error} onRetry={() => card.refetch()} />
  const { client, history } = card.data

  return (
    <div className="flex flex-col gap-6 pt-2">
      <BackLink to="/barber/clients" label={t('barber.clients.back')} />
      <div className="flex items-end gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {client.appCustomer && <span className="font-display text-sm font-black tracking-wide text-accent uppercase">{t('barber.clients.fromApp')}</span>}
          <h1 className="font-display text-[44px] leading-[0.88] font-black break-words italic uppercase">{client.name}</h1>
          {client.phone && <span className="text-muted">{client.phone}</span>}
        </div>
        {client.phone && (
          <a
            href={`tel:${client.phone}`}
            aria-label={`${t('barber.clients.call')} ${client.name}`}
            className="flex size-12 shrink-0 items-center justify-center rounded-md bg-surface text-ink hover:bg-surface-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
            </svg>
          </a>
        )}
      </div>

      {client.phone && !messaging && (
        <Button variant="outline" onClick={() => setMessaging(true)}>
          {t('barber.messages.open')}
        </Button>
      )}
      {client.phone && messaging && (
        <MessagePanel
          phone={client.phone}
          text={client.nextVisit ? reminderText(client.nextVisit) : GREETING}
          bookingLink={client.appCustomer ? null : bookingLink}
          onClose={() => setMessaging(false)}
        />
      )}

      <section aria-label={t('barber.clients.title')} className="grid grid-cols-3 gap-2">
        <Stat value={String(client.visits)} label={t('barber.clients.statVisits')} />
        <Stat value={String(client.noShows)} label={t('barber.clients.statNoShows')} danger={client.noShows > 0} />
        <Stat value={client.lastVisit ? shortDate(client.lastVisit) : t('barber.clients.none')} label={t('barber.clients.statLast')} />
      </section>
      {client.nextVisit && <Notice>{t('barber.clients.next', { when: formatAppointmentTime(client.nextVisit) })}</Notice>}

      <NoteEditor client={client} />

      {booking ? (
        <AppointmentForm
          prefill={client}
          onDone={(saved) => {
            setBooking(false)
            setJustBooked(saved)
            if (saved) void card.refetch()
          }}
        />
      ) : (
        <Button
          className="w-full"
          onClick={() => {
            setBooking(true)
            setJustBooked(false)
          }}
        >
          {t('barber.clients.again')}
        </Button>
      )}
      {justBooked && <Notice tone="success">{t('barber.schedule.saved')}</Notice>}

      <section className="flex flex-col gap-2">
        <h2 className="font-display text-xl font-black italic uppercase">{t('barber.clients.history')}</h2>
        {history.map((appointment) => (
          <HistoryRow key={appointment.id} appointment={appointment} />
        ))}
      </section>
    </div>
  )
}

function Stat({ value, label, danger = false }: { value: string; label: string; danger?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-md bg-surface px-3 py-2.5">
      <span className={`truncate font-display text-[30px] leading-[0.9] font-black italic ${danger ? 'text-danger' : 'text-ink'}`}>{value}</span>
      <span className="truncate font-display text-xs font-black tracking-wide text-muted uppercase">{label}</span>
    </div>
  )
}

// "12/10" for the last-visit tile; the full date is in the history below.
function shortDate(iso: string): string {
  const [, month, day] = athensDate(iso).split('-')
  return `${Number(day)}/${Number(month)}`
}

function NoteEditor({ client }: { client: Client }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [note, setNote] = useState(client.note ?? '')
  const save = useMutation({
    mutationFn: () => barberMeApi.saveClientNote(client.key, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barber', 'clients'] }),
  })
  const changed = note.trim() !== (client.note ?? '')

  return (
    <section className="flex flex-col gap-2">
      <label htmlFor="client-note" className="text-sm font-medium text-muted">
        {t('barber.clients.note')}
      </label>
      <textarea
        id="client-note"
        rows={3}
        maxLength={1000}
        value={note}
        onChange={(e) => {
          setNote(e.target.value)
          save.reset()
        }}
        placeholder={t('barber.clients.notePlaceholder')}
        className="rounded-xl border-2 border-surface bg-surface px-4 py-3 text-ink placeholder:text-faint focus:border-accent focus:outline-none"
      />
      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      {save.isSuccess && <Notice tone="success">{t('barber.clients.noteSaved')}</Notice>}
      {changed && (
        <Button variant="secondary" className="self-start" disabled={save.isPending} onClick={() => save.mutate()}>
          {t('barber.clients.saveNote')}
        </Button>
      )}
    </section>
  )
}

function HistoryRow({ appointment }: { appointment: Appointment }) {
  const { t } = useTranslation()
  const gone = appointment.status === 'CANCELLED' || appointment.status === 'REJECTED' || appointment.status === 'EXPIRED'
  return (
    <article className={`flex items-center gap-3 rounded-md bg-surface px-4 py-3 ${gone ? 'opacity-60' : ''}`}>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold first-letter:uppercase">{formatDayHeading(athensDate(appointment.startTime))}</span>
        <span className="truncate text-sm text-muted">
          {servicesOf(appointment)} · {formatPrice(appointment.price)}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-muted">
        {appointment.status === 'CONFIRMED' ? formatTime(appointment.startTime) : t(`appointments.status.${appointment.status}`)}
      </span>
    </article>
  )
}
