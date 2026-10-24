import { describe, expect, it } from 'vitest'
import { confirmationText, internationalPhone, messageLinks, reminderText, whenPhrase, withBookingLink } from './messages'

// "Today" is Tuesday 13 October 2026 in Athens.
const today = '2026-10-13'

describe('whenPhrase', () => {
  it('says today and tomorrow in words, other days by name', () => {
    expect(whenPhrase('2026-10-13T18:00:00+03:00', today)).toBe('σήμερα στις 18:00')
    expect(whenPhrase('2026-10-14T18:00:00+03:00', today)).toBe('αύριο, Τετάρτη 14 Οκτωβρίου, στις 18:00')
    expect(whenPhrase('2026-10-16T11:30:00+03:00', today)).toBe('την Παρασκευή 16 Οκτωβρίου στις 11:30')
    expect(whenPhrase('2026-10-17T11:30:00+03:00', today)).toBe('το Σάββατο 17 Οκτωβρίου στις 11:30')
  })
})

describe('message texts', () => {
  it('never put a name in the sentence', () => {
    expect(reminderText('2026-12-01T18:00:00+02:00')).toMatch(/^Γεια σου! Σου θυμίζω το ραντεβού σου την Τρίτη 1 Δεκεμβρίου στις 18:00\./)
    expect(confirmationText('2026-12-01T18:00:00+02:00')).toBe('Γεια σου! Κλείστηκε το ραντεβού σου την Τρίτη 1 Δεκεμβρίου στις 18:00. Τα λέμε!')
    expect(withBookingLink('Τα λέμε!', 'https://fade.app/giorgos')).toBe('Τα λέμε!\nΤην επόμενη φορά κλείνεις και από εδώ: https://fade.app/giorgos')
  })
})

describe('internationalPhone', () => {
  it('adds the Greek code to numbers written without one', () => {
    expect(internationalPhone('691 234 5678')).toBe('306912345678')
    expect(internationalPhone('+30 691-234-5678')).toBe('306912345678')
    expect(internationalPhone('0030 6912345678')).toBe('306912345678')
    expect(internationalPhone('+44 7700 900123')).toBe('447700900123')
    expect(internationalPhone('12345')).toBeNull()
  })
})

describe('messageLinks', () => {
  it('opens Viber, WhatsApp and SMS with the number and text filled in', () => {
    const links = messageLinks('6912345678', 'Γεια σου!')!
    expect(links.viber).toBe('viber://chat?number=%2B306912345678&draft=%CE%93%CE%B5%CE%B9%CE%B1%20%CF%83%CE%BF%CF%85!')
    expect(links.whatsapp).toBe('https://wa.me/306912345678?text=%CE%93%CE%B5%CE%B9%CE%B1%20%CF%83%CE%BF%CF%85!')
    expect(links.sms).toBe('sms:+306912345678?&body=%CE%93%CE%B5%CE%B9%CE%B1%20%CF%83%CE%BF%CF%85!')
    expect(messageLinks('123', 'x')).toBeNull()
  })
})
