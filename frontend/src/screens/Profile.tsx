import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';
import { z } from 'zod';
import { toApiError } from '../api/client';
import { AuthApi, PaymentApi } from '../api/endpoints';
import { Card, ConfirmationDialog, Divider, EmptyState, ErrorState, FormField, Header, LoadingSkeleton, PriceDisplay, PrimaryButton, ProfileAvatar, Screen, SecondaryButton, SectionHeader, StatusBadge, useToast } from '../components';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { colors, spacing, typography } from '../design-system/tokens';
import { formatDate } from '../utils/format';

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name'),
  phone: z.string().trim().regex(/^$|^\+?[0-9 ]{10,15}$/, 'Enter a valid phone number'),
  city: z.string().trim().max(80),
});
type F = z.infer<typeof schema>;

export function ProfileScreen() {
  const nav = useNavigation<any>();
  const { user, setUser, logout } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);
  const [showPay, setShowPay] = useState(false);
  const pay = useApi(() => (showPay ? PaymentApi.list({ page_size: 20 }) : Promise.resolve(null)), [showPay]);
  const { control, handleSubmit } = useForm<F>({ resolver: zodResolver(schema), defaultValues: { full_name: user?.full_name ?? '', phone: user?.phone ?? '', city: user?.city ?? '' } });
  if (!user) return null;
  const isPatient = user.role === 'PATIENT';

  const save = handleSubmit(async (v) => {
    setSaving(true);
    try { setUser(await AuthApi.updateMe(isPatient ? v : { full_name: v.full_name, phone: v.phone })); setEditing(false); toast('Profile saved', 'success'); }
    catch (e) { toast(toApiError(e).message, 'error'); } finally { setSaving(false); }
  });

  return (
    <Screen>
      <Header title="Profile" back={false} />
      <Card style={{ alignItems: 'center' }}>
        <ProfileAvatar name={user.full_name} size={72} />
        <Text style={[typography.heading, { marginTop: spacing.md }]}>{user.full_name}</Text>
        <Text style={typography.caption}>{user.email}</Text>
        <View style={{ marginTop: 8 }}><StatusBadge status={user.role === 'PATIENT' ? 'NONE' : 'CONFIRMED'} prefix={user.role === 'PATIENT' ? 'Patient' : 'Staff'} /></View>
      </Card>

      <SectionHeader title="Account" />
      <Card>
        {editing ? (
          <>
            <FormField control={control} name="full_name" label="Full name" />
            <FormField control={control} name="phone" label="Phone" keyboardType="phone-pad" />
            {isPatient ? <FormField control={control} name="city" label="City" /> : null}
            <PrimaryButton title="Save changes" loading={saving} onPress={save} />
            <View style={{ height: spacing.sm }} /><SecondaryButton title="Cancel" onPress={() => setEditing(false)} />
          </>
        ) : (
          <>
            <Line label="Phone" value={user.phone || 'Not set'} />
            {isPatient ? <Line label="City" value={user.city || 'Not set'} /> : null}
            <View style={{ height: spacing.md }} />
            <SecondaryButton title="Edit profile" icon="create-outline" onPress={() => setEditing(true)} />
          </>
        )}
      </Card>

      {isPatient ? (
        <>
          <SectionHeader title="Activity" />
          <Card>
            <Item icon="calendar-outline" title="Booking history" onPress={() => nav.navigate('Appointments')} />
            <Divider />
            <Item icon="card-outline" title="Payment history" onPress={() => setShowPay((s) => !s)} chevron={showPay ? 'chevron-up' : 'chevron-down'} />
          </Card>
          {showPay ? (
            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              {pay.loading ? <LoadingSkeleton rows={2} height={72} /> : pay.error ? <ErrorState message={pay.error.message} onRetry={pay.reload} /> :
                pay.data?.results.length ? pay.data.results.map((p) => (
                  <Card key={p.id}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={typography.cardTitle}>{p.appointment_reference}</Text><StatusBadge status={p.status} /></View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={typography.caption}>{formatDate(p.paid_at ?? p.created_at)}</Text><PriceDisplay amount={p.amount} size="sm" /></View>
                  </Card>)) : <EmptyState icon="card-outline" title="No payments yet" />}
            </View>
          ) : null}
        </>
      ) : null}

      <View style={{ marginTop: spacing.xl }}><SecondaryButton title="Log out" icon="log-out-outline" danger onPress={() => setConfirmOut(true)} /></View>
      <Text style={[typography.caption, { textAlign: 'center', marginTop: spacing.lg }]}>MediBook demo · fictional data only</Text>
      <ConfirmationDialog visible={confirmOut} title="Log out?" message="You will need to sign in again to see your appointments." confirmLabel="Log out" cancelLabel="Stay signed in" danger onConfirm={logout} onCancel={() => setConfirmOut(false)} />
    </Screen>
  );
}

const Line = ({ label, value }: { label: string; value: string }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}><Text style={typography.caption}>{label}</Text><Text style={typography.body}>{value}</Text></View>
);
const Item = ({ icon, title, onPress, chevron = 'chevron-forward' }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void; chevron?: keyof typeof Ionicons.glyphMap }) => (
  <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 44 }}>
    <Ionicons name={icon} size={22} color={colors.primary} /><Text style={[typography.body, { flex: 1 }]}>{title}</Text><Ionicons name={chevron} size={18} color={colors.textFaint} />
  </Pressable>
);
