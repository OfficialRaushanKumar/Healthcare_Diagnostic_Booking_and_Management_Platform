export type Role = 'PATIENT' | 'STAFF' | 'ADMIN';
export type Category = 'PATHOLOGY' | 'RADIOLOGY' | 'PREVENTIVE' | 'GENERAL';
export type AppointmentStatus = 'PENDING_PAYMENT' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED' | 'EXPIRED';
export type PaymentStatus = 'NONE' | 'CREATED' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[] }

export interface User {
  id: number; email: string; full_name: string; phone: string; role: Role;
  date_of_birth: string | null; gender: string; city: string;
}
export interface LoginResponse { access: string; refresh: string; user: User }

export interface Center {
  id: number; name: string; city: string; address: string; phone: string; email: string;
  opening_time: string; closing_time: string; description: string; is_demo: boolean;
  starting_price: string | null; services_count: number; services?: CenterService[];
}
export interface CenterService {
  id: number; test_id: number; name: string; category: Category; description: string;
  preparation: string; turnaround_hours: number | null; price: string;
}
export interface DiagTest {
  id: number; name: string; category: Category; description: string; preparation: string;
  turnaround_hours: number | null; min_price: string | null; centers_count: number;
  centers?: { service_id: number; center_id: number; center_name: string; city: string; address: string; price: string }[];
}
export interface DateAvailability { date: string; available_slots: number }
export interface SlotAvailability {
  id: number; date: string; start_time: string; end_time: string; capacity: number; remaining: number; available: boolean;
}
export interface Appointment {
  id: number; reference: string; status: AppointmentStatus; status_reason: string; amount: string;
  expires_at: string | null; created_at: string;
  center: { id: number; name: string; city: string; address: string; phone: string };
  slot: { id: number; date: string; start_time: string; end_time: string };
  test: { id: number; name: string; category: Category; preparation: string; turnaround_hours: number | null };
  service_id: number; payment_status: PaymentStatus; can_cancel: boolean;
  patient: { id: number; full_name: string; email: string; phone: string } | null;
}
export interface Payment {
  id: number; appointment_id: number; appointment_reference: string; appointment_status: AppointmentStatus;
  razorpay_order_id: string; razorpay_payment_id: string; amount: string; currency: string;
  status: PaymentStatus; failure_reason: string; paid_at: string | null; created_at: string;
}
export interface PatientDashboard {
  upcoming_appointment: Appointment | null; counts: Record<string, number>; payments_total: number;
}
export interface StaffDashboard {
  centers: number[]; today: Appointment[]; upcoming_count: number; pending_count: number;
  status_distribution: Record<string, number>; recent_activity: Appointment[];
}
export interface StaffService { id: number; center: number; center_name: string; test: number; test_name: string; price: string; is_active: boolean }
export interface StaffSlot { id: number; center: number; date: string; start_time: string; end_time: string; capacity: number; is_active: boolean; booked: number }
export interface StaffCenter { id: number; name: string; city: string }
export interface CheckoutOrder { payment_id: number; key_id: string; razorpay_order_id: string; amount: number; currency: string; appointment_reference: string }
export interface VerifyResult { payment_status: PaymentStatus; appointment_status: AppointmentStatus; appointment_id: number; refund_required: boolean }
