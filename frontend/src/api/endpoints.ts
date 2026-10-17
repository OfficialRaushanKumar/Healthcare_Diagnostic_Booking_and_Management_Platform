import { api } from './client';
import type * as T from '../types';

const get = async <R,>(url: string, params?: object) => (await api.get<R>(url, { params })).data;

export const AuthApi = {
  login: async (email: string, password: string) => (await api.post<T.LoginResponse>('/auth/login/', { email, password })).data,
  register: async (b: { email: string; full_name: string; phone: string; password: string; confirm_password: string }) =>
    (await api.post('/auth/register/', b)).data,
  logout: (refresh: string) => api.post('/auth/logout/', { refresh }),
  me: () => get<T.User>('/auth/me/'),
  updateMe: async (b: Partial<Pick<T.User, 'full_name' | 'phone' | 'city'>>) => (await api.patch<T.User>('/auth/me/', b)).data,
};

export const CatalogApi = {
  cities: () => get<string[]>('/cities/'),
  centers: (p: Record<string, unknown>) => get<T.Paginated<T.Center>>('/centers/', p),
  center: (id: number) => get<T.Center>(`/centers/${id}/`),
  tests: (p: Record<string, unknown>) => get<T.Paginated<T.DiagTest>>('/tests/', p),
  test: (id: number) => get<T.DiagTest>(`/tests/${id}/`),
  dates: (center: number, service: number) =>
    get<{ dates: T.DateAvailability[]; timezone: string }>('/availability/', { center, service }),
  slots: (center: number, service: number, date: string) =>
    get<{ slots: T.SlotAvailability[]; price: string; timezone: string }>('/availability/', { center, service, date }),
};

export const AppointmentApi = {
  list: (p: Record<string, unknown>) => get<T.Paginated<T.Appointment>>('/appointments/', p),
  get: (id: number) => get<T.Appointment>(`/appointments/${id}/`),
  create: async (service_id: number, slot_id: number) => (await api.post<T.Appointment>('/appointments/', { service_id, slot_id })).data,
  cancel: async (id: number) => (await api.post<T.Appointment>(`/appointments/${id}/cancel/`)).data,
  dashboard: () => get<T.PatientDashboard>('/dashboard/patient/'),
};

export const PaymentApi = {
  createOrder: async (appointment_id: number) => (await api.post<T.CheckoutOrder>('/payments/create-order/', { appointment_id })).data,
  verify: async (b: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) =>
    (await api.post<T.VerifyResult>('/payments/verify/', b)).data,
  list: (p?: Record<string, unknown>) => get<T.Paginated<T.Payment>>('/payments/', p),
};

export const StaffApi = {
  dashboard: () => get<T.StaffDashboard>('/dashboard/staff/'),
  centers: () => get<T.StaffCenter[]>('/staff/centers/'),
  appointments: (p: Record<string, unknown>) => get<T.Paginated<T.Appointment>>('/staff/appointments/', p),
  appointment: (id: number) => get<T.Appointment>(`/staff/appointments/${id}/`),
  setStatus: async (id: number, status: 'COMPLETED' | 'CANCELLED' | 'REJECTED') =>
    (await api.post<T.Appointment>(`/staff/appointments/${id}/status/`, { status })).data,
  services: (p?: Record<string, unknown>) => get<T.Paginated<T.StaffService>>('/staff/services/', p),
  updateService: async (id: number, b: Partial<Pick<T.StaffService, 'price' | 'is_active'>>) =>
    (await api.patch<T.StaffService>(`/staff/services/${id}/`, b)).data,
  slots: (p: Record<string, unknown>) => get<T.Paginated<T.StaffSlot>>('/staff/slots/', p),
  createSlot: async (b: { center: number; date: string; start_time: string; end_time: string; capacity: number }) =>
    (await api.post<T.StaffSlot>('/staff/slots/', b)).data,
  updateSlot: async (id: number, b: Partial<Pick<T.StaffSlot, 'capacity' | 'is_active'>>) =>
    (await api.patch<T.StaffSlot>(`/staff/slots/${id}/`, b)).data,
};
