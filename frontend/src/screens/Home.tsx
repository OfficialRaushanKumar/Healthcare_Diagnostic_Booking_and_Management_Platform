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
            <Text style={typography.title} numberOfLines={1}>{user?.full_name?.split(' ')[0] ?? 'there'}</Text>
          </View>
        </View>
        <IconButton icon="calendar-outline" label="My appointments" onPress={() => nav.navigate('Appointments')} />
      </View>

      <View style={{ backgroundColor: colors.navy900, borderRadius: radii.xl, padding: spacing.xl, overflow: 'hidden', marginBottom: spacing.xl, ...elevation.raised }}>
        <View pointerEvents="none" style={{ position: 'absolute', right: -36, top: -54, width: 178, height: 178, borderRadius: 89, backgroundColor: '#17366F' }} />
        <View pointerEvents="none" style={{ position: 'absolute', right: 24, bottom: -72, width: 148, height: 148, borderRadius: 74, borderWidth: 1, borderColor: '#345084' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: spacing.md }}>
          <Ionicons name="heart-circle" size={19} color="#72E0D1" />
          <Text style={{ ...typography.badge, color: '#A7EAE1', letterSpacing: 1.1 }}>YOUR HEALTH, MADE SIMPLE</Text>
        </View>
        <Text style={{ ...typography.display, fontSize: 32, lineHeight: 38, color: colors.white, maxWidth: 290 }}>Care that fits your day.</Text>
        <Text style={[typography.body, { color: '#C4D1E9', marginTop: spacing.sm, maxWidth: 330 }]}>Find trusted diagnostic care, choose a time, and keep every appointment in one place.</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl }}>
          <Pressable onPress={() => nav.navigate('Tests')} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#35B6A6', paddingHorizontal: spacing.lg, minHeight: 48, borderRadius: radii.md }, pressed && { opacity: 0.86, transform: [{ scale: 0.98 }] }]}>
            <Text style={[typography.label, { color: colors.white }]}>Explore tests</Text><Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>
          <Pressable onPress={() => nav.navigate('Centers')} accessibilityRole="button" style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 7, borderColor: '#50658C', borderWidth: 1, paddingHorizontal: spacing.lg, minHeight: 48, borderRadius: radii.md }, pressed && { backgroundColor: '#17366F' }]}>
            <Ionicons name="location-outline" size={17} color={colors.white} /><Text style={[typography.label, { color: colors.white }]}>Find a center</Text>
          </Pressable>
        </View>
        <View style={{ height: 1, backgroundColor: '#31466B', marginVertical: spacing.lg }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {[['shield-checkmark-outline', 'Trusted providers'], ['calendar-clear-outline', 'Flexible slots'], ['document-text-outline', 'Reports in one place']].map(([icon, label]) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={15} color="#72E0D1" /><Text style={[typography.caption, { color: '#D4DEF0', fontSize: 11 }]}>{label}</Text></View>
          ))}
        </View>
      </View>

      <SearchBar value={q} onChangeText={setQ} onSubmit={() => nav.navigate('Tests', { q })} placeholder="Search tests, e.g. CBC or MRI" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm }}><Ionicons name="sparkles-outline" size={14} color={colors.teal} /><Text style={typography.caption}>Popular: Full body checkup · Blood test · MRI</Text></View>

      <SectionHeader title="Explore by category" action="All tests" onAction={() => nav.navigate('Tests')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {(Object.keys(CATEGORY_META) as Category[]).map((c) => {
          const m = CATEGORY_META[c];
          return (
            <Pressable key={c} onPress={() => nav.navigate('Tests', { category: c, q: '' })} accessibilityRole="button" accessibilityLabel={`${m.name} tests`}
              style={({ pressed }) => [{ width: '48.5%', flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...elevation.card }, pressed && { transform: [{ scale: 0.98 }], backgroundColor: m.bg }]}>
              <View style={{ width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: m.bg }}><Ionicons name={m.icon} size={23} color={m.tint} /></View>
              <View style={{ flex: 1 }}><Text style={typography.label}>{m.name}</Text><Text style={[typography.caption, { fontSize: 11 }]}>Browse tests</Text></View>
              <Ionicons name="chevron-forward" size={17} color={colors.textFaint} />
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title={up ? 'Your next visit' : 'Your care, at a glance'} action={up ? 'See all' : undefined} onAction={() => nav.navigate('Appointments')} />
      {dash.loading ? <LoadingSkeleton rows={1} height={120} /> : dash.error ? <ErrorState message={dash.error.message} onRetry={dash.reload} /> : up ? (
        <AppointmentCard appt={up} onPress={() => nav.navigate('AppointmentDetail', { id: up.id })} />
      ) : (
        <Card style={{ backgroundColor: '#EDF7F6', borderColor: '#D4EEEA' }} onPress={() => nav.navigate('Centers')} accessibilityLabel="Book your first diagnostic test">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#D6F0EC', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="calendar-outline" size={24} color={colors.teal} /></View>
            <View style={{ flex: 1 }}><Text style={typography.cardTitle}>Ready when you are</Text><Text style={[typography.caption, { marginTop: 3 }]}>Find a nearby center and book a time that works for you.</Text></View>
            <Ionicons name="arrow-forward-circle" size={27} color={colors.teal} />
          </View>
        </Card>
      )}

      <SectionHeader title="A simpler way to get tested" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { n: '01', icon: 'search-outline' as const, title: 'Find care', body: 'Compare tests and nearby centers.' },
          { n: '02', icon: 'calendar-outline' as const, title: 'Pick a time', body: 'Choose a slot that suits you.' },
          { n: '03', icon: 'checkmark-circle-outline' as const, title: 'Stay on track', body: 'Keep your booking details handy.' },
        ].map((step) => <View key={step.n} style={{ flex: 1, padding: spacing.md, minHeight: 142, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Ionicons name={step.icon} size={21} color={colors.primary} /><Text style={{ ...typography.badge, color: colors.textFaint }}>{step.n}</Text></View>
          <Text style={[typography.label, { marginTop: spacing.md }]}>{step.title}</Text><Text style={[typography.caption, { marginTop: 4, fontSize: 11, lineHeight: 16 }]}>{step.body}</Text>
        </View>)}
      </View>

      <SectionHeader title="Quick access" />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {[
          { icon: 'business-outline' as const, t: 'Centers', go: () => nav.navigate('Centers') },
          { icon: 'flask-outline' as const, t: 'Tests', go: () => nav.navigate('Tests') },
          { icon: 'time-outline' as const, t: 'Bookings', go: () => nav.navigate('Appointments') },
        ].map((x) => (
          <Pressable key={x.t} onPress={x.go} accessibilityRole="button" accessibilityLabel={x.t}
            style={({ pressed }) => [{ flex: 1, backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center', gap: 6, ...elevation.card }, pressed && { opacity: 0.85 }]}>
            <Ionicons name={x.icon} size={22} color={colors.primary} /><Text style={typography.label}>{x.t}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Diagnostic centers" action="View all" onAction={() => nav.navigate('Centers', { city })} />
      <ChipRow>
        <FilterChip label="All cities" selected={!city} onPress={() => setCity(undefined)} />
        {(cities.data ?? []).map((c) => <FilterChip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />)}
      </ChipRow>
      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        {centers.loading ? <LoadingSkeleton rows={2} /> : centers.error ? <ErrorState message={centers.error.message} onRetry={centers.reload} /> :
          centers.data?.results.length ? centers.data.results.map((c) => <DiagnosticCenterCard key={c.id} center={c} onPress={() => nav.navigate('CenterDetail', { id: c.id })} />)
            : <EmptyState icon="business-outline" title="No centers in this city" />}
      </View>

      <SectionHeader title="Popular diagnostic tests" action="View all" onAction={() => nav.navigate('Tests')} />
      <Text style={[typography.caption, { marginTop: -spacing.sm, marginBottom: spacing.md }]}>Explore available services and see what fits your needs.</Text>
      <View style={{ gap: spacing.md }}>
        {tests.loading ? <LoadingSkeleton rows={2} /> : tests.error ? <ErrorState message={tests.error.message} onRetry={tests.reload} /> :
          tests.data?.results.length ? tests.data.results.map((t) => <DiagnosticTestCard key={t.id} test={t} onPress={() => nav.navigate('TestDetail', { id: t.id })} />) : <EmptyState icon="flask-outline" title="Tests will appear here" />}
      </View>
      <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: 6 }}><Ionicons name="heart" size={18} color={colors.teal} /><Text style={[typography.caption, { textAlign: 'center' }]}>Here to make your next step in care feel easier.</Text></View>
    </Screen>
  );
}
