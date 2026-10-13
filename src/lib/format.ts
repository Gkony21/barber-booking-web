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
