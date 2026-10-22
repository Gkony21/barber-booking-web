import { describe, expect, it } from 'vitest'
import { addHours, isValidWeek, WEEK, type Week } from './week'

const emptyWeek = (): Week => Object.fromEntries(WEEK.map((day) => [day, []])) as unknown as Week

describe('addHours', () => {
  it('adds afternoon hours after a morning shift, leaving it as it was', () => {
    expect(addHours([{ start: '09:00', end: '14:00' }])).toEqual([
      { start: '09:00', end: '14:00' },
      { start: '17:00', end: '21:00' },
    ])
  })

  it('starts an hour after a shift that runs late', () => {
    expect(addHours([{ start: '10:00', end: '18:00' }])).toEqual([
      { start: '10:00', end: '18:00' },
      { start: '19:00', end: '22:00' },
    ])
  })

  it('adds nothing when the day is already over', () => {
    expect(addHours([{ start: '15:00', end: '23:30' }])).toBeNull()
  })
})

describe('isValidWeek', () => {
  it('accepts split shifts and closed days', () => {
    const week = emptyWeek()
    week.TUESDAY = [{ start: '17:00', end: '21:00' }, { start: '10:00', end: '14:00' }]
    expect(isValidWeek(week)).toBe(true)
  })

  it('rejects overlapping or backwards shifts', () => {
    const overlapping = emptyWeek()
    overlapping.MONDAY = [{ start: '10:00', end: '15:00' }, { start: '14:00', end: '18:00' }]
    expect(isValidWeek(overlapping)).toBe(false)

    const backwards = emptyWeek()
    backwards.MONDAY = [{ start: '18:00', end: '10:00' }]
    expect(isValidWeek(backwards)).toBe(false)
  })
})
