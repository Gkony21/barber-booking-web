import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { authApi } from '../api/endpoints'
import type { User } from '../api/types'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { PasswordField } from '../components/PasswordField'
import { ErrorState, Loading, Notice } from '../components/States'
import { TextField } from '../components/TextField'
import { errorMessage } from '../lib/errors'

/** Name and mobile, which barbers and customers see on bookings. */
export function MyDetails() {
  const { t } = useTranslation()
  const me = useQuery({ queryKey: ['me'], queryFn: authApi.me })

  if (me.isPending) return <Loading />
  if (me.isError) return <ErrorState error={me.error} onRetry={() => me.refetch()} />
  return <DetailsForm key={me.data.id} user={me.data} title={t('account.detailsTitle')} />
}

function DetailsForm({ user, title }: { user: User; title: string }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState(user.name)
  const [phone, setPhone] = useState(user.phoneNumber ?? '')
  const [saved, setSaved] = useState(false)

  const save = useMutation({
    mutationFn: () => authApi.updateMe({ name: name.trim(), phoneNumber: phone.trim() }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['me'], updated)
      // The barber's profile shows the same name.
      void queryClient.invalidateQueries({ queryKey: ['barber', 'me'] })
      setPhone(updated.phoneNumber ?? '')
      setSaved(true)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() && phone.trim()) save.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <h2 className="font-display text-xl font-black italic uppercase">{title}</h2>
      {!user.phoneNumber && <Notice>{t('account.phoneMissing')}</Notice>}
      <TextField label={t('auth.name')} autoComplete="name" maxLength={100} required value={name} onChange={(e) => {
        setName(e.target.value)
        setSaved(false)
      }} />
      <TextField label={t('auth.phone')} type="tel" autoComplete="tel" maxLength={30} required value={phone} onChange={(e) => {
        setPhone(e.target.value)
        setSaved(false)
      }} />
      {save.isError && <Notice tone="error">{errorMessage(save.error, t)}</Notice>}
      {saved && <Notice tone="success">{t('account.detailsSaved')}</Notice>}
      <Button type="submit" variant="secondary" disabled={!name.trim() || !phone.trim() || save.isPending}>
        {t('account.save')}
      </Button>
    </form>
  )
}

/** Needs the current password; other devices are signed out, this one stays signed in. */
export function ChangePassword() {
  const { t } = useTranslation()
  const { replaceToken } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [done, setDone] = useState(false)
  const mismatch = repeat.length > 0 && next !== repeat

  const change = useMutation({
    mutationFn: () => authApi.changePassword(current, next),
    onSuccess: ({ token }) => {
      replaceToken(token)
      setCurrent('')
      setNext('')
      setRepeat('')
      setDone(true)
    },
  })

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (current && next.length >= 8 && next === repeat) change.mutate()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <h2 className="font-display text-xl font-black italic uppercase">{t('account.passwordTitle')}</h2>
      <PasswordField label={t('account.currentPassword')} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
      <PasswordField label={t('account.newPassword')} autoComplete="new-password" value={next} onChange={(e) => {
        setNext(e.target.value)
        setDone(false)
      }} />
      <PasswordField
        label={t('account.repeatPassword')}
        autoComplete="new-password"
        value={repeat}
        error={mismatch ? t('auth.passwordsDiffer') : undefined}
        onChange={(e) => setRepeat(e.target.value)}
      />
      {change.isError && <Notice tone="error">{errorMessage(change.error, t)}</Notice>}
      {done && <Notice tone="success">{t('account.passwordChanged')}</Notice>}
      <Button type="submit" variant="secondary" disabled={!current || next.length < 8 || next !== repeat || change.isPending}>
        {t('account.changePassword')}
      </Button>
    </form>
  )
}
