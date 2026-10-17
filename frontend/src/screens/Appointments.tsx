import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { toApiError } from '../api/client';
import { AppointmentApi, StaffApi } from '../api/endpoints';
import { AppointmentCard, Card, ChipRow, ConfirmationDialog, Divider, EmptyState, ErrorState, FilterChip, Header, LoadingSkeleton, PriceDisplay, PrimaryButton, Row, Screen, SearchBar, SecondaryButton, SectionHeader, StatusBadge, useToast } from '../components';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { colors, spacing, typography } from '../design-system/tokens';
import { formatDate, label, minutesLeft, TZ_LABEL, timeRange } from '../utils/format';

const WHEN = [
  { key: 'upcoming', label: 'Upcoming' }, { key: 'past', label: 'Past' }, { key: 'cancelled', label: 'Cancelled' },
] as const;

export function MyAppointmentsScreen() {
  const nav = useNavigation<any>();
  const [when, setWhen] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const { data, loading, error, reload, refresh, refreshing } = useApi(() => AppointmentApi.list({ when, page_size: 50, ordering: when === 'upcoming' ? 'slot__date' : '-slot__date' }), [when]);
  useFocusEffect(useCallback(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));
  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title="My appointments" back={false} />
      <ChipRow>{WHEN.map((w) => <FilterChip key={w.key} label={w.label} selected={when === w.key} onPress={() => setWhen(w.key)} />)}</ChipRow>
      <View style={{ height: spacing.md }} />
      {loading ? <LoadingSkeleton /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data?.results.length ? (
        <View style={{ gap: spacing.md }}>{data.results.map((a) => <AppointmentCard key={a.id} appt={a} onPress={() => nav.navigate('AppointmentDetail', { id: a.id })} />)}</View>
      ) : (
        <EmptyState icon="calendar-outline" title={`No ${when} appointments`} message={when === 'upcoming' ? 'Book a diagnostic test to see it here.' : 'Nothing to show in this list yet.'}
          action={when === 'upcoming' ? <PrimaryButton title="Find a center" onPress={() => nav.navigate('PatientTabs', { screen: 'Centers' })} /> : undefined} />
      )}
    </Screen>
  );
}

/** Shared detail screen. Patients get Cancel; staff get permitted status actions. Permissions are enforced by the API. */
export function AppointmentDetailScreen() {
  const nav = useNavigation<any>();
  const toast = useToast();
  const { user } = useAuth();
  const isStaff = user?.role === 'STAFF';
  const { id } = useRoute<any>().params as { id: number };
  const { data: a, loading, error, reload, refresh, refreshing } = useApi(() => (isStaff ? StaffApi.appointment(id) : AppointmentApi.get(id)), [id]);
  const [confirm, setConfirm] = useState<null | { kind: 'cancel' } | { kind: 'staff'; status: 'COMPLETED' | 'CANCELLED' | 'REJECTED' }>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === 'cancel') await AppointmentApi.cancel(id); else await StaffApi.setStatus(id, confirm.status);
      toast('Appointment updated', 'success'); setConfirm(null); reload();
    } catch (e) { toast(toApiError(e).message, 'error'); setConfirm(null); reload(); }
    finally { setBusy(false); }
  };
  const left = a ? minutesLeft(a.expires_at) : null;
  const staffActions: { label: string; status: 'COMPLETED' | 'CANCELLED' | 'REJECTED'; danger?: boolean }[] =
    !a ? [] : a.status === 'CONFIRMED' ? [{ label: 'Mark completed', status: 'COMPLETED' }, { label: 'Cancel appointment', status: 'CANCELLED', danger: true }, { label: 'Reject', status: 'REJECTED', danger: true }]
      : a.status === 'PENDING_PAYMENT' ? [{ label: 'Reject request', status: 'REJECTED', danger: true }] : [];

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title="Appointment" subtitle={a?.reference} />
      {loading ? <LoadingSkeleton rows={3} height={140} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : a ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={typography.heading}>{a.test.name}</Text><StatusBadge status={a.status} />
            </View>
            {a.status_reason ? <Text style={[typography.caption, { marginTop: 6 }]}>{a.status_reason}</Text> : null}
            <Divider />
            <Row label="Date" value={formatDate(a.slot.date)} />
            <Row label="Time" value={timeRange(a.slot.start_time, a.slot.end_time)} />
            <Row label="Time zone" value={TZ_LABEL} />
            <Row label="Reference" value={a.reference} />
          </Card>
          <SectionHeader title="Diagnostic center" />
          <Card><Text style={typography.cardTitle}>{a.center.name}</Text><Text style={typography.caption}>{a.center.address}, {a.center.city}</Text>{a.center.phone ? <Text style={[typography.caption, { marginTop: 4 }]}>{a.center.phone}</Text> : null}</Card>
          {isStaff && a.patient ? (<><SectionHeader title="Patient" /><Card><Row label="Name" value={a.patient.full_name} /><Row label="Email" value={a.patient.email} /><Row label="Phone" value={a.patient.phone || '—'} /></Card></>) : null}
          <SectionHeader title="Payment" />
          <Card>
            <Row label="Amount" strong value={<PriceDisplay amount={a.amount} />} />
            <Row label="Payment status" value={<StatusBadge status={a.payment_status} />} />
          </Card>
          {a.test.preparation ? (<><SectionHeader title="Preparation" /><Card><Text style={typography.body}>{a.test.preparation}</Text></Card></>) : null}
          <SectionHeader title="Cancellation policy" />
          <Card><Text style={typography.body}>Confirmed appointments can be cancelled online up to 4 hours before the slot. Unpaid bookings can be cancelled any time and expire automatically.</Text></Card>
          <View style={{ gap: spacing.sm, marginTop: spacing.xl }}>
            {!isStaff && a.status === 'PENDING_PAYMENT' && (left === null || left > 0) ? <PrimaryButton title="Complete payment" icon="card-outline" onPress={() => nav.navigate('Payment', { appointmentId: a.id })} /> : null}
            {!isStaff && a.can_cancel ? <SecondaryButton title="Cancel appointment" danger onPress={() => setConfirm({ kind: 'cancel' })} /> : null}
            {isStaff ? staffActions.map((x) => x.danger
              ? <SecondaryButton key={x.status} title={x.label} danger onPress={() => setConfirm({ kind: 'staff', status: x.status })} />
              : <PrimaryButton key={x.status} title={x.label} onPress={() => setConfirm({ kind: 'staff', status: x.status })} />) : null}
          </View>
        </>
      ) : null}
      <ConfirmationDialog visible={!!confirm} loading={busy} danger={confirm?.kind === 'cancel' || (confirm?.kind === 'staff' && confirm.status !== 'COMPLETED')}
        title={confirm?.kind === 'cancel' ? 'Cancel this appointment?' : `${confirm?.kind === 'staff' ? label(confirm.status) : ''} this appointment?`}
        message={confirm?.kind === 'cancel' ? 'Your slot will be released. If you already paid, a refund must be processed by the center.' : 'The patient will be notified of this change.'}
        confirmLabel={confirm?.kind === 'cancel' ? 'Yes, cancel' : 'Confirm'} cancelLabel="Go back" onConfirm={run} onCancel={() => setConfirm(null)} />
    </Screen>
  );
}
