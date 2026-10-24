import { describe, expect, it } from 'vitest'
import type { Appointment, WorkingHours } from '../../api/types'
import { dayLoad, monthGrid, planDay } from './calendar'

const appointment = (id: number, start: string, end: string, status: Appointment['status'] = 'CONFIRMED') =>
  ({ id, startTime: `2026-10-22T${start}:00+03:00`, endTime: `2026-10-22T${end}:00+03:00`, status }) as Appointment

// Thursday 22 October 2026: 10:00–14:00 and 17:00–21:00.
const hours: WorkingHours[] = [
  { dayOfWeek: 'THURSDAY', startTime: '10:00', endTime: '14:00' },
  { dayOfWeek: 'THURSDAY', startTime: '17:00', endTime: '21:00' },
]

const summary = (items: ReturnType<typeof planDay>) =>
  items.map((i) =>
    i.kind === 'free' ? `free ${i.start}-${i.end}` : i.kind === 'block' ? `block ${i.start}-${i.end}` : `#${i.appointment.id} ${i.start}`,
  )

describe('planDay', () => {
  it('puts the free stretches of each shift between the appointments', () => {
    const items = planDay('2026-10-22', [appointment(2, '11:00', '11:45'), appointment(1, '10:00', '10:30')], hours, [], null)
    expect(summary(items)).toEqual(['#1 10:00', 'free 10:30-11:00', '#2 11:00', 'free 11:45-14:00', 'free 17:00-21:00'])
  })

  it('skips gaps too short to book and keeps appointments outside working hours', () => {
    const items = planDay('2026-10-22', [appointment(1, '10:00', '13:50'), appointment(2, '22:00', '22:30')], hours, [], null)
    expect(summary(items)).toEqual(['#1 10:00', 'free 17:00-21:00', '#2 22:00'])
  })

  it('leaves blocked hours out of the free time and lists them', () => {
    const block = { id: 7, startDate: '2026-10-22', endDate: '2026-10-22', reason: 'Γιατρός', startTime: '12:00', endTime: '13:00', activeAppointments: 0 }
    const items = planDay('2026-10-22', [appointment(1, '10:00', '10:30')], hours, [block], null)
    expect(summary(items)).toEqual(['#1 10:00', 'free 10:30-12:00', 'block 12:00-13:00', 'free 13:00-14:00', 'free 17:00-21:00'])
  })

  it('does not offer time that has already passed today', () => {
    expect(summary(planDay('2026-10-22', [], hours, [], '12:07'))).toEqual(['free 12:15-14:00', 'free 17:00-21:00'])
  })

  it('has no free time on a day off or a day without working hours', () => {
    const off = [{ id: 1, startDate: '2026-10-20', endDate: '2026-10-23', reason: null, startTime: null, endTime: null, activeAppointments: 0 }]
    expect(planDay('2026-10-22', [], hours, off, null)).toEqual([])
    expect(planDay('2026-10-23', [], hours, [], null)).toEqual([])
  })
})

describe('monthGrid', () => {
  it('starts weeks on Monday', () => {
    const october = monthGrid(2026, 10) // 1 October 2026 is a Thursday
    expect(october.lead).toBe(3)
    expect(october.days).toHaveLength(31)
    expect(october.days[0]).toBe('2026-10-01')
  })
})

describe('dayLoad', () => {
  // Eight working hours that Thursday; each haircut takes half an hour.
  const cuts = (count: number) =>
    Array.from({ length: count }, (_, i) => {
      const start = `${String(10 + Math.floor(i / 2) + (i >= 8 ? 3 : 0)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`
      return { ...appointment(i + 1, start, start), durationMinutes: 30 } as Appointment
    })

  it('counts how much of the working time is booked, not how many appointments there are', () => {
    expect(dayLoad('2026-10-22', [], hours, [])).toBe(0)
    expect(dayLoad('2026-10-22', cuts(3), hours, [])).toBe(1) // 1.5 of 8 hours
    expect(dayLoad('2026-10-22', cuts(6), hours, [])).toBe(2) // 3 of 8 hours
    expect(dayLoad('2026-10-22', cuts(12), hours, [])).toBe(3) // 6 of 8 hours
  })

  it('marks a day with no free stretch left as full', () => {
    const allDay = [
      { ...appointment(1, '10:00', '14:00'), durationMinutes: 240 },
      { ...appointment(2, '17:00', '21:00'), durationMinutes: 240 },
    ] as Appointment[]
    expect(dayLoad('2026-10-22', allDay, hours, [])).toBe('full')
  })

  it('falls back to the number of appointments on a day without working hours', () => {
    expect(dayLoad('2026-10-22', cuts(2), [], [])).toBe(1)
    expect(dayLoad('2026-10-22', cuts(5), [], [])).toBe(2)
    expect(dayLoad('2026-10-22', cuts(7), [], [])).toBe(3)
  })

  it('leaves cancelled appointments out', () => {
    expect(dayLoad('2026-10-22', [{ ...appointment(1, '10:00', '10:30', 'CANCELLED'), durationMinutes: 30 } as Appointment], hours, [])).toBe(0)
  })
})
