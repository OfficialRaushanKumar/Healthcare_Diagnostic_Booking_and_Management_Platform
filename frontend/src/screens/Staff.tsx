import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { toApiError } from '../api/client';
import { StaffApi } from '../api/endpoints';
import { AppointmentCard, Card, ChipRow, EmptyState, ErrorState, FilterChip, Header, LoadingSkeleton, PrimaryButton, Screen, SearchBar, SecondaryButton, SectionHeader, StatusBadge, useToast } from '../components';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { colors, fonts, radii, spacing, typography } from '../design-system/tokens';
import type { StaffService, StaffSlot } from '../types';
import { formatDate, formatTime, isoDate, label } from '../utils/format';

const STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'] as const;

export function StaffDashboardScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { data: d, loading, error, reload, refresh, refreshing } = useApi(() => StaffApi.dashboard(), []);
  useFocusEffect(useCallback(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));
  const total = d ? Object.values(d.status_distribution).reduce((a, b) => a + b, 0) : 0;
  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title="Dashboard" subtitle={`Welcome, ${user?.full_name}`} back={false} />
      {loading ? <LoadingSkeleton rows={3} height={110} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : d ? (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Stat icon="today-outline" value={d.today.length} text="Today" />
            <Stat icon="calendar-outline" value={d.upcoming_count} text="Upcoming" />
            <Stat icon="hourglass-outline" value={d.pending_count} text="Pending" tone={colors.warning} />
          </View>
          <SectionHeader title="Status overview" />
          <Card>
            {total === 0 ? <Text style={typography.body}>No appointments recorded for your centers yet.</Text> : STATUSES.filter((s) => d.status_distribution[s]).map((s) => (
              <View key={s} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}><StatusBadge status={s} /><Text style={typography.label}>{d.status_distribution[s]}</Text></View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EAF0F8' }}>
                  <View style={{ height: 8, borderRadius: 4, width: `${(d.status_distribution[s] / total) * 100}%`, backgroundColor: colors.primary }} />
                </View>
              </View>
            ))}
          </Card>
          <SectionHeader title="Quick actions" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}><PrimaryButton title="Appointments" icon="list" onPress={() => nav.navigate('StaffAppointments')} /></View>
            <View style={{ flex: 1 }}><SecondaryButton title="Services" icon="settings-outline" onPress={() => nav.navigate('StaffServices')} /></View>
          </View>
          <SectionHeader title="Today's appointments" />
          <View style={{ gap: spacing.md }}>
            {d.today.length ? d.today.map((a) => <AppointmentCard key={a.id} appt={a} showPatient onPress={() => nav.navigate('AppointmentDetail', { id: a.id })} />)
              : <EmptyState icon="sunny-outline" title="Nothing scheduled today" />}
          </View>
          <SectionHeader title="Recent activity" />
          <View style={{ gap: spacing.md }}>
            {d.recent_activity.length ? d.recent_activity.map((a) => <AppointmentCard key={a.id} appt={a} showPatient onPress={() => nav.navigate('AppointmentDetail', { id: a.id })} />)
              : <EmptyState icon="pulse-outline" title="No activity yet" />}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const Stat = ({ icon, value, text, tone = colors.primary }: { icon: keyof typeof Ionicons.glyphMap; value: number; text: string; tone?: string }) => (
  <Card style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
    <Ionicons name={icon} size={22} color={tone} />
    <Text style={[typography.title, { marginTop: 4 }]}>{value}</Text>
    <Text style={typography.caption}>{text}</Text>
  </Card>
);

export function StaffAppointmentsScreen() {
  const nav = useNavigation<any>();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string | undefined>();
  const [dq, setDq] = useState('');
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const { data, loading, error, reload, refresh, refreshing } = useApi(() => StaffApi.appointments({ search: dq || undefined, status, page_size: 50, ordering: '-slot__date' }), [dq, status]);
  useFocusEffect(useCallback(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));
  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title="Appointments" back={false} />
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by name, email, reference or test" />
      <ChipRow>
        <FilterChip label="All" selected={!status} onPress={() => setStatus(undefined)} />
        {STATUSES.map((s) => <FilterChip key={s} label={label(s)} selected={status === s} onPress={() => setStatus(status === s ? undefined : s)} />)}
      </ChipRow>
      <View style={{ height: spacing.md }} />
      {loading ? <LoadingSkeleton /> : error ? <ErrorState message={error.message} onRetry={reload} /> : data?.results.length ? (
        <View style={{ gap: spacing.md }}>{data.results.map((a) => <AppointmentCard key={a.id} appt={a} showPatient onPress={() => nav.navigate('AppointmentDetail', { id: a.id })} />)}</View>
      ) : <EmptyState icon="people-outline" title="No appointments found" message="Adjust the search or filters." />}
    </Screen>
  );
}

export function StaffServicesScreen() {
  const [tab, setTab] = useState<'services' | 'slots'>('services');
  return (
    <Screen>
      <Header title="Services & availability" back={false} />
      <View style={{ flexDirection: 'row', backgroundColor: '#E8EEF7', borderRadius: radii.md, padding: 4, marginBottom: spacing.lg }}>
        {(['services', 'slots'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}
            style={{ flex: 1, minHeight: 40, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === t ? colors.surface : 'transparent' }}>
            <Text style={[typography.label, { color: tab === t ? colors.navy900 : colors.textMuted }]}>{t === 'services' ? 'Services & prices' : 'Availability'}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'services' ? <ServicesPanel /> : <SlotsPanel />}
    </Screen>
  );
}

function ServicesPanel() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi(() => StaffApi.services({ page_size: 100 }), []);
  if (loading) return <LoadingSkeleton rows={3} height={110} />;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data?.results.length) return <EmptyState icon="flask-outline" title="No services yet" message="Ask an administrator to add services for your center." />;
  return <View style={{ gap: spacing.md }}>{data.results.map((s) => <ServiceRow key={s.id} s={s} onError={(m) => toast(m, 'error')} onSaved={() => toast('Service updated', 'success')} />)}</View>;
}

function ServiceRow({ s, onError, onSaved }: { s: StaffService; onError: (m: string) => void; onSaved: () => void }) {
  const [price, setPrice] = useState(String(Number(s.price)));
  const [active, setActive] = useState(s.is_active);
  const [saving, setSaving] = useState(false);
  const dirty = Number(price) !== Number(s.price);
  const patch = async (b: { price?: string; is_active?: boolean }, rollback?: () => void) => {
    setSaving(true);
    try { const r = await StaffApi.updateService(s.id, b); s.price = r.price; s.is_active = r.is_active; onSaved(); }
    catch (e) { onError(toApiError(e).message); rollback?.(); } finally { setSaving(false); }
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}><Text style={typography.cardTitle}>{s.test_name}</Text><Text style={typography.caption}>{s.center_name}</Text></View>
        <Switch value={active} accessibilityLabel={`${s.test_name} active`} trackColor={{ true: colors.teal, false: colors.border }}
          onValueChange={(v) => { setActive(v); patch({ is_active: v }, () => setActive(!v)); }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
        <Text style={typography.price}>₹</Text>
        <TextInput value={price} onChangeText={(t) => setPrice(t.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" accessibilityLabel={`Price for ${s.test_name}`}
          style={{ flex: 1, minHeight: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, fontFamily: fonts.medium, fontSize: 16 }} />
        <PrimaryButton title="Save" disabled={!dirty || !price} loading={saving} style={{ minHeight: 44, paddingHorizontal: spacing.lg }}
          onPress={() => patch({ price: Number(price).toFixed(2) })} />
      </View>
      <Text style={[typography.caption, { marginTop: 6 }]}>{active ? 'Visible to patients' : 'Hidden: patients cannot book this test here'}. Price changes apply to new bookings only.</Text>
    </Card>
  );
}

function SlotsPanel() {
  const toast = useToast();
  const centers = useApi(() => StaffApi.centers(), []);
  const [center, setCenter] = useState<number | null>(null);
  const days = Array.from({ length: 8 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return isoDate(d); });
  const [date, setDate] = useState(days[0]);
  const [hour, setHour] = useState<number | null>(null);
  const [cap, setCap] = useState(2);
  const [creating, setCreating] = useState(false);
  useEffect(() => { if (center === null && centers.data?.length) setCenter(centers.data[0].id); }, [centers.data, center]);
  const slots = useApi(() => (center ? StaffApi.slots({ center, date, page_size: 50 }) : Promise.resolve(null)), [center, date]);

  const create = async () => {
    if (!center || hour === null) return;
    setCreating(true);
    try {
      await StaffApi.createSlot({ center, date, start_time: `${String(hour).padStart(2, '0')}:00`, end_time: `${String(hour + 1).padStart(2, '0')}:00`, capacity: cap });
      toast('Slot created', 'success'); setHour(null); slots.reload();
    } catch (e) { toast(toApiError(e).message, 'error'); } finally { setCreating(false); }
  };

  if (centers.loading) return <LoadingSkeleton rows={2} />;
  if (centers.error) return <ErrorState message={centers.error.message} onRetry={centers.reload} />;
  if (!centers.data?.length) return <EmptyState icon="business-outline" title="No centers assigned" message="An administrator needs to assign you to a center." />;
  return (
    <View>
      {centers.data.length > 1 ? <ChipRow>{centers.data.map((c) => <FilterChip key={c.id} label={c.name} selected={center === c.id} onPress={() => setCenter(c.id)} />)}</ChipRow> : <Text style={typography.cardTitle}>{centers.data[0].name}</Text>}
      <ChipRow>{days.map((d) => <FilterChip key={d} label={formatDate(d, { weekday: 'short', day: 'numeric', month: 'short' })} selected={d === date} onPress={() => setDate(d)} />)}</ChipRow>
      <SectionHeader title={`Slots on ${formatDate(date, { day: 'numeric', month: 'short' })}`} />
      {slots.loading ? <LoadingSkeleton rows={2} height={90} /> : slots.error ? <ErrorState message={slots.error.message} onRetry={slots.reload} /> :
        slots.data?.results.length ? <View style={{ gap: spacing.md }}>{slots.data.results.map((s) => <SlotRow key={s.id} s={s} onChanged={slots.reload} />)}</View>
          : <EmptyState icon="time-outline" title="No slots on this day" message="Add one below." />}
      <SectionHeader title="Add a slot" />
      <Card>
        <Text style={typography.label}>Start time (1-hour slot)</Text>
        <ChipRow>{[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((h) => <FilterChip key={h} label={formatTime(`${h}:00`)} selected={hour === h} onPress={() => setHour(h)} />)}</ChipRow>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: spacing.md }}>
          <Text style={typography.label}>Capacity</Text><Stepper value={cap} min={1} onChange={setCap} label="slot capacity" />
        </View>
        <PrimaryButton title="Create slot" disabled={hour === null} loading={creating} onPress={create} />
      </Card>
    </View>
  );
}

function SlotRow({ s, onChanged }: { s: StaffSlot; onChanged: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const patch = async (b: { capacity?: number; is_active?: boolean }) => {
    setBusy(true);
    try { await StaffApi.updateSlot(s.id, b); onChanged(); } catch (e) { toast(toApiError(e).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View><Text style={typography.cardTitle}>{formatTime(s.start_time)} – {formatTime(s.end_time)}</Text><Text style={typography.caption}>{s.booked} booked of {s.capacity}</Text></View>
        <Switch value={s.is_active} disabled={busy} accessibilityLabel="Slot active" trackColor={{ true: colors.teal, false: colors.border }} onValueChange={(v) => patch({ is_active: v })} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md }}>
        <Text style={typography.label}>Capacity</Text>
        <Stepper value={s.capacity} min={Math.max(1, s.booked)} disabled={busy} onChange={(v) => patch({ capacity: v })} label="capacity" />
      </View>
      {s.booked > 0 ? <Text style={[typography.caption, { marginTop: 6 }]}>Capacity can't go below existing bookings, and slots with bookings can't be deactivated.</Text> : null}
    </Card>
  );
}

function Stepper({ value, min, onChange, label: l, disabled }: { value: number; min: number; onChange: (v: number) => void; label: string; disabled?: boolean }) {
  const b = (icon: 'remove' | 'add', next: number, off: boolean) => (
    <Pressable onPress={() => onChange(next)} disabled={off || disabled} accessibilityRole="button" accessibilityLabel={`${icon === 'add' ? 'Increase' : 'Decrease'} ${l}`}
      style={{ width: 44, height: 44, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: off || disabled ? 0.4 : 1 }}>
      <Ionicons name={icon} size={20} color={colors.navy900} />
    </Pressable>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      {b('remove', value - 1, value <= min)}<Text style={[typography.heading, { minWidth: 28, textAlign: 'center' }]}>{value}</Text>{b('add', value + 1, value >= 50)}
    </View>
  );
}
