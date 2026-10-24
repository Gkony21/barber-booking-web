import { athensDate, bookableDays, formatDayHeading, formatTime } from './format'

/**
 * Ready-made messages the barber sends from their own phone (Viber, WhatsApp or SMS) to customers
 * who book by phone: they get no emails from the app. Sentences never contain names, since Greek
 * names change form ("Κώστας" → "Κώστα").
 */

/** "σήμερα στις 18:00", "αύριο, Τετάρτη 14 Οκτωβρίου, στις 18:00", "το Σάββατο 17 Οκτωβρίου στις 11:00". */
export function whenPhrase(startTime: string, today = bookableDays(1)[0].iso): string {
  const day = athensDate(startTime)
  const time = formatTime(startTime)
  const heading = formatDayHeading(day)
  if (day === today) return `σήμερα στις ${time}`
  if (day === nextDay(today)) return `αύριο, ${heading}, στις ${time}`
  return `${heading.startsWith('Σάββατο') ? 'το' : 'την'} ${heading} στις ${time}`
}

function nextDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10)
}

/** A start for a message about nothing in particular. */
export const GREETING = 'Γεια σου! '

export function reminderText(startTime: string): string {
  return `Γεια σου! Σου θυμίζω το ραντεβού σου ${whenPhrase(startTime)}. Αν δεν μπορείς να έρθεις, πες μου να δώσω την ώρα σε άλλον. Τα λέμε!`
}

export function confirmationText(startTime: string): string {
  return `Γεια σου! Κλείστηκε το ραντεβού σου ${whenPhrase(startTime)}. Τα λέμε!`
}

/** Added when the barber wants phone customers to book online next time. */
export function withBookingLink(text: string, link: string): string {
  return `${text}\nΤην επόμενη φορά κλείνεις και από εδώ: ${link}`
}

/**
 * The number as messaging apps want it: country code, digits only ("306912345678"). Greek numbers
 * written without a code ("691 234 5678") get +30.
 */
export function internationalPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (phone.trim().startsWith('+')) return digits.length >= 8 ? digits : null
  if (digits.startsWith('00')) return digits.slice(2)
  if (digits.length === 10 && /^[26]/.test(digits)) return `30${digits}`
  return digits.length >= 11 ? digits : null
}

/** Opens each app with the number and the text filled in; the barber only presses send. */
export function messageLinks(phone: string, text: string): { viber: string; whatsapp: string; sms: string } | null {
  const number = internationalPhone(phone)
  if (!number) return null
  const body = encodeURIComponent(text)
  return {
    viber: `viber://chat?number=%2B${number}&draft=${body}`,
    whatsapp: `https://wa.me/${number}?text=${body}`,
    // "?&body=" is understood by both iPhone and Android messaging.
    sms: `sms:+${number}?&body=${body}`,
  }
}
