import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { DayStatus } from '../api/types'
import type { DayOption } from '../lib/format'

/**
 * Horizontal row of days. Swipes on touch screens; on a computer the arrows and the mouse
 * wheel move it sideways, since a plain wheel cannot scroll a horizontal row.
 */
export function DayPicker({
  title,
  days,
  selected,
  onSelect,
  statusOf,
}: {
  title: ReactNode
  days: DayOption[]
  selected: string
  onSelect: (iso: string) => void
  /** Marks closed and full days, so customers see them before tapping. */
  statusOf?: (iso: string) => DayStatus | undefined
}) {
  const { t } = useTranslation()
  const row = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ atStart: true, atEnd: false })

  useEffect(() => {
    const el = row.current
    if (!el) return

    const update = () =>
      setEdges({ atStart: el.scrollLeft <= 2, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })

    // Turn vertical wheel movement into sideways scrolling while the pointer is over the row,
    // but let the page scroll once the row has reached its end.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      const canScroll = event.deltaY > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 2 : el.scrollLeft > 2
      if (!canScroll) return
      event.preventDefault()
      el.scrollBy({ left: event.deltaY })
    }

    update()
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', update)
    }
  }, [])

  const page = (direction: 1 | -1) => {
    const el = row.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        {title}
        <div className="flex gap-1">
          <ArrowButton label={t('booking.earlierDays')} disabled={edges.atStart} onClick={() => page(-1)} direction="left" />
          <ArrowButton label={t('booking.laterDays')} disabled={edges.atEnd} onClick={() => page(1)} direction="right" />
        </div>
      </div>
      <div ref={row} className="-mx-5 flex snap-x gap-2 overflow-x-auto scroll-px-5 px-5 pt-0.5 pb-1.5 [scrollbar-width:none]">
        {days.map((d) => {
          const isSelected = d.iso === selected
          const status = statusOf?.(d.iso)
          const unavailable = status === 'CLOSED' || status === 'FULL'
          const note = status === 'CLOSED' ? t('booking.dayClosed') : status === 'FULL' ? t('booking.dayFull') : null
          return (
            <button
              key={d.iso}
              aria-pressed={isSelected}
              aria-label={note ? `${d.weekday} ${d.day}, ${note}` : `${d.weekday} ${d.day}`}
              onClick={() => onSelect(d.iso)}
              className={`flex min-h-17 w-14 shrink-0 snap-start flex-col items-center justify-center gap-0.5 rounded-md transition-[transform,box-shadow] duration-100 motion-reduce:transition-none ${
                isSelected
                  ? 'bg-accent text-ground shadow-lift'
                  : unavailable
                    ? 'border-2 border-dashed border-line text-faint'
                    : 'bg-surface text-ink hover:bg-surface-2'
              }`}
            >
              <span className="font-display text-[13px] font-black tracking-wide uppercase">{d.weekday}</span>
              <span className={`font-display text-2xl font-black ${unavailable && !isSelected ? 'line-through decoration-2' : ''}`}>{d.day}</span>
              {note && <span className="-mt-0.5 text-[10px] leading-none font-semibold">{note}</span>}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ArrowButton({ label, disabled, onClick, direction }: { label: string; disabled: boolean; onClick: () => void; direction: 'left' | 'right' }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-xl bg-surface text-ink hover:bg-surface-2 disabled:text-faint disabled:hover:bg-surface"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={direction === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
      </svg>
    </button>
  )
}
