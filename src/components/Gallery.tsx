import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { mediaUrl } from '../api/client'
import type { Photo } from '../api/types'

const PREVIEW = 6
const STRIP = 5

/**
 * A barber's work; tapping a photo opens it full screen. "grid" shows rows of three,
 * "strip" a single row of thumbnails whose last one counts the rest.
 */
export function Gallery({ title, photos, layout = 'grid' }: { title?: string; photos: Photo[]; layout?: 'grid' | 'strip' }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  if (photos.length === 0) return null

  if (layout === 'strip') {
    const shown = photos.slice(0, STRIP)
    const rest = photos.length - shown.length
    return (
      <section className="-mx-5 flex gap-2 overflow-x-auto px-5 [scrollbar-width:none]" aria-label={title}>
        {shown.map((photo, index) => {
          const isLastWithMore = rest > 0 && index === shown.length - 1
          return (
            <button
              key={photo.id}
              type="button"
              aria-label={[t('booking.photoOf', { index: index + 1, total: photos.length }), photo.caption].filter(Boolean).join(': ')}
              onClick={() => setOpen(index)}
              className="relative size-[86px] shrink-0 overflow-hidden rounded-md bg-surface"
            >
              <img src={mediaUrl(photo.url)} alt="" loading="lazy" className="size-full object-cover" />
              {isLastWithMore && (
                <span className="absolute inset-0 flex items-center justify-center bg-ground/65 font-display text-xl font-black">
                  +{rest + 1}
                </span>
              )}
            </button>
          )
        })}
        {open !== null && <Lightbox photos={photos} index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
      </section>
    )
  }

  const visible = showAll ? photos : photos.slice(0, PREVIEW)

  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="font-display text-lg font-semibold tracking-wide uppercase">{title}</h2>
      <ul className="grid grid-cols-3 gap-2">
        {visible.map((photo, index) => (
          <li key={photo.id}>
            <button
              type="button"
              aria-label={[t('booking.photoOf', { index: index + 1, total: photos.length }), photo.caption].filter(Boolean).join(': ')}
              onClick={() => setOpen(index)}
              className="block w-full overflow-hidden rounded-xl"
            >
              <img src={mediaUrl(photo.url)} alt="" loading="lazy" className="aspect-square w-full bg-surface object-cover" />
            </button>
            {photo.caption && <p className="mt-1 truncate text-xs text-muted">{photo.caption}</p>}
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
      <figure className="m-0 flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4" onClick={(e) => e.stopPropagation()}>
        <img src={mediaUrl(photos[index].url)} alt={photos[index].caption ?? ''} className="min-h-0 max-w-full flex-1 rounded-2xl object-contain" />
        {photos[index].caption && <figcaption className="text-center text-ink">{photos[index].caption}</figcaption>}
      </figure>
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
