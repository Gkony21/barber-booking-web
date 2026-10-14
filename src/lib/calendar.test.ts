import { expect, it } from 'vitest'
import { buildIcs, directionsUrl } from './calendar'

it('builds an event in UTC with a two-hour reminder and escaped text', () => {
  const ics = buildIcs({
    uid: 'appointment-31@fade',
    start: '2026-10-14T18:00:00+03:00',
    end: '2026-10-14T18:30:00+03:00',
    title: 'Ραντεβού: Κούρεμα',
    location: "Nick's Barbershop; Ερμού 12, Αθήνα",
  })

  expect(ics).toContain('DTSTART:20261014T150000Z')
  expect(ics).toContain('DTEND:20261014T153000Z')
  expect(ics).toContain("LOCATION:Nick's Barbershop\\; Ερμού 12\\, Αθήνα")
  expect(ics).toContain('TRIGGER:-PT2H')
  expect(ics.split('\r\n')[0]).toBe('BEGIN:VCALENDAR')
})

it('links to directions for an address', () => {
  expect(directionsUrl('Ερμού 12, Αθήνα')).toBe(
    'https://www.google.com/maps/search/?api=1&query=%CE%95%CF%81%CE%BC%CE%BF%CF%8D%2012%2C%20%CE%91%CE%B8%CE%AE%CE%BD%CE%B1',
  )
})
