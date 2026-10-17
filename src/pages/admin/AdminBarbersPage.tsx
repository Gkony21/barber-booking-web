import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { adminApi } from '../../api/endpoints'
import type { AdminBarber, BarberStatus } from '../../api/types'
import { Avatar } from '../../components/Avatar'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { errorMessage } from '../../lib/errors'
import { athensDate, formatShortDate } from '../../lib/format'

const TABS: BarberStatus[] = ['PENDING', 'APPROVED', 'SUSPENDED']

export function AdminBarbersPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<BarberStatus>('PENDING')
  const [approvedName, setApprovedName] = useState<string | null>(null)
  const barbers = useQuery({ queryKey: ['admin', 'barbers', tab], queryFn: () => adminApi.barbers(tab) })
  const pendingCount = useQuery({ queryKey: ['admin', 'barbers', 'PENDING'], queryFn: () => adminApi.barbers('PENDING') }).data?.length

  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">{t('admin.title')}</h1>

      <div role="tablist" className="flex gap-1 rounded-2xl bg-surface p-1">
        {TABS.map((status) => (
          <button
            key={status}
            role="tab"
            aria-selected={tab === status}
            onClick={() => {
              setTab(status)
              setApprovedName(null)
            }}
            className={`min-h-11 flex-1 rounded-xl text-sm font-semibold ${tab === status ? 'bg-ink text-ground' : 'text-muted hover:text-ink'}`}
          >
            {t(`admin.tabs.${status}`)}
            {status === 'PENDING' && pendingCount ? ` · ${pendingCount}` : ''}
          </button>
        ))}
      </div>

      {approvedName && <Notice tone="success">{t('admin.approved', { name: approvedName })}</Notice>}

      <div role="tabpanel" className="flex flex-col gap-3">
        {barbers.isPending && <Loading />}
        {barbers.isError && <ErrorState error={barbers.error} onRetry={() => barbers.refetch()} />}
        {barbers.data?.length === 0 && <p className="py-10 text-center text-muted">{t(`admin.empty.${tab}`)}</p>}
        {barbers.data?.map((barber) => (
          <BarberCard key={barber.id} barber={barber} onApproved={setApprovedName} />
        ))}
      </div>
    </div>
  )
}

function BarberCard({ barber, onApproved }: { barber: AdminBarber; onApproved: (name: string) => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const change = useMutation({
    mutationFn: (status: BarberStatus) => adminApi.setStatus(barber.id, status),
    onSuccess: (updated) => {
      if (updated.status === 'APPROVED' && barber.status === 'PENDING') onApproved(updated.name)
      void queryClient.invalidateQueries({ queryKey: ['admin', 'barbers'] })
    },
  })

  const place = [barber.shopName, barber.address, barber.city].filter(Boolean).join(' · ')

  return (
    <article className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-3">
        <Avatar name={barber.name} url={barber.avatarUrl} size={48} />
        <h2 className="font-display text-2xl leading-tight font-extrabold uppercase">{barber.name}</h2>
      </div>
      <div className="flex flex-col gap-1">
        {barber.specialty && <p className="text-sm text-accent">{barber.specialty}</p>}
        {place && <p className="text-sm text-muted">{place}</p>}
        <p className="text-sm text-muted">{t('admin.signedUp', { date: formatShortDate(athensDate(barber.createdAt)) })}</p>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <a href={`mailto:${barber.email}`} className="flex min-h-11 items-center break-all text-ink underline decoration-line underline-offset-4">
          {barber.email}
        </a>
        {barber.phoneNumber && (
          <a href={`tel:${barber.phoneNumber}`} className="flex min-h-11 items-center text-ink underline decoration-line underline-offset-4">
            {barber.phoneNumber}
          </a>
        )}
      </div>

      {change.isError && <Notice tone="error">{errorMessage(change.error, t)}</Notice>}

      <div className="flex gap-2">
        {barber.status !== 'APPROVED' && (
          <Button className="flex-1" disabled={change.isPending} onClick={() => change.mutate('APPROVED')}>
            {barber.status === 'SUSPENDED' ? t('admin.restore') : t('admin.approve')}
          </Button>
        )}
        {barber.status !== 'SUSPENDED' && (
          <Button
            variant="tonal"
            className="flex-1"
            disabled={change.isPending}
            onClick={() => window.confirm(t('admin.confirmSuspend', { name: barber.name })) && change.mutate('SUSPENDED')}
          >
            {t('admin.suspend')}
          </Button>
        )}
      </div>
    </article>
  )
}
