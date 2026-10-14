import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../api/client'
import type { Photo } from '../api/types'

const PREVIEW = 6

/** A grid of a barber's work; tapping a photo opens it full screen. */
export function Gallery({ title, photos }: { title: string; photos: Photo[] }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  if (photos.length === 0) return null

  const visible = showAll ? photos : photos.slice(0, PREVIEW)

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
      <ul className="grid grid-cols-3 gap-2">
        {visible.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              aria-label={t('booking.photoOf', { index: index + 1, total: photos.length })}
              onClick={() => setOpen(index)}
              className="block w-full overflow-hidden rounded-xl"
            >
              <img src={mediaUrl(photo.url)} alt="" loading="lazy" className="aspect-square w-full bg-surface object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {!showAll && photos.length > PREVIEW && (
        <button type="button" onClick={() => setShowAll(true)} className="min-h-11 self-start text-sm font-semibold text-accent">
          +{photos.length - PREVIEW}
        </button>
      )}
      {open !== null && <Lightbox photos={photos} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
    </section>
  )
}

function Lightbox({
  photos,
  index,
  onChange,
  onClose,
}: {
  photos: Photo[]
  index: number
  onChange: (index: number) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const closeButton = useRef<HTMLButtonElement>(null)
  const previous = () => onChange((index - 1 + photos.length) % photos.length)
  const next = () => onChange((index + 1) % photos.length)

  useEffect(() => {
    closeButton.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowLeft') previous()
      if (event.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('booking.photoOf', { index: index + 1, total: photos.length })}
      className="fixed inset-0 z-50 flex flex-col bg-ground/95 backdrop-blur"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-4" onClick={(e) => e.stopPropagation()}>
        <span className="text-sm text-muted">
          {index + 1} / {photos.length}
        </span>
        <button ref={closeButton} type="button" aria-label={t('booking.close')} onClick={onClose} className="flex size-11 items-center justify-center rounded-xl bg-surface text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-4" onClick={(e) => e.stopPropagation()}>
        <img src={mediaUrl(photos[index].url)} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
      </div>
      {photos.length > 1 && (
        <div className="flex justify-center gap-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
          <NavButton label={t('booking.previous')} onClick={previous} d="M15 18l-6-6 6-6" />
          <NavButton label={t('booking.next')} onClick={next} d="M9 18l6-6-6-6" />
        </div>
      )}
    </div>
  )
}

function NavButton({ label, onClick, d }: { label: string; onClick: () => void; d: string }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-12 items-center justify-center rounded-xl bg-surface text-ink">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
      </svg>
    </button>
  )
}
