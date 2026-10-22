import type { DayOfWeek } from '../../api/types'

export const WEEK: DayOfWeek[] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']

export type Shift = { start: string; end: string }
export type Week = Record<DayOfWeek, Shift[]>

/** Every shift starts before it ends and, within a day, does not overlap the previous one. */
export function isValidWeek(week: Week): boolean {
  return WEEK.every((day) => {
    const shifts = [...week[day]].sort((a, b) => a.start.localeCompare(b.start))
    return shifts.every((s, i) => s.start < s.end && (i === 0 || shifts[i - 1].end <= s.start))
  })
}

/**
 * "+ Προσθήκη ωρών": adds another set of hours after the last one, leaving the existing ones as
 * they are, e.g. 09:00–14:00 then 17:00–21:00 for a split day. Starts at 17:00 when the day ends
 * by 16:00, otherwise an hour after the last shift, for three hours. Null when nothing fits.
 */
export function addHours(shifts: Shift[]): Shift[] | null {
  const lastEnd = shifts.length ? shifts[shifts.length - 1].end : '09:00'
  const start = lastEnd <= '16:00' ? '17:00' : addMinutes(lastEnd, 60)
  const end = start === '17:00' ? '21:00' : addMinutes(start, 180)
  return start < end ? [...shifts, { start, end }] : null
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 45)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
