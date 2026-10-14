// Dates are shown in the barbers' time zone, whatever the device is set to.
const TIME_ZONE = 'Europe/Athens'

const priceFormat = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' })
const appointmentFormat = new Intl.DateTimeFormat('el-GR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23', // 18:00, not "06:00 μ.μ."
  timeZone: TIME_ZONE,
})
const weekdayFormat = new Intl.DateTimeFormat('el-GR', { weekday: 'short', timeZone: TIME_ZONE })
const dayNumberFormat = new Intl.DateTimeFormat('el-GR', { day: 'numeric', timeZone: TIME_ZONE })
const isoDateFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TIME_ZONE })

export function formatPrice(value: number): string {
  return priceFormat.format(value)
}

/** "Τετάρτη 14 Οκτωβρίου, 11:00" */
export function formatAppointmentTime(iso: string): string {
  return appointmentFormat.format(new Date(iso))
}

export interface DayOption {
  iso: string // YYYY-MM-DD in Athens
  weekday: string // "Τετ"
  day: string // "14"
}

/** Today and the following days, as the booking window allows (today + 14). */
export function bookableDays(count = 15, now = new Date()): DayOption[] {
  const [year, month, day] = isoDateFormat.format(now).split('-').map(Number)
  const days: DayOption[] = []
  for (let i = 0; i < count; i++) {
    // Noon UTC is the same calendar date in Athens all year, so daylight-saving changes never skip a day.
    const date = new Date(Date.UTC(year, month - 1, day + i, 12))
    days.push({
      iso: isoDateFormat.format(date),
      weekday: weekdayFormat.format(date).replace('.', ''),
      day: dayNumberFormat.format(date),
    })
  }
  return days
}

const timeFormat = new Intl.DateTimeFormat('el-GR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE })
const dayHeadingFormat = new Intl.DateTimeFormat('el-GR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TIME_ZONE })

/** "18:00" */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso))
}

/** The Athens calendar date of an instant, "YYYY-MM-DD". */
export function athensDate(iso: string | Date): string {
  return isoDateFormat.format(typeof iso === 'string' ? new Date(iso) : iso)
}

/** "Τετάρτη 14 Οκτωβρίου" */
export function formatDayHeading(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dayHeadingFormat.format(new Date(Date.UTC(year, month - 1, day, 12)))
}

/** "15 Αυγ" style short date for ranges. */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Intl.DateTimeFormat('el-GR', { day: 'numeric', month: 'short', timeZone: TIME_ZONE }).format(
    new Date(Date.UTC(year, month - 1, day, 12)),
  )
}

const shortDayFormat = new Intl.DateTimeFormat('el-GR', { weekday: 'short', day: 'numeric', timeZone: TIME_ZONE })

/** How a barber's next free time reads on a card: today, tomorrow, or "Πέμ 15". */
export function nextFreeKind(iso: string, now = new Date()): { kind: 'today' | 'tomorrow' | 'later'; day: string; time: string } {
  const date = athensDate(iso)
  const [today, tomorrow] = bookableDays(2, now).map((d) => d.iso)
  const kind = date === today ? 'today' : date === tomorrow ? 'tomorrow' : 'later'
  return { kind, day: shortDayFormat.format(new Date(iso)).replace('.', ''), time: formatTime(iso) }
}
