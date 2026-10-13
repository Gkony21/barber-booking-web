import { describe, expect, it } from 'vitest'
import { addBreak, isValidWeek, WEEK, type Week } from './week'

const emptyWeek = (): Week => Object.fromEntries(WEEK.map((day) => [day, []])) as unknown as Week

describe('addBreak', () => {
  it('splits a full day around midday', () => {
    expect(addBreak([{ start: '10:00', end: '20:00' }])).toEqual([
      { start: '10:00', end: '14:00' },
      { start: '17:00', end: '20:00' },
    ])
  })

  it('adds an hour after a shift that cannot be split', () => {
    expect(addBreak([{ start: '10:00', end: '14:00' }, { start: '17:00', end: '20:00' }])).toEqual([
      { start: '10:00', end: '14:00' },
      { start: '17:00', end: '20:00' },
      { start: '20:00', end: '21:00' },
    ])
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
