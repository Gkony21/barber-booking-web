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
 * "+ Break": splits the last shift around midday (10:00–20:00 → 10:00–14:00 and 17:00–20:00),
 * or, if it is too short to split, adds an hour after it.
 */
export function addBreak(shifts: Shift[]): Shift[] {
  const last = shifts[shifts.length - 1]
  if (last.start < '14:00' && last.end > '17:00') {
    return [...shifts.slice(0, -1), { start: last.start, end: '14:00' }, { start: '17:00', end: last.end }]
  }
  const nextStart = last.end
  const nextEnd = addMinutes(nextStart, 60)
  return [...shifts, { start: nextStart, end: nextEnd > nextStart ? nextEnd : '23:45' }]
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 45)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
