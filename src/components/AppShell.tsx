import { Link, NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext'
import { Logo } from './Logo'

export function AppShell() {
  const { t } = useTranslation()
  const { session } = useAuth()

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <Link to="/" aria-label={t('nav.home')} className="flex min-h-11 items-center text-accent">
          <Logo height={30} label={t('app.name')} />
        </Link>
        {session ? (
          <Link to="/account" aria-label={t('nav.account')} className="flex size-11 items-center justify-center rounded-xl text-muted hover:bg-surface hover:text-ink">
            <UserIcon />
          </Link>
        ) : (
          <Link to="/login" className="flex min-h-11 items-center px-2 text-sm font-semibold text-accent">
            {t('nav.login')}
          </Link>
        )}
      </header>

      <main className="flex flex-1 flex-col px-5 pt-2 pb-6">
        <Outlet />
      </main>

      <footer className={`flex justify-center gap-5 px-5 pt-4 text-xs text-muted ${session?.role === 'CUSTOMER' || session?.role === 'BARBER' ? 'pb-28' : 'pb-8'}`}>
        <Link to="/terms" className="min-h-11 content-center hover:text-ink">
          {t('nav.terms')}
        </Link>
        <Link to="/privacy" className="min-h-11 content-center hover:text-ink">
          {t('nav.privacy')}
        </Link>
      </footer>

      {(session?.role === 'CUSTOMER' || session?.role === 'BARBER') && (
        <nav
          aria-label="Κύριο μενού"
          className="fixed inset-x-0 bottom-0 border-t border-line bg-ground/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        >
          <div className="mx-auto flex max-w-lg">
            {session.role === 'CUSTOMER' ? (
              <>
                <BottomLink to="/" label={t('nav.barbers')} icon={<ScissorsIcon />} />
                <BottomLink to="/appointments" label={t('nav.appointments')} icon={<CalendarIcon />} />
              </>
            ) : (
              <>
                <BottomLink to="/barber" label={t('barber.nav.schedule')} icon={<CalendarIcon />} />
                <BottomLink to="/barber/services" label={t('barber.nav.services')} icon={<ScissorsIcon />} />
                <BottomLink to="/barber/hours" label={t('barber.nav.hours')} icon={<ClockIcon />} />
                <BottomLink to="/barber/profile" label={t('barber.nav.profile')} icon={<UserIcon />} />
              </>
            )}
          </div>
        </nav>
      )}
    </div>
  )
}

function BottomLink({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${isActive ? 'text-accent' : 'text-muted'}`
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

function ScissorsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  )
}

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} aria-label={label} className="flex size-11 items-center justify-center rounded-xl bg-surface text-ink">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </Link>
  )
}
