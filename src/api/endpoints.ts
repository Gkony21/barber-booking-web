import { api } from './client'
import type {
  AdminBarber,
  Appointment,
  Availability,
  Barber,
  BarberProfileInput,
  BarberStatus,
  Client,
  ClientCard,
  DayStatus,
  Photo,
  Role,
  ServiceInput,
  ServiceOffering,
  Shop,
  ShopInput,
  ShopInvitation,
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
  me: () => api<User>('/users/me'),
  updateMe: (body: { name: string; phoneNumber: string }) => api<User>('/users/me', { method: 'PUT', body }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ token: string }>('/users/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
  verifyEmail: (token: string) => api<void>('/auth/verify-email', { method: 'POST', body: { token } }),
  resendVerification: (email: string) =>
    api<void>('/auth/resend-verification', { method: 'POST', body: { email } }),
  forgotPassword: (email: string) => api<void>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api<void>('/auth/reset-password', { method: 'POST', body: { token, password } }),
}

export const barbersApi = {
  list: (filters: { city?: string; shopId?: number; availableToday?: boolean } = {}) => {
    const params = new URLSearchParams()
    if (filters.city) params.set('city', filters.city)
    if (filters.shopId) params.set('shopId', String(filters.shopId))
    if (filters.availableToday) params.set('availableToday', 'true')
    const query = params.toString()
    return api<Barber[]>(`/barbers${query ? `?${query}` : ''}`)
  },
  get: (id: number) => api<Barber>(`/barbers/${id}`),
  byLink: (slug: string) => api<Barber>(`/barbers/by-link/${encodeURIComponent(slug)}`),
  services: (id: number) => api<ServiceOffering[]>(`/barbers/${id}/services`),
  photos: (id: number) => api<Photo[]>(`/barbers/${id}/photos`),
  /** Open, full or closed for each day, for the chosen services. */
  days: (id: number, serviceId: number, extraIds: number[], from: string, to: string) => {
    const params = new URLSearchParams({ from, to, serviceId: String(serviceId) })
    if (extraIds.length) params.set('extraIds', extraIds.join(','))
    return api<{ date: string; status: DayStatus }[]>(`/barbers/${id}/days?${params}`)
  },
  availability: (id: number, serviceId: number, extraIds: number[], date: string) =>
    api<Availability>(
      `/barbers/${id}/availability?serviceId=${serviceId}${extraIds.length ? `&extraIds=${extraIds.join(',')}` : ''}&date=${date}`,
    ),
}

export const appointmentsApi = {
  book: (body: { barberId: number; serviceId: number; extraIds: number[]; startTime: string; note?: string }) =>
    api<Appointment>('/appointments', { method: 'POST', body }),
  mine: () => api<Appointment[]>('/appointments/me'),
  cancel: (id: number) => api<Appointment>(`/appointments/${id}/cancel`, { method: 'POST' }),
  /**
   * Picks a new time. A confirmed appointment of a barber who approves by hand keeps its time and
   * comes back with requestedStartTime until the barber answers.
   */
  reschedule: (id: number, startTime: string) =>
    api<Appointment>(`/appointments/${id}/reschedule`, { method: 'POST', body: { startTime } }),
  /** Takes back a change of time the barber has not answered; the appointment keeps its time. */
  withdrawChange: (id: number) => api<Appointment>(`/appointments/${id}/withdraw-change`, { method: 'POST' }),
  /** Days and free starts for moving this appointment; its own time counts as free. */
  moveDays: (id: number, from: string, to: string) =>
    api<{ date: string; status: DayStatus }[]>(`/appointments/${id}/days?from=${from}&to=${to}`),
  moveAvailability: (id: number, date: string) => api<Availability>(`/appointments/${id}/availability?date=${date}`),
}

/** Endpoints for the logged-in barber's own profile, schedule and bookings. */
export const barberMeApi = {
  profile: () => api<Barber>('/barbers/me'),
  createProfile: (body: BarberProfileInput) => api<Barber>('/barbers/me', { method: 'POST', body }),
  updateProfile: (body: BarberProfileInput) => api<Barber>('/barbers/me', { method: 'PUT', body }),

  /** Free quarter hours within working hours, for entering a booking by hand; `except` is one being moved. */
  availability: (minutes: number, date: string, except?: number) =>
    api<Availability>(`/barbers/me/availability?minutes=${minutes}&date=${date}${except ? `&except=${except}` : ''}`),
  bookManually: (body: {
    serviceId: number
    extraIds: number[]
    startTime: string
    customerName: string
    customerPhone?: string
    note?: string
  }) =>
    api<Appointment>('/barbers/me/appointments', { method: 'POST', body }),
  appointments: (from: string, to: string) => api<Appointment[]>(`/barbers/me/appointments?from=${from}&to=${to}`),
  /** Moves a confirmed appointment or changes its services (and, for one entered by hand, its details). */
  updateAppointment: (
    id: number,
    body: { serviceId: number; extraIds: number[]; startTime: string; customerName?: string; customerPhone?: string; note?: string },
  ) => api<Appointment>(`/barbers/me/appointments/${id}`, { method: 'PUT', body }),
  confirm: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/confirm`, { method: 'POST' }),
  reject: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/reject`, { method: 'POST' }),
  cancel: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/cancel`, { method: 'POST' }),
  noShow: (id: number) => api<Appointment>(`/barbers/me/appointments/${id}/no-show`, { method: 'POST' }),

  /** The barber's customers, newest first; with a query, those whose name or number matches. */
  clients: (query = '', limit?: number) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (limit) params.set('limit', String(limit))
    const search = params.toString()
    return api<Client[]>(`/barbers/me/clients${search ? `?${search}` : ''}`)
  },
  client: (key: string) => api<ClientCard>(`/barbers/me/clients/${encodeURIComponent(key)}`),
  saveClientNote: (key: string, note: string) =>
    api<Client>(`/barbers/me/clients/${encodeURIComponent(key)}/note`, { method: 'PUT', body: { note } }),

  services: () => api<ServiceOffering[]>('/barbers/me/services'),
  createService: (body: ServiceInput) => api<ServiceOffering>('/barbers/me/services', { method: 'POST', body }),
  updateService: (id: number, body: ServiceInput) =>
    api<ServiceOffering>(`/barbers/me/services/${id}`, { method: 'PUT', body }),
  hideService: (id: number) => api<void>(`/barbers/me/services/${id}/hide`, { method: 'POST' }),
  /** Shows this main service with its price on the barber's card in the list. */
  featureService: (id: number) => api<void>(`/barbers/me/services/${id}/feature`, { method: 'POST' }),
  /** Gone for good; appointments already booked keep their details. */
  deleteService: (id: number) => api<void>(`/barbers/me/services/${id}`, { method: 'DELETE' }),

  workingHours: () => api<WorkingHours[]>('/barbers/me/working-hours'),
  saveWorkingHours: (body: WorkingHours[]) =>
    api<WorkingHours[]>('/barbers/me/working-hours', { method: 'PUT', body }),

  setAvatar: (image: Blob) => api<Barber>('/barbers/me/avatar', { method: 'PUT', body: fileForm(image) }),
  removeAvatar: () => api<Barber>('/barbers/me/avatar', { method: 'DELETE' }),
  setCover: (image: Blob) => api<Barber>('/barbers/me/cover', { method: 'PUT', body: fileForm(image) }),
  removeCover: () => api<Barber>('/barbers/me/cover', { method: 'DELETE' }),
  photos: () => api<Photo[]>('/barbers/me/photos'),
  addPhoto: (image: Blob) => api<Photo>('/barbers/me/photos', { method: 'POST', body: fileForm(image) }),
  deletePhoto: (id: number) => api<void>(`/barbers/me/photos/${id}`, { method: 'DELETE' }),
  setCaption: (id: number, caption: string) =>
    api<Photo>(`/barbers/me/photos/${id}`, { method: 'PATCH', body: { caption } }),

  timeOff: () => api<TimeOff[]>('/barbers/me/time-off'),
  addTimeOff: (body: { startDate: string; endDate: string; reason: string | null; startTime?: string; endTime?: string }) =>
    api<TimeOff>('/barbers/me/time-off', { method: 'POST', body }),
  deleteTimeOff: (id: number) => api<void>(`/barbers/me/time-off/${id}`, { method: 'DELETE' }),

  invitations: () => api<ShopInvitation[]>('/barbers/me/invitations'),
  acceptInvitation: (id: number) => api<Shop>(`/barbers/me/invitations/${id}/accept`, { method: 'POST' }),
  declineInvitation: (id: number) => api<void>(`/barbers/me/invitations/${id}/decline`, { method: 'POST' }),
}

/** Shops: owners manage theirs and invite barbers; members can leave. */
export const shopsApi = {
  get: (id: number) => api<Shop>(`/shops/${id}`),
  create: (body: ShopInput) => api<Shop>('/shops', { method: 'POST', body }),
  update: (id: number, body: ShopInput) => api<Shop>(`/shops/${id}`, { method: 'PUT', body }),
  remove: (id: number) => api<void>(`/shops/${id}`, { method: 'DELETE' }),
  invite: (id: number, email: string) => api<ShopInvitation>(`/shops/${id}/invitations`, { method: 'POST', body: { email } }),
  invitations: (id: number) => api<ShopInvitation[]>(`/shops/${id}/invitations`),
  cancelInvitation: (id: number, invitationId: number) =>
    api<void>(`/shops/${id}/invitations/${invitationId}`, { method: 'DELETE' }),
  removeBarber: (id: number, barberId: number) => api<void>(`/shops/${id}/barbers/${barberId}`, { method: 'DELETE' }),
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
