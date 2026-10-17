import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppointmentApi, CatalogApi } from '../api/endpoints';
import { AppointmentCard, CATEGORY_META, Card, ChipRow, DiagnosticCenterCard, DiagnosticTestCard, EmptyState, ErrorState, FilterChip, IconButton, LoadingSkeleton, ProfileAvatar, Screen, SearchBar, SectionHeader } from '../components';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { colors, elevation, radii, spacing, typography } from '../design-system/tokens';
import type { Category } from '../types';

export function HomeScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | undefined>(user?.city || undefined);
  const cities = useApi(() => CatalogApi.cities(), []);
  const dash = useApi(() => AppointmentApi.dashboard(), []);
  const centers = useApi(() => CatalogApi.centers({ city, page_size: 4, ordering: 'name' }), [city]);
  const tests = useApi(() => CatalogApi.tests({ page_size: 4, ordering: 'name' }), []);
  useFocusEffect(useCallback(() => { dash.refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []));
  const refreshAll = () => { dash.refresh(); centers.refresh(); tests.refresh(); cities.refresh(); };
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const up = dash.data?.upcoming_appointment;

  return (
    <Screen onRefresh={refreshAll} refreshing={dash.refreshing || centers.refreshing}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.md, paddingBottom: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 }}>
          <Pressable onPress={() => nav.navigate('Profile')} accessibilityRole="button" accessibilityLabel="Open profile"><ProfileAvatar name={user?.full_name ?? ''} size={48} /></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={typography.caption}>{greet}</Text>
            <Text style={typography.title} numberOfLines={1}>{user?.full_name?.split(' ')[0]}</Text>
          </View>
        </View>
        <IconButton icon="calendar-outline" label="My appointments" onPress={() => nav.navigate('Appointments')} />
      </View>

      <SearchBar value={q} onChangeText={setQ} onSubmit={() => nav.navigate('Tests', { q })} placeholder="Search tests, e.g. CBC or MRI" />

      <SectionHeader title="Categories" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
          const m = CATEGORY_META[c];
          return (
            <Pressable key={c} onPress={() => nav.navigate('Tests', { category: c, q: '' })} accessibilityRole="button" accessibilityLabel={`${m.name} tests`}
              style={({ pressed }) => [{ flex: 1, alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.lg, backgroundColor: m.bg, gap: 6 }, pressed && { opacity: 0.85 }]}>
              <Ionicons name={m.icon} size={26} color={m.tint} />
              <Text style={[typography.badge, { color: colors.navy900 }]} numberOfLines={1}>{m.name}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Upcoming appointment" action={up ? 'See all' : undefined} onAction={() => nav.navigate('Appointments')} />
      {dash.loading ? <LoadingSkeleton rows={1} height={120} /> : dash.error ? <ErrorState message={dash.error.message} onRetry={dash.reload} /> : up ? (
        <AppointmentCard appt={up} onPress={() => nav.navigate('AppointmentDetail', { id: up.id })} />
      ) : (
        <Card style={{ backgroundColor: colors.navy900, borderColor: colors.navy900 }} onPress={() => nav.navigate('Centers')} accessibilityLabel="Book your first diagnostic test">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.heading, { color: colors.white }]}>Nothing booked yet</Text>
              <Text style={[typography.body, { color: '#B8C7E6', marginTop: 4 }]}>Find a center and pick a time that suits you.</Text>
            </View>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="arrow-forward" size={22} color={colors.white} /></View>
          </View>
        </Card>
      )}

      <SectionHeader title="Quick actions" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { icon: 'search' as const, t: 'Find center', go: () => nav.navigate('Centers') },
          { icon: 'flask' as const, t: 'Browse tests', go: () => nav.navigate('Tests') },
          { icon: 'time' as const, t: 'My bookings', go: () => nav.navigate('Appointments') },
        ].map((x) => (
          <Pressable key={x.t} onPress={x.go} accessibilityRole="button" accessibilityLabel={x.t}
            style={({ pressed }) => [{ flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', gap: 6, ...elevation.card }, pressed && { opacity: 0.85 }]}>
            <Ionicons name={x.icon} size={22} color={colors.primary} /><Text style={typography.label}>{x.t}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Centers" action="View all" onAction={() => nav.navigate('Centers', { city })} />
      <ChipRow>
        <FilterChip label="All cities" selected={!city} onPress={() => setCity(undefined)} />
        {(cities.data ?? []).map((c) => <FilterChip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />)}
      </ChipRow>
      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {centers.loading ? <LoadingSkeleton rows={2} /> : centers.error ? <ErrorState message={centers.error.message} onRetry={centers.reload} /> :
          centers.data?.results.length ? centers.data.results.map((c) => <DiagnosticCenterCard key={c.id} center={c} onPress={() => nav.navigate('CenterDetail', { id: c.id })} />)
            : <EmptyState icon="business-outline" title="No centers in this city" />}
      </View>

      <SectionHeader title="Available tests" action="View all" onAction={() => nav.navigate('Tests')} />
      <View style={{ gap: spacing.md }}>
        {tests.loading ? <LoadingSkeleton rows={2} /> : tests.error ? <ErrorState message={tests.error.message} onRetry={tests.reload} /> :
          tests.data?.results.map((t) => <DiagnosticTestCard key={t.id} test={t} onPress={() => nav.navigate('TestDetail', { id: t.id })} />)}
      </View>
    </Screen>
  );
}
