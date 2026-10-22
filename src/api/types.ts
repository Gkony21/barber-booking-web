// Shapes returned by barber-booking-api.

export type Role = 'CUSTOMER' | 'BARBER' | 'ADMIN'

/** EXPIRED: a request the barber did not answer in time, closed automatically. */
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'NO_SHOW'

export interface Barber {
  id: number
  /** Short public link, e.g. "giorgos" for /giorgos. */
  slug: string | null
  name: string
  avatarUrl: string | null
  bio: string | null
  experienceYears: number | null
  specialty: string | null
  address: string | null
  city: string | null
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED'
  autoConfirmBookings: boolean
  slotStepMinutes: 15 | 30
  /** How many days ahead customers can book: two weeks, a month or two months. */
  bookingWindowDays: BookingWindow
  /** Customers book at least this many minutes ahead. */
  minNoticeMinutes: MinNotice
  /** Kept free after each online booking. */
  bufferMinutes: Buffer
  shopId: number | null
  shopName: string | null
  /** The shop's address and city; customers find a barber in a shop there. */
  shopAddress: string | null
  shopCity: string | null
  coverUrl: string | null
  photoCount: number
  /** The service shown with its price on the card: the barber's pick, or their first main service. */
  featuredServiceName: string | null
  featuredPrice: number | null
  /** ISO time with offset of the first free start, or null when nothing is free in the booking window. */
  nextAvailable: string | null
}

export interface ServiceOffering {
  id: number
  name: string
  description: string | null
  durationMinutes: number
  price: number
  kind: ServiceKind
  active: boolean
  /** Shown with its price on the barber's card in the list. */
  featured: boolean
}

/** MAIN: a service or package, the customer picks one. EXTRA: added on top, any number. */
export type ServiceKind = 'MAIN' | 'EXTRA'

export interface Availability {
  barberId: number
  serviceId: number
  date: string
  durationMinutes: number
  startTimes: string[]
}

export interface Appointment {
  id: number
  barberId: number
  barberName: string
  /** Null for bookings the barber entered for a phone or walk-in customer. */
  customerId: number | null
  customerName: string
  customerPhone: string | null
  serviceId: number
  serviceName: string
  /** Added on top of the main service; durationMinutes and price are totals including them. */
  extras: { name: string; price: number; durationMinutes: number }[]
  durationMinutes: number
  price: number
  startTime: string
  endTime: string
  status: AppointmentStatus
  manual: boolean
  cancelledBy: 'CUSTOMER' | 'BARBER' | null
  note: string | null
  /** For the barber: how many times this customer did not turn up. */
  customerNoShows?: number
  /** A confirmed appointment the customer asked to move: the time asked for, until the barber answers. */
  requestedStartTime?: string | null
  /** On that request itself (barber's schedule): the confirmed time it would replace. */
  originalStartTime?: string | null
}

export interface User {
  id: number
  name: string
  email: string
  phoneNumber: string | null
  role: Role
}

export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'

export interface WorkingHours {
  dayOfWeek: DayOfWeek
  startTime: string // "HH:mm"
  endTime: string
}

export interface TimeOff {
  id: number
  startDate: string // "YYYY-MM-DD", inclusive
  endDate: string
  reason: string | null
  /** "HH:mm" for a block of hours on one day; null for whole days off. */
  startTime: string | null
  endTime: string | null
  activeAppointments: number
}

export interface BarberProfileInput {
  bio: string | null
  experienceYears: number | null
  specialty: string | null
  address: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
  autoConfirmBookings: boolean
  slotStepMinutes: 15 | 30
  bookingWindowDays: BookingWindow
  minNoticeMinutes: MinNotice
  bufferMinutes: Buffer
  slug?: string
}

export type BookingWindow = 14 | 30 | 60

/** OPEN: free times left. FULL: working, nothing left that fits. CLOSED: not working that day. */
export type DayStatus = 'OPEN' | 'FULL' | 'CLOSED'
export type MinNotice = 30 | 60 | 120
export type Buffer = 0 | 5 | 10 | 15

export interface Shop {
  id: number
  name: string
  address: string
  city: string
  phoneNumber: string | null
  ownerBarberId: number
}

export interface ShopInput {
  name: string
  address: string
  city: string
  phoneNumber: string | null
}

/** An owner's invitation for a barber to join their shop. */
export interface ShopInvitation {
  id: number
  shopId: number
  shopName: string
  shopAddress: string
  shopCity: string
  ownerName: string
  barberId: number
  barberName: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  createdAt: string
}

export interface ServiceInput {
  name: string
  description: string | null
  durationMinutes: number
  price: number
  kind: ServiceKind
}

export type BarberStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED'

/** A barber as an admin sees them, with contact details. */
export interface AdminBarber {
  id: number
  userId: number
  name: string
  avatarUrl: string | null
  email: string
  phoneNumber: string | null
  specialty: string | null
  address: string | null
  city: string | null
  shopName: string | null
  status: BarberStatus
  createdAt: string
}

export interface Photo {
  id: number
  url: string
  caption: string | null
}
