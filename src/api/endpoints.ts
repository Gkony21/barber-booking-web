import { api } from './client'
import type { Appointment, Availability, Barber, Role, ServiceOffering, User } from './types'

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
