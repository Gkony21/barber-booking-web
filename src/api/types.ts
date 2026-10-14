// Shapes returned by barber-booking-api.

export type Role = 'CUSTOMER' | 'BARBER' | 'ADMIN'

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED'

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
  shopId: number | null
  shopName: string | null
  coverUrl: string | null
  photoCount: number
  fromPrice: number | null
  /** ISO time with offset of the first free start, or null when nothing is free in the booking window. */
  nextAvailable: string | null
}

export interface ServiceOffering {
  id: number
  name: string
  description: string | null
  durationMinutes: number
  price: number
  active: boolean
}

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
  durationMinutes: number
  price: number
  startTime: string
  endTime: string
  status: AppointmentStatus
  manual: boolean
  cancelledBy: 'CUSTOMER' | 'BARBER' | null
  note: string | null
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
  slug?: string
}

export interface ServiceInput {
  name: string
  description: string | null
  durationMinutes: number
  price: number
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
