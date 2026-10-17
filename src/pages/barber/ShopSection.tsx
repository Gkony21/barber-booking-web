import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { barberMeApi, barbersApi, shopsApi } from '../../api/endpoints'
import type { Barber, Shop, ShopInput, ShopInvitation } from '../../api/types'
import { Button } from '../../components/Button'
import { ErrorState, Loading, Notice } from '../../components/States'
import { TextField } from '../../components/TextField'
import { errorMessage } from '../../lib/errors'

/**
 * The barber's shop: open one, answer invitations, or (as its owner) invite barbers and
 * manage it. Barbers join a shop only by accepting the owner's invitation.
 */
export function ShopSection({ barber }: { barber: Barber }) {
  const { t } = useTranslation()

  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-2xl font-extrabold uppercase">{t('barber.shop.title')}</h2>
      {barber.status !== 'APPROVED' ? (
        <p className="text-sm text-muted">{t('barber.shop.notApproved')}</p>
      ) : barber.shopId ? (
        <MyShop barber={barber} shopId={barber.shopId} />
      ) : (
        <NoShop />
      )}
    </section>
  )
}

/** Refreshes everything a shop change can affect. */
function useRefresh() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['barber', 'me'] })
    void queryClient.invalidateQueries({ queryKey: ['shop'] })
    void queryClient.invalidateQueries({ queryKey: ['barber', 'invitations'] })
  }
}

function NoShop() {
  const { t } = useTranslation()
  const [creating, setCreating] = useState(false)
  const invitations = useQuery({ queryKey: ['barber', 'invitations'], queryFn: barberMeApi.invitations })

  return (
    <>
      <p className="text-sm text-muted">{t('barber.shop.independent')}</p>
      {invitations.isError && <ErrorState error={invitations.error} onRetry={() => invitations.refetch()} />}
      {invitations.data?.map((invitation) => (
        <InvitationCard key={invitation.id} invitation={invitation} />
      ))}
      {creating ? (
        <ShopForm shop={null} onDone={() => setCreating(false)} />
      ) : (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          {t('barber.shop.create')}
        </Button>
      )}
    </>
  )
}

function InvitationCard({ invitation }: { invitation: ShopInvitation }) {
  const { t } = useTranslation()
  const refresh = useRefresh()
  const answer = useMutation({
    mutationFn: async (accept: boolean) => {
      if (accept) await barberMeApi.acceptInvitation(invitation.id)
      else await barberMeApi.declineInvitation(invitation.id)
    },
    onSuccess: refresh,
  })

  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-accent bg-surface p-4">
      <span className="text-sm font-semibold text-accent">{t('barber.shop.invitation')}</span>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-2xl leading-tight font-extrabold uppercase">{invitation.shopName}</span>
        <span className="text-sm text-muted">
          {invitation.shopAddress}, {invitation.shopCity}
        </span>
        <span className="text-sm text-muted">
          {t('barber.shop.from')}: {invitation.ownerName}
        </span>
      </div>
      {answer.isError && <Notice tone="error">{errorMessage(answer.error, t)}</Notice>}
      <div className="flex gap-2">
        <Button className="flex-1" disabled={answer.isPending} onClick={() => answer.mutate(true)}>
          {t('barber.shop.accept')}
        </Button>
        <Button
          variant="tonal"
          className="flex-1"
          disabled={answer.isPending}
          onClick={() => {
            if (window.confirm(t('barber.shop.confirmDecline'))) answer.mutate(false)
          }}
        >
          {t('barber.shop.decline')}
        </Button>
      </div>
    </article>
  )
}

function MyShop({ barber, shopId }: { barber: Barber; shopId: number }) {
  const { t } = useTranslation()
  const refresh = useRefresh()
  const [editing, setEditing] = useState(false)
  const shop = useQuery({ queryKey: ['shop', shopId], queryFn: () => shopsApi.get(shopId) })
  const isOwner = shop.data?.ownerBarberId === barber.id

  const leave = useMutation({ mutationFn: () => shopsApi.removeBarber(shopId, barber.id), onSuccess: refresh })
  const close = useMutation({ mutationFn: () => shopsApi.remove(shopId), onSuccess: refresh })

  if (shop.isPending) return <Loading />
  if (shop.isError) return <ErrorState error={shop.error} onRetry={() => shop.refetch()} />

  return (
    <>
      {editing ? (
        <ShopForm shop={shop.data} onDone={() => setEditing(false)} />
      ) : (
        <article className="flex flex-col gap-1 rounded-2xl bg-surface p-4">
          <span className="font-display text-2xl leading-tight font-extrabold uppercase">{shop.data.name}</span>
          <span className="text-sm text-muted">
            {shop.data.address}, {shop.data.city}
          </span>
          {shop.data.phoneNumber && <span className="text-sm text-muted">{shop.data.phoneNumber}</span>}
          <span className="pt-1 text-sm text-muted">{t('barber.shop.shopHint')}</span>
          {isOwner && (
            <Button variant="ghost" className="-ml-5 self-start text-sm" onClick={() => setEditing(true)}>
              {t('barber.shop.edit')}
            </Button>
          )}
        </article>
      )}

      <Members shop={shop.data} me={barber} isOwner={isOwner} />
      {isOwner && <Invitations shopId={shopId} />}

      {(leave.isError || close.isError) && <Notice tone="error">{errorMessage(leave.error ?? close.error, t)}</Notice>}
      {isOwner ? (
        // A plain button: the ghost variant's text colour would override the danger colour.
        <button
          type="button"
          className="min-h-12 self-start px-1 text-sm font-semibold text-danger disabled:text-faint"
          disabled={close.isPending}
          onClick={() => {
            if (window.confirm(t('barber.shop.confirmClose'))) close.mutate()
          }}
        >
          {t('barber.shop.close')}
        </button>
      ) : (
        <Button
          variant="secondary"
          disabled={leave.isPending}
          onClick={() => {
            if (window.confirm(t('barber.shop.confirmLeave'))) leave.mutate()
          }}
        >
          {t('barber.shop.leave')}
        </Button>
      )}
    </>
  )
}

function Members({ shop, me, isOwner }: { shop: Shop; me: Barber; isOwner: boolean }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const members = useQuery({ queryKey: ['shop', shop.id, 'members'], queryFn: () => barbersApi.list({ shopId: shop.id }) })
  const remove = useMutation({
    mutationFn: (barberId: number) => shopsApi.removeBarber(shop.id, barberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop', shop.id] }),
  })

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-muted">{t('barber.shop.members')}</h3>
      {members.data?.map((member) => (
        <div key={member.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-surface px-4">
          <span className="flex-1 truncate font-semibold">
            {member.name}
            {member.id === me.id && <span className="font-normal text-muted"> {t('barber.shop.you')}</span>}
          </span>
          {member.id === shop.ownerBarberId && (
            <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] font-semibold text-muted">{t('barber.shop.ownerBadge')}</span>
          )}
          {isOwner && member.id !== shop.ownerBarberId && (
            <Button
              variant="ghost"
              className="min-h-11 px-2 text-sm"
              disabled={remove.isPending}
              onClick={() => {
                if (window.confirm(t('barber.shop.confirmRemove'))) remove.mutate(member.id)
              }}
            >
              {t('barber.shop.remove')}
            </Button>
          )}
        </div>
      ))}
      {remove.isError && <Notice tone="error">{errorMessage(remove.error, t)}</Notice>}
    </div>
  )
}

function Invitations({ shopId }: { shopId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const pending = useQuery({ queryKey: ['shop', shopId, 'invitations'], queryFn: () => shopsApi.invitations(shopId) })
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['shop', shopId, 'invitations'] })

  const invite = useMutation({
    mutationFn: () => shopsApi.invite(shopId, email.trim()),
    onSuccess: () => {
      setEmail('')
      setSent(true)
      void refresh()
    },
  })
  const withdraw = useMutation({ mutationFn: (id: number) => shopsApi.cancelInvitation(shopId, id), onSuccess: refresh })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (email.trim()) invite.mutate()
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-surface p-4" noValidate>
        <h3 className="font-semibold">{t('barber.shop.invite')}</h3>
        <TextField
          onSurface
          type="email"
          autoComplete="off"
          label={t('barber.shop.inviteEmail')}
          hint={t('barber.shop.inviteHint')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setSent(false)
            invite.reset()
          }}
        />
        {invite.isError && <Notice tone="error">{errorMessage(invite.error, t)}</Notice>}
        {sent && <Notice tone="success">{t('barber.shop.invited')}</Notice>}
        <Button type="submit" disabled={!email.trim() || invite.isPending}>
          {t('barber.shop.inviteSend')}
        </Button>
      </form>

      {pending.data && pending.data.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">{t('barber.shop.pending')}</h3>
          {pending.data.map((invitation) => (
            <div key={invitation.id} className="flex min-h-12 items-center gap-3 rounded-xl bg-surface px-4">
              <span className="flex-1 truncate">{invitation.barberName}</span>
              <Button
                variant="ghost"
                className="min-h-11 px-2 text-sm"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate(invitation.id)}
              >
                {t('barber.shop.withdraw')}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Opens a shop when `shop` is null, otherwise edits it. */
function ShopForm({ shop, onDone }: { shop: Shop | null; onDone: () => void }) {
  const { t } = useTranslation()
  const refresh = useRefresh()
  const [form, setForm] = useState<ShopInput>({
    name: shop?.name ?? '',
    address: shop?.address ?? '',
    city: shop?.city ?? '',
    phoneNumber: shop?.phoneNumber ?? '',
  })

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        phoneNumber: form.phoneNumber?.trim() || null,
      }
      return shop ? shopsApi.update(shop.id, body) : shopsApi.create(body)
    },
    onSuccess: () => {
      refresh()
      onDone()
    },
  })

  const set = (field: keyof ShopInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [field]: e.target.value })
  const complete = form.name.trim() && form.address.trim() && form.city.trim()

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (complete) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border-2 border-accent bg-surface p-4" noValidate>
      <h3 className="font-display text-xl font-extrabold uppercase">{shop ? t('barber.shop.edit') : t('barber.shop.createTitle')}</h3>
      <TextField onSurface required maxLength={100} label={t('barber.shop.name')} value={form.name} onChange={set('name')} />
      <TextField onSurface required maxLength={255} label={t('barber.shop.address')} value={form.address} onChange={set('address')} />
      <TextField onSurface required maxLength={100} label={t('barber.shop.city')} value={form.city} onChange={set('city')} />
      <TextField onSurface type="tel" maxLength={30} label={t('barber.shop.phone')} value={form.phoneNumber ?? ''} onChange={set('phoneNumber')} />
      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      <div className="flex gap-2">
        <Button type="submit" className="flex-1" disabled={!complete || save.isPending}>
          {t('barber.shop.save')}
        </Button>
        <Button type="button" variant="tonal" onClick={onDone}>
          {t('barber.shop.cancel')}
        </Button>
      </div>
    </form>
  )
}
