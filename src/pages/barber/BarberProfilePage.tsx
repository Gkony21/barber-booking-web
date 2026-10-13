import { useTranslation } from 'react-i18next'
import { ErrorState, Loading } from '../../components/States'
import { ProfileForm } from './ProfileForm'
import { useMyBarber } from './useMyBarber'

export function BarberProfilePage() {
  const { t } = useTranslation()
  const profile = useMyBarber()

  if (profile.isPending) return <Loading />
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />

  return (
    <div className="flex flex-col gap-6 pt-4">
      <h1 className="font-display text-5xl leading-none font-extrabold uppercase">
        {profile.data ? profile.data.name : t('barber.setupTitle')}
      </h1>
      <ProfileForm key={profile.data?.id ?? 'new'} barber={profile.data} />
    </div>
  )
}
