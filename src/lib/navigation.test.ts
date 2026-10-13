import { expect, it } from 'vitest'
import { safeNext } from './navigation'

it('only redirects to paths on this site after login', () => {
  expect(safeNext('/barbers/1')).toBe('/barbers/1')
  expect(safeNext(null)).toBe('/')
  expect(safeNext('https://evil.example')).toBe('/')
  expect(safeNext('//evil.example')).toBe('/')
})
