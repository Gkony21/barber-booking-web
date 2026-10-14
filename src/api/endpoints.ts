import { api } from './client'
import type {
  AdminBarber,
  Appointment,
  Availability,
  Barber,
  Photo,
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
  register: (body: { name: string; email: string; phoneNumber: string; password: string; role: Role; acceptTerms: boolean }) =>
    api<User>('/auth/register', { method: 'POST', body }),
  deleteAccount: (password: string) => api<void>('/users/me', { method: 'DELETE', body: { password } }),
  verifyEmail: (token: string) => api<void>('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (email: string) =>
    api<void>('/auth/resend-verification', { method: 'POST', body: { email } }),
  forgotPassword: (email: string) => api<void>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api<void>('/auth/reset-password', { method: 'POST', body: { token, password } }),
}

export const barbersApi = {
  list: (filters: { city?: string; availableToday?: boolean } = {}) => {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.availableToday) params.set('availableToday', 'true')
    const query = params.toString()
    return api<Barber[]>(`/barbers${query ? `?${query}` : ''}`)
  },
  get: (id: number) => api<Barber>(`/barbers/${id}`),
  byLink: (slug: string) => api<Barber>(`/barbers/by-link/${encodeURIComponent(slug)}`),
  services: (id: number) => api<ServiceOffering[]>(`/barbers/${id}/services`),
  photos: (id: number) => api<Photo[]>(`/barbers/${id}/photos`),
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

  bookManually: (body: { serviceId: number; startTime: string; customerName: string; customerPhone?: string; note?: string }) =>
    api<Appointment>('/barbers/me/appointments', { method: 'POST', body }),
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

  setAvatar: (image: Blob) => api<Barber>('/barbers/me/avatar', { method: 'PUT', body: fileForm(image) }),
  removeAvatar: () => api<Barber>('/barbers/me/avatar', { method: 'DELETE' }),
  photos: () => api<Photo[]>('/barbers/me/photos'),
  addPhoto: (image: Blob) => api<Photo>('/barbers/me/photos', { method: 'POST', body: fileForm(image) }),
  deletePhoto: (id: number) => api<void>(`/barbers/me/photos/${id}`, { method: 'DELETE' }),
  setCaption: (id: number, caption: string) =>
    api<Photo>(`/barbers/me/photos/${id}`, { method: 'PATCH', body: { caption } }),

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

function fileForm(image: Blob): FormData {
  const form = new FormData()
  form.append('file', image, 'photo.jpg')
  return form
}
