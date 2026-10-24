import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../../components/Button'
import { buttonClass } from '../../components/buttonStyles'
import { Notice } from '../../components/States'
import { messageLinks, withBookingLink } from '../../lib/messages'

/**
 * A ready message for a customer, editable, and buttons that open Viber, WhatsApp or SMS on the
 * barber's phone with it filled in. Nothing is sent from here: the barber presses send in that app.
 */
export function MessagePanel({
  phone,
  text,
  bookingLink,
  onClose,
}: {
  phone: string
  text: string
  /** The barber's own booking link, offered so phone customers can book online next time. */
  bookingLink?: string | null
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [message, setMessage] = useState(text)
  const [addLink, setAddLink] = useState(Boolean(bookingLink))
  const links = messageLinks(phone, addLink && bookingLink ? withBookingLink(message, bookingLink) : message)

  return (
    <section aria-label={t('barber.messages.title')} className="flex flex-col gap-3 rounded-md border-2 border-accent bg-surface p-4">
      <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
        {t('barber.messages.label', { phone })}
        <textarea
          rows={6}
          maxLength={600}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded-md border-2 border-surface-2 bg-surface-2 px-3 py-2 text-base text-ink focus:border-accent focus:outline-none"
        />
      </label>
      {bookingLink && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" checked={addLink} onChange={(e) => setAddLink(e.target.checked)} className="size-5 accent-accent" />
          <span className="flex flex-col">
            <span className="font-semibold text-ink">{t('barber.messages.addLink')}</span>
            <span className="text-muted">{t('barber.messages.addLinkHint')}</span>
          </span>
        </label>
      )}
      {links ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <a href={links.viber} className={buttonClass('outline', 'px-2')}>
              Viber
            </a>
            <a href={links.whatsapp} target="_blank" rel="noreferrer" className={buttonClass('outline', 'px-2')}>
              WhatsApp
            </a>
            <a href={links.sms} className={buttonClass('outline', 'px-2')}>
              SMS
            </a>
          </div>
          <p className="text-xs text-muted">{t('barber.messages.hint')}</p>
        </>
      ) : (
        <Notice tone="error">{t('barber.messages.badPhone')}</Notice>
      )}
      <Button type="button" variant="ghost" className="self-end min-h-11 px-3 text-sm" onClick={onClose}>
        {t('barber.messages.close')}
      </Button>
    </section>
  )
}
