import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 pt-10">
      <h1 className="font-display text-5xl font-extrabold uppercase">{t('notFound.title')}</h1>
      <p className="text-muted">{t('notFound.body')}</p>
      <Link to="/" className="font-semibold text-accent">
        {t('notFound.home')}
      </Link>
    </div>
  )
}
