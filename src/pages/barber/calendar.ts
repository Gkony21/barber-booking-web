import type { Appointment, TimeOff, WorkingHours } from '../../api/types'
import { athensDate, formatTime } from '../../lib/format'
import { WEEK } from './week'

/** One row of a day in the schedule: an appointment, or a free stretch inside working hours. */
export type DayItem =
  | { kind: 'appointment'; start: string; appointment: Appointment }
  | { kind: 'block'; start: string; end: string; timeOff: TimeOff }
  | { kind: 'free'; start: string; end: string }

// Shorter gaps cannot fit any appointment worth showing.
const MIN_FREE_MINUTES = 15

/** "YYYY-MM-DD" → that day's DayOfWeek. Noon UTC is the same date in Athens all year. */
export function dayOfWeek(isoDate: string) {
  const [y, m, d] = isoDate.split('-').map(Number)
  return WEEK[(new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() + 6) % 7]
}

/** A whole day off (blocks of a few hours do not count). */
export function isOff(isoDate: string, timeOff: TimeOff[]): boolean {
  return timeOff.some((t) => t.startTime === null && t.startDate <= isoDate && isoDate <= t.endDate)
}

/** Blocks of hours on that day, e.g. 12:00–14:00. */
export function blocksOn(isoDate: string, timeOff: TimeOff[]): TimeOff[] {
  return timeOff.filter((t) => t.startTime !== null && t.startDate === isoDate)
}

/** Active (pending or confirmed) appointments, grouped by their Athens date. */
export function byDay(appointments: Appointment[]): Map<string, Appointment[]> {
  const days = new Map<string, Appointment[]>()
  for (const a of appointments) {
    // No-shows stay visible so the barber can see them; cancelled ones do not.
    if (a.status !== 'PENDING' && a.status !== 'CONFIRMED' && a.status !== 'NO_SHOW') continue
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
  const blocks = blocksOn(isoDate, timeOff)
  for (const block of blocks) items.push({ kind: 'block', start: block.startTime!, end: block.endTime!, timeOff: block })

  // Appointments and blocks both take time out of the working hours.
  const busy = [
    ...booked.map((a) => ({ start: formatTime(a.startTime), end: formatTime(a.endTime) })),
    ...blocks.map((b) => ({ start: b.startTime!, end: b.endTime! })),
  ].sort((a, b) => a.start.localeCompare(b.start))

  if (!isOff(isoDate, timeOff)) {
    const shifts = hours.filter((h) => h.dayOfWeek === dayOfWeek(isoDate)).sort((a, b) => a.startTime.localeCompare(b.startTime))
    for (const shift of shifts) {
      let cursor = now && now > shift.startTime ? roundUp(now) : shift.startTime
      for (const { start, end } of busy) {
        if (end <= cursor || start >= shift.endTime) continue
        if (start > cursor) addFree(items, cursor, start)
        cursor = end > cursor ? end : cursor
      }
      if (cursor < shift.endTime) addFree(items, cursor, shift.endTime)
    }
  }

  return items.sort((a, b) => a.start.localeCompare(b.start) || (a.kind === 'free' ? 1 : -1))
}

/**
 * How full a day is, for the dots in the month: 1 up to a third of the working time booked, 2 up to
 * two thirds, 3 beyond that, and 'full' when no free stretch is left. Without working hours that day
 * (bookings entered outside them), the number of appointments decides: 1–3, 4–6, 7 or more.
 */
export function dayLoad(isoDate: string, appointments: Appointment[], hours: WorkingHours[], timeOff: TimeOff[]): 0 | 1 | 2 | 3 | 'full' {
  const booked = appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED')
  if (booked.length === 0) return 0
  const shifts = isOff(isoDate, timeOff) ? [] : hours.filter((h) => h.dayOfWeek === dayOfWeek(isoDate))
  const blocked = blocksOn(isoDate, timeOff).reduce((sum, b) => sum + minutes(b.endTime!) - minutes(b.startTime!), 0)
  const working = shifts.reduce((sum, s) => sum + minutes(s.endTime) - minutes(s.startTime), 0) - blocked
  if (working <= 0) return booked.length >= 7 ? 3 : booked.length >= 4 ? 2 : 1
  if (!planDay(isoDate, booked, hours, timeOff, null).some((item) => item.kind === 'free')) return 'full'
  const used = booked.reduce((sum, a) => sum + a.durationMinutes, 0) / working
  return used > 2 / 3 ? 3 : used > 1 / 3 ? 2 : 1
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
