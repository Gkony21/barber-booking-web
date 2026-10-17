import type { Appointment, TimeOff, WorkingHours } from '../../api/types'
import { athensDate, formatTime } from '../../lib/format'
import { WEEK } from './week'

/** One row of a day in the schedule: an appointment, or a free stretch inside working hours. */
export type DayItem =
  | { kind: 'appointment'; start: string; appointment: Appointment }
  | { kind: 'free'; start: string; end: string }

// Shorter gaps cannot fit any appointment worth showing.
const MIN_FREE_MINUTES = 15

/** "YYYY-MM-DD" → that day's DayOfWeek. Noon UTC is the same date in Athens all year. */
export function dayOfWeek(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return WEEK[(new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7]
}

export function isOff(isoDate: string, timeOff: TimeOff[]): boolean {
  return timeOff.some((t) => t.startDate <= isoDate && isoDate <= t.endDate)
}

/** Active (pending or confirmed) appointments, grouped by their Athens date. */
export function byDay(appointments: Appointment[]): Map<string, Appointment[]> {
  const days = new Map<string, Appointment[]>()
  for (const a of appointments) {
    if (a.status !== 'PENDING' && a.status !== 'CONFIRMED') continue
    const day = athensDate(a.startTime)
    days.set(day, [...(days.get(day) ?? []), a])
  }
  return days
}

/**
 * A day as the barber reads it: appointments in time order, with the free stretches of their
 * working hours in between. On today, time that has already passed is not offered as free.
 *
 * @param now "HH:mm" in Athens when the day is today, otherwise null
 */
export function planDay(
  isoDate: string,
  appointments: Appointment[],
  hours: WorkingHours[],
  timeOff: TimeOff[],
  now: string | null,
): DayItem[] {
  const booked = [...appointments].sort((a, b) => a.startTime.localeCompare(b.startTime))
  const items: DayItem[] = booked.map((appointment) => ({
    kind: 'appointment',
    start: formatTime(appointment.startTime),
    appointment,
  }))

  if (!isOff(isoDate, timeOff)) {
    const shifts = hours.filter((h) => h.dayOfWeek === dayOfWeek(isoDate)).sort((a, b) => a.startTime.localeCompare(b.startTime))
    for (const shift of shifts) {
      let cursor = now && now > shift.startTime ? roundUp(now) : shift.startTime
      for (const a of booked) {
        const start = formatTime(a.startTime)
        const end = formatTime(a.endTime)
        if (end <= cursor || start >= shift.endTime) continue
        if (start > cursor) addFree(items, cursor, start)
        cursor = end > cursor ? end : cursor
      }
      if (cursor < shift.endTime) addFree(items, cursor, shift.endTime)
    }
  }

  return items.sort((a, b) => a.start.localeCompare(b.start) || (a.kind === 'free' ? 1 : -1))
}

function addFree(items: DayItem[], start: string, end: string) {
  if (minutes(end) - minutes(start) >= MIN_FREE_MINUTES) items.push({ kind: 'free', start, end })
}

function minutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

// To the next quarter hour, so "free from 10:07" reads "free from 10:15".
function roundUp(time: string): string {
  const total = Math.ceil(minutes(time) / 15) * 15
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** The days of a month as "YYYY-MM-DD", and how many blank cells come before the 1st (weeks start on Monday). */
export function monthGrid(year: number, month: number): { lead: number; days: string[] } {
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const lead = (new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay() + 6) % 7
  const pad = (n: number) => String(n).padStart(2, '0')
  return { lead, days: Array.from({ length: count }, (_, i) => `${year}-${pad(month)}-${pad(i + 1)}`) }
}
