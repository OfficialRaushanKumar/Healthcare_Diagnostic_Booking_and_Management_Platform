import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii, spacing, typography } from '../design-system/tokens';
import type { Appointment, Category, Center, CenterService, DiagTest, SlotAvailability } from '../types';
import { formatDate, formatTime, label, TZ_LABEL, timeRange } from '../utils/format';
import { PrimaryButton } from './Buttons';
import { StatusBadge } from './Feedback';
import { Card, Divider, PriceDisplay, Row } from './Layout';

export const CATEGORY_META: Record<Category, { icon: keyof typeof Ionicons.glyphMap; name: string; tint: string; bg: string }> = {
  PATHOLOGY: { icon: 'flask-outline', name: 'Pathology', tint: colors.primary, bg: colors.primarySoft },
  RADIOLOGY: { icon: 'scan-outline', name: 'Radiology', tint: '#6D3FC4', bg: '#EFE8FB' },
  PREVENTIVE: { icon: 'shield-checkmark-outline', name: 'Preventive', tint: colors.teal, bg: colors.tealSoft },
  GENERAL: { icon: 'pulse-outline', name: 'General', tint: '#B45309', bg: colors.warningSoft },
};

export function CategoryIcon({ category, size = 44 }: { category: Category; size?: number }) {
  const m = CATEGORY_META[category];
  return (
    <View style={{ width: size, height: size, borderRadius: radii.md, backgroundColor: m.bg, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={m.icon} size={size * 0.5} color={m.tint} />
    </View>
  );
}

export function DiagnosticCenterCard({ center, onPress }: { center: Center; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${center.name}, ${center.city}. ${center.services_count} tests.`}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View style={styles.logo}><Ionicons name="business-outline" size={24} color={colors.white} /></View>
        <View style={{ flex: 1 }}>
          <Text style={typography.cardTitle} numberOfLines={2}>{center.name}</Text>
          <View style={styles.inline}><Ionicons name="location-outline" size={14} color={colors.textMuted} /><Text style={typography.caption} numberOfLines={2}>{center.address}, {center.city}</Text></View>
        </View>
      </View>
      <Divider />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={typography.caption}>{center.services_count} {center.services_count === 1 ? 'test' : 'tests'} · {formatTime(center.opening_time)}–{formatTime(center.closing_time)}</Text>
        {center.starting_price ? <PriceDisplay amount={center.starting_price} prefix="from" size="sm" /> : <Text style={typography.caption}>No active services</Text>}
      </View>
    </Card>
  );
}

export function DiagnosticTestCard({ test, onPress, price, cta, onCta }: { test: DiagTest | CenterService; onPress?: () => void; price?: string | null; cta?: string; onCta?: () => void }) {
  const isTest = 'min_price' in test;
  const shown = price ?? (isTest ? (test as DiagTest).min_price : (test as CenterService).price);
  return (
    <Card onPress={onPress} accessibilityLabel={`${test.name}, ${CATEGORY_META[test.category].name}`}>
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <CategoryIcon category={test.category} />
        <View style={{ flex: 1 }}>
          <Text style={typography.cardTitle}>{test.name}</Text>
          <Text style={typography.caption}>{CATEGORY_META[test.category].name}{test.turnaround_hours ? ` · Report in ~${test.turnaround_hours}h` : ''}</Text>
        </View>
      </View>
      {test.description ? <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]} numberOfLines={2}>{test.description}</Text> : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, gap: spacing.md }}>
        {shown ? <PriceDisplay amount={shown} prefix={isTest && !price ? 'from' : undefined} /> : <Text style={typography.caption}>Not offered yet</Text>}
        {cta ? <PrimaryButton title={cta} onPress={onCta ?? (() => {})} style={{ minHeight: 40, paddingHorizontal: spacing.lg }} /> : null}
      </View>
    </Card>
  );
}

export function AppointmentCard({ appt, onPress, showPatient }: { appt: Appointment; onPress: () => void; showPatient?: boolean }) {
  return (
    <Card onPress={onPress} accessibilityLabel={`${appt.test.name} at ${appt.center.name} on ${formatDate(appt.slot.date)}, ${label(appt.status)}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={typography.cardTitle}>{appt.test.name}</Text>
          <Text style={typography.caption}>{showPatient && appt.patient ? `${appt.patient.full_name} · ` : ''}{appt.center.name}</Text>
        </View>
        <StatusBadge status={appt.status} />
      </View>
      <Divider />
      <View style={styles.inline}><Ionicons name="calendar-outline" size={16} color={colors.primary} /><Text style={typography.body}>{formatDate(appt.slot.date)} · {formatTime(appt.slot.start_time)}</Text></View>
      <View style={[styles.inline, { justifyContent: 'space-between', marginTop: 6 }]}>
        <Text style={typography.caption}>Ref {appt.reference}</Text>
        <StatusBadge status={appt.payment_status} prefix="Payment:" />
      </View>
    </Card>
  );
}

export function BookingSummaryCard({ center, testName, date, start, end, price, patient }:
  { center: string; testName: string; date: string; start: string; end: string; price: string; patient: { name: string; email: string } }) {
  return (
    <Card>
      <Row label="Diagnostic center" value={center} />
      <Row label="Test" value={testName} />
      <Row label="Date" value={formatDate(date)} />
      <Row label="Time" value={`${timeRange(start, end)}`} />
      <Row label="Time zone" value={TZ_LABEL} />
      <Divider />
      <Row label="Patient" value={patient.name} />
      <Row label="Email" value={patient.email} />
      <Divider />
      <Row label="Test fee" value={<PriceDisplay amount={price} size="sm" />} />
      <Row label="Total payable" strong value={<PriceDisplay amount={price} />} />
    </Card>
  );
}

export function AvailabilitySlot({ slot, selected, onPress }: { slot: SlotAvailability; selected: boolean; onPress: () => void }) {
  const off = !slot.available;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button"
      accessibilityState={{ selected, disabled: off }}
      accessibilityLabel={`${formatTime(slot.start_time)}, ${off ? 'fully booked' : `${slot.remaining} left`}${selected ? ', selected' : ''}`}
      style={[styles.slot, selected && styles.slotOn, off && styles.slotOff]}>
      <Text style={[typography.label, selected && { color: colors.white }, off && { color: colors.textFaint, textDecorationLine: 'line-through' }]}>{formatTime(slot.start_time)}</Text>
      <Text style={[typography.caption, selected && { color: '#CFE0FF' }, off && { color: colors.textFaint }]}>{off ? 'Full' : `${slot.remaining} left`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  logo: { width: 48, height: 48, borderRadius: radii.md, backgroundColor: colors.navy700, alignItems: 'center', justifyContent: 'center' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  slot: { width: '31%', minHeight: 56, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  slotOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  slotOff: { backgroundColor: '#F0F3F8', borderStyle: 'dashed' },
});
