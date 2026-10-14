import { api } from './client'
import type {
  AdminBarber,
  Appointment,
  Availability,
  Barber,
  BarberProfileInput,
  BarberStatus,
  Role,
  ServiceInput,
  ServiceOffering,
  TimeOff,
  User,
  WorkingHours,
} from './types'

export const authApi = {
  login: (email: string, password: string) =>
    api<{ token: string }>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (body: { name: string; email: string; phoneNumber: string; password: string; role: Role }) =>
    api<User>('/auth/register', { method: 'POST', body }),
  verifyEmail: (token: string) => api<void>('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (email: string) =>
    api<void>('/auth/resend-verification', { method: 'POST', body: { email } }),
}

export const barbersApi = {
  list: (city?: string) => api<Barber[]>(`/barbers${city ? `?city=${encodeURIComponent(city)}` : ''}`),
  get: (id: number) => api<Barber>(`/barbers/${id}`),
  services: (id: number) => api<ServiceOffering[]>(`/barbers/${id}/services`),
  availability: (id: number, serviceId: number, date: string) =>
    api<Availability>(`/barbers/${id}/availability?serviceId=${serviceId}&date=${date}`),
}

export const appointmentsApi = {
  book: (body: { barberId: number; serviceId: number; startTime: string; note?: string }) =>
    api<Appointment>('/appointments', { method: 'POST', body }),
  mine: () => api<Appointment[]>('/appointments/me'),
  cancel: (id: number) => api<Appointment>(`/appointments/${id}/cancel`, { method: 'POST' }),
}

/** Endpoints for the logged-in barber's own profile, schedule and bookings. */
export const barberMeApi = {
  profile: () => api<Barber>('/barbers/me'),
  createProfile: (body: BarberProfileInput) => api<Barber>('/barbers/me', { method: 'POST', body }),
  updateProfile: (body: BarberProfileInput) => api<Barber>('/barbers/me', { method: 'PUT', body }),

  appointments: (from: string, to: string) => api<Appointment[]>(`/barbers/me/appointments?from=${from}&to=${to}`),
  confirm: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/confirm`, { method: 'POST' }),
  reject: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/reject`, { method: 'POST' }),
  cancel: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/cancel`, { method: 'POST' }),

  services: () => api<ServiceOffering[]>('/barbers/me/services'),
  createService: (body: ServiceInput) => api<ServiceOffering>('/barbers/me/services', { method: 'POST', body }),
  updateService: (id: number, body: ServiceInput) =>
    api<ServiceOffering>(`/barbers/me/services/${id}`, { method: 'PUT', body }),
  deactivateService: (id: number) => api<void>(`/barbers/me/services/${id}`, { method: 'DELETE' }),

  workingHours: () => api<WorkingHours[]>('/barbers/me/working-hours'),
  saveWorkingHours: (body: WorkingHours[]) =>
    api<WorkingHours[]>('/barbers/me/working-hours', { method: 'PUT', body }),

  timeOff: () => api<TimeOff[]>('/barbers/me/time-off'),
  addTimeOff: (body: { startDate: string; endDate: string; reason: string | null }) =>
    api<TimeOff>('/barbers/me/time-off', { method: 'POST', body }),
  deleteTimeOff: (id: number) => api<void>(`/barbers/me/time-off/${id}`, { method: 'DELETE' }),
}

export const adminApi = {
  barbers: (status: BarberStatus) => api<AdminBarber[]>(`/admin/barbers?status=${status}`),
  setStatus: (id: number, status: BarberStatus) =>
    api<AdminBarber>(`/admin/barbers/${id}/status`, { method: 'PATCH', body: { status } }),
}
