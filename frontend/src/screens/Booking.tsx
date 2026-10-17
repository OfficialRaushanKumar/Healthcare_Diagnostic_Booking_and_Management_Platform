import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { toApiError } from '../api/client';
import { AppointmentApi, CatalogApi, PaymentApi } from '../api/endpoints';
import { AvailabilitySlot, BookingSummaryCard, Card, ChipRow, EmptyState, ErrorState, Header, LoadingSkeleton, PriceDisplay, PrimaryButton, Row, Screen, SecondaryButton, SectionHeader, StatusBadge, useToast } from '../components';
import RazorpayCheckout, { CheckoutResult } from '../components/RazorpayCheckout';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { colors, radii, spacing, typography } from '../design-system/tokens';
import type { CheckoutOrder, SlotAvailability } from '../types';
import { formatDate, label, minutesLeft, TZ_LABEL, timeRange } from '../utils/format';
import { Pressable } from 'react-native';

interface BookParams { centerId: number; centerName: string; serviceId: number; testName: string; price: string }

export function SelectSlotScreen() {
  const nav = useNavigation<any>();
  const p = useRoute<any>().params as BookParams;
  const dates = useApi(() => CatalogApi.dates(p.centerId, p.serviceId), [p.centerId, p.serviceId]);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotAvailability | null>(null);
  const slots = useApi(() => (date ? CatalogApi.slots(p.centerId, p.serviceId, date) : Promise.resolve(null)), [date]);

  useEffect(() => { if (!date && dates.data?.dates.length) setDate(dates.data.dates[0].date); }, [dates.data, date]);
  useEffect(() => { setSlot(null); }, [date]);

  return (
    <Screen onRefresh={() => { dates.refresh(); slots.refresh(); }} refreshing={dates.refreshing || slots.refreshing}
      footer={<PrimaryButton title="Continue" disabled={!slot} accessibilityHint="Review your booking" onPress={() => slot && nav.navigate('BookingSummary', { ...p, slot, date })} />}>
      <Header title="Choose date & time" subtitle={`${p.testName} · ${p.centerName}`} />
      <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Text style={typography.cardTitle}>{p.testName}</Text><Text style={typography.caption}>{p.centerName}</Text></View>
        <PriceDisplay amount={p.price} />
      </Card>
      <SectionHeader title="Available dates" />
      {dates.loading ? <LoadingSkeleton rows={1} height={72} /> : dates.error ? <ErrorState message={dates.error.message} onRetry={dates.reload} /> :
        !dates.data?.dates.length ? <EmptyState icon="calendar-outline" title="No upcoming availability" message="This center has no open slots right now. Please check back later or try another center." /> : (
          <ChipRow>
            {dates.data.dates.map((d) => {
              const on = d.date === date;
              return (
                <Pressable key={d.date} onPress={() => setDate(d.date)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  accessibilityLabel={`${formatDate(d.date)}, ${d.available_slots} slots`}
                  style={{ width: 72, paddingVertical: spacing.md, borderRadius: radii.md, alignItems: 'center', backgroundColor: on ? colors.navy900 : colors.surface, borderWidth: 1.5, borderColor: on ? colors.navy900 : colors.border }}>
                  <Text style={[typography.caption, { color: on ? '#B8C7E6' : colors.textMuted }]}>{formatDate(d.date, { weekday: 'short' })}</Text>
                  <Text style={[typography.heading, { color: on ? colors.white : colors.text }]}>{formatDate(d.date, { day: 'numeric' })}</Text>
                  <Text style={[typography.caption, { color: on ? '#B8C7E6' : colors.textMuted }]}>{formatDate(d.date, { month: 'short' })}</Text>
                  <Text style={[typography.badge, { color: on ? colors.white : colors.teal, marginTop: 2 }]}>{d.available_slots} open</Text>
                </Pressable>
              );
            })}
          </ChipRow>
        )}
      {date ? (
        <>
          <SectionHeader title="Available times" />
          <Text style={[typography.caption, { marginTop: -spacing.sm, marginBottom: spacing.md }]}>Times shown in {TZ_LABEL}</Text>
          {slots.loading ? <LoadingSkeleton rows={2} height={56} /> : slots.error ? <ErrorState message={slots.error.message} onRetry={slots.reload} /> : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-start' }}>
              {slots.data?.slots.length ? slots.data.slots.map((s) => <AvailabilitySlot key={s.id} slot={s} selected={slot?.id === s.id} onPress={() => setSlot(s)} />)
                : <EmptyState icon="time-outline" title="No times on this day" />}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

export function BookingSummaryScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();
  const p = useRoute<any>().params as BookParams & { slot: SlotAvailability; date: string };
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const confirm = async () => {
    setBusy(true); setErr('');
    try {
      // Revalidate: availability may have changed since the slot list was shown.
      const fresh = await CatalogApi.slots(p.centerId, p.serviceId, p.date);
      const s = fresh.slots.find((x) => x.id === p.slot.id);
      if (!s || !s.available) { setErr('Sorry, that slot was just taken. Please pick another time.'); toast('Slot no longer available', 'error'); nav.goBack(); return; }
      const appt = await AppointmentApi.create(p.serviceId, p.slot.id);
      nav.replace('Payment', { appointmentId: appt.id });
    } catch (e) {
      const x = toApiError(e);
      setErr(x.message); toast(x.message, 'error');
      if (x.status === 409) nav.goBack();
    } finally { setBusy(false); }
  };

  return (
    <Screen footer={<PrimaryButton title="Confirm booking" icon="lock-closed" loading={busy} onPress={confirm} />}>
      <Header title="Review booking" subtitle="Check the details before you continue" />
      <BookingSummaryCard center={p.centerName} testName={p.testName} date={p.date} start={p.slot.start_time} end={p.slot.end_time}
        price={p.price} patient={{ name: user?.full_name ?? '', email: user?.email ?? '' }} />
      {err ? <Text style={[typography.error, { marginTop: spacing.md }]} accessibilityLiveRegion="polite">{err}</Text> : null}
      <SectionHeader title="Good to know" />
      <Card>
        <Policy icon="timer-outline" text="Your slot is held for 15 minutes while you pay. Unpaid bookings expire automatically." />
        <Policy icon="close-circle-outline" text="Free cancellation up to 4 hours before your appointment. Later cancellations are not allowed online." />
        <Policy icon="pricetag-outline" text="The final amount is calculated and verified by our servers when you confirm." />
      </Card>
    </Screen>
  );
}

const Policy = ({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) => (
  <View style={{ flexDirection: 'row', gap: spacing.md, paddingVertical: 6 }}>
    <Ionicons name={icon} size={20} color={colors.teal} /><Text style={[typography.body, { flex: 1 }]}>{text}</Text>
  </View>
);

export function PaymentScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();
  const { appointmentId } = useRoute<any>().params as { appointmentId: number };
  const { data: a, loading, error, reload } = useApi(() => AppointmentApi.get(appointmentId), [appointmentId]);
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<'idle' | 'verifying' | 'failed'>('idle');
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const start = async () => {
    setBusy(true); setMsg(''); setState('idle');
    try { const o = await PaymentApi.createOrder(appointmentId); setOrder(o); setOpen(true); }
    catch (e) {
      const x = toApiError(e); setMsg(x.message); setState('failed');
      if (x.status === 409) reload();
    } finally { setBusy(false); }
  };

  const onSuccess = async (r: CheckoutResult) => {
    setOpen(false); setState('verifying');
    try {
      // The server verifies the signature. We never mark anything paid on the client.
      await PaymentApi.verify(r);
      nav.replace('Confirmation', { appointmentId });
    } catch (e) { setMsg(toApiError(e).message + ' If money was deducted, check My appointments shortly: the webhook may still confirm it.'); setState('failed'); }
  };

  const left = a ? minutesLeft(a.expires_at) : null;
  const payable = a?.status === 'PENDING_PAYMENT' && (left === null || left > 0);
  return (
    <Screen footer={a ? (payable
      ? <PrimaryButton title={state === 'failed' ? 'Retry payment' : `Pay ₹${Number(a.amount).toLocaleString('en-IN')}`} icon="card-outline" loading={busy || state === 'verifying'} onPress={start} />
      : <PrimaryButton title="View appointment" onPress={() => nav.replace('Confirmation', { appointmentId })} />) : undefined}>
      <Header title="Payment" subtitle="Secure checkout in test mode" />
      {loading ? <LoadingSkeleton rows={2} height={140} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : a ? (
        <>
          <Card>
            <Text style={typography.cardTitle}>{a.test.name}</Text>
            <Text style={typography.caption}>{a.center.name}</Text>
            <View style={{ height: spacing.md }} />
            <Row label="Date" value={formatDate(a.slot.date)} />
            <Row label="Time" value={timeRange(a.slot.start_time, a.slot.end_time)} />
            <Row label="Reference" value={a.reference} />
            <Row label="Booking status" value={<StatusBadge status={a.status} />} />
            <Row label="Payment status" value={<StatusBadge status={a.payment_status} />} />
            <Row label="Amount payable" strong value={<PriceDisplay amount={a.amount} />} />
          </Card>
          {payable && left !== null ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: spacing.lg, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: radii.md }}>
              <Ionicons name="timer-outline" size={20} color={colors.warning} />
              <Text style={[typography.label, { color: colors.warning, flex: 1 }]}>Slot held for {left} more {left === 1 ? 'minute' : 'minutes'}</Text>
            </View>
          ) : null}
          {!payable ? <View style={{ marginTop: spacing.lg }}><Text style={[typography.body, { color: colors.textMuted }]}>This booking is {label(a.status).toLowerCase()}, so payment is not required.</Text></View> : null}
          {state === 'verifying' ? <Text style={[typography.label, { marginTop: spacing.lg, color: colors.primary }]} accessibilityLiveRegion="polite">Verifying your payment with the server…</Text> : null}
          {msg ? (
            <View accessibilityRole="alert" style={{ marginTop: spacing.lg, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radii.md }}>
              <Text style={[typography.label, { color: colors.danger }]}>{msg}</Text>
            </View>
          ) : null}
          <Text style={[typography.caption, { marginTop: spacing.lg }]}>Test mode: use Razorpay's test card or UPI details. No real money is charged. Payment is confirmed only after server-side verification.</Text>
        </>
      ) : null}
      <RazorpayCheckout visible={open} order={order} prefill={{ name: user?.full_name ?? '', email: user?.email ?? '', contact: user?.phone ?? '' }}
        onSuccess={onSuccess} onDismiss={() => { setOpen(false); toast('Payment window closed', 'info'); }}
        onFailure={(r) => { setOpen(false); setMsg(r); setState('failed'); }} />
    </Screen>
  );
}

export function ConfirmationScreen() {
  const nav = useNavigation<any>();
  const { appointmentId } = useRoute<any>().params as { appointmentId: number };
  const { data: a, loading, error, reload } = useApi(() => AppointmentApi.get(appointmentId), [appointmentId]);
  // Shows exactly what the backend reports. Never an assumed success.
  const tone = !a ? null : a.status === 'CONFIRMED' || a.status === 'COMPLETED'
    ? { icon: 'checkmark-circle' as const, c: colors.success, bg: colors.successSoft, title: 'Appointment confirmed', sub: 'Your payment was verified and your slot is booked.' }
    : a.status === 'PENDING_PAYMENT'
      ? { icon: 'time' as const, c: colors.warning, bg: colors.warningSoft, title: 'Awaiting payment', sub: 'We have not received a verified payment yet. If you already paid, this can take a moment.' }
      : { icon: 'close-circle' as const, c: colors.danger, bg: colors.dangerSoft, title: `Appointment ${label(a.status).toLowerCase()}`, sub: a.status_reason || 'This booking is not active.' };
  const goHome = () => nav.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'PatientTabs' }] }));
  return (
    <Screen edges={['top', 'bottom']} footer={<View style={{ gap: spacing.sm }}>
      <PrimaryButton title="View appointment" onPress={() => nav.dispatch(CommonActions.reset({ index: 1, routes: [{ name: 'PatientTabs' }, { name: 'AppointmentDetail', params: { id: appointmentId } }] }))} />
      <SecondaryButton title="Back to home" onPress={goHome} />
    </View>}>
      <Header title="Booking status" back={false} />
      {loading ? <LoadingSkeleton rows={2} height={160} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : a && tone ? (
        <>
          <View style={{ alignItems: 'center', backgroundColor: tone.bg, borderRadius: radii.xl, padding: spacing.xl }} accessibilityLiveRegion="polite">
            <Ionicons name={tone.icon} size={64} color={tone.c} />
            <Text style={[typography.title, { textAlign: 'center', marginTop: spacing.md }]}>{tone.title}</Text>
            <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginTop: 6 }]}>{tone.sub}</Text>
          </View>
          <View style={{ height: spacing.lg }} />
          <Card>
            <Row label="Booking reference" strong value={a.reference} />
            <Row label="Center" value={a.center.name} />
            <Row label="Test" value={a.test.name} />
            <Row label="Date" value={formatDate(a.slot.date)} />
            <Row label="Time" value={timeRange(a.slot.start_time, a.slot.end_time)} />
            <Row label="Appointment" value={<StatusBadge status={a.status} />} />
            <Row label="Payment" value={<StatusBadge status={a.payment_status} />} />
          </Card>
          {a.status === 'PENDING_PAYMENT' ? <View style={{ marginTop: spacing.lg }}><SecondaryButton title="Go to payment" onPress={() => nav.replace('Payment', { appointmentId })} /></View> : null}
        </>
      ) : null}
    </Screen>
  );
}
