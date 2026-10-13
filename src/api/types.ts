// Shapes returned by barber-booking-api.

export type Role = 'CUSTOMER' | 'BARBER' | 'ADMIN'

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED'

export interface Barber {
  id: number
  name: string
  bio: string | null
  experienceYears: number | null
  specialty: string | null
  address: string | null
  city: string | null
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED'
  autoConfirmBookings: boolean
  shopId: number | null
  shopName: string | null
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
  customerId: number
  customerName: string
  customerPhone: string | null
  serviceId: number
  serviceName: string
  durationMinutes: number
  price: number
  startTime: string
  endTime: string
  status: AppointmentStatus
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
