import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CatalogApi } from '../api/endpoints';
import { toApiError, ApiError } from '../api/client';
import { CATEGORY_META, ChipRow, DiagnosticCenterCard, DiagnosticTestCard, EmptyState, ErrorState, FilterChip, Header, LoadingSkeleton, PrimaryButton, Screen, SearchBar, SecondaryButton, SectionHeader, Card, Row, Divider } from '../components';
import { useApi } from '../hooks/useApi';
import { colors, MAX_CONTENT_WIDTH, spacing, typography } from '../design-system/tokens';
import type { Category, Center, DiagTest, Paginated } from '../types';
import { formatTime, money } from '../utils/format';

const CATS = Object.keys(CATEGORY_META) as Category[];

/** Generic debounced, paginated list loader (incremental loading via onEndReached). */
function usePaged<T>(fetcher: (page: number) => Promise<Paginated<T>>, deps: unknown[]) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const seq = useRef(0);

  const load = useCallback(async (p: number, mode: 'reset' | 'more' | 'refresh') => {
    const id = ++seq.current;
    if (mode === 'more') setLoadingMore(true); else if (mode === 'refresh') setRefreshing(true); else setLoading(true);
    try {
      const r = await fetcher(p);
      if (id !== seq.current) return; // stale response from an older query
      setItems((cur) => (mode === 'more' ? [...cur, ...r.results] : r.results));
      setMore(!!r.next); setPage(p); setError(null);
    } catch (e) { if (id === seq.current) setError(toApiError(e)); }
    finally { if (id === seq.current) { setLoading(false); setLoadingMore(false); setRefreshing(false); } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { const t = setTimeout(() => load(1, 'reset'), 250); return () => clearTimeout(t); }, [load]);
  return { items, loading, loadingMore, refreshing, error, more,
    reload: () => load(1, 'reset'), refresh: () => load(1, 'refresh'), next: () => { if (more && !loadingMore && !loading) load(page + 1, 'more'); } };
}

function ListShell<T>({ paged, render, header, empty }: { paged: ReturnType<typeof usePaged<T>>; render: (i: T) => React.ReactElement; header: React.ReactElement; empty: React.ReactElement }) {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <FlatList
        data={paged.items}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>{render(item)}</View>}
        ListHeaderComponent={<View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.lg }}>{header}</View>}
        ListEmptyComponent={
          <View style={{ width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', paddingHorizontal: spacing.lg }}>
            {paged.loading ? <LoadingSkeleton /> : paged.error ? <ErrorState message={paged.error.message} onRetry={paged.reload} /> : empty}
          </View>
        }
        ListFooterComponent={paged.loadingMore ? <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} /> : <View style={{ height: spacing.xl }} />}
        onEndReached={paged.next} onEndReachedThreshold={0.4}
        refreshing={paged.refreshing} onRefresh={paged.refresh}
        keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

export function CentersScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [q, setQ] = useState(route.params?.q ?? '');
  const [city, setCity] = useState<string | undefined>(route.params?.city);
  const [cat, setCat] = useState<Category | undefined>(route.params?.category);
  const [sort, setSort] = useState<'name' | 'starting_price'>('name');
  const cities = useApi(() => CatalogApi.cities(), []);

  useEffect(() => { // honor params when arriving from Home shortcuts
    if (route.params?.city !== undefined) setCity(route.params.city);
    if (route.params?.category !== undefined) setCat(route.params.category);
    if (route.params?.q !== undefined) setQ(route.params.q);
  }, [route.params]);

  const paged = usePaged<Center>((page) => CatalogApi.centers({ page, search: q || undefined, city, category: cat, ordering: sort }), [q, city, cat, sort]);
  return (
    <ListShell paged={paged} render={(c) => <DiagnosticCenterCard center={c} onPress={() => nav.navigate('CenterDetail', { id: c.id })} />}
      header={
        <View>
          <Header title="Find a center" subtitle="Compare diagnostic centers near you" back={false} />
          <SearchBar value={q} onChangeText={setQ} placeholder="Search centers, areas or tests" />
          <Text style={[typography.caption, { marginTop: spacing.md }]}>City</Text>
          <ChipRow>
            <FilterChip label="All cities" selected={!city} onPress={() => setCity(undefined)} />
            {(cities.data ?? []).map((c) => <FilterChip key={c} label={c} selected={city === c} onPress={() => setCity(c)} />)}
          </ChipRow>
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>Category</Text>
          <ChipRow>
            <FilterChip label="All" selected={!cat} onPress={() => setCat(undefined)} />
            {CATS.map((c) => <FilterChip key={c} label={CATEGORY_META[c].name} icon={CATEGORY_META[c].icon} selected={cat === c} onPress={() => setCat(cat === c ? undefined : c)} />)}
          </ChipRow>
          <Text style={[typography.caption, { marginTop: spacing.sm }]}>Sort by</Text>
          <ChipRow>
            <FilterChip label="Name" selected={sort === 'name'} onPress={() => setSort('name')} />
            <FilterChip label="Price: low to high" selected={sort === 'starting_price'} onPress={() => setSort('starting_price')} />
          </ChipRow>
          <View style={{ height: spacing.md }} />
        </View>
      }
      empty={<EmptyState icon="business-outline" title="No centers found" message="Try a different city, category or search term." action={<SecondaryButton title="Clear filters" onPress={() => { setQ(''); setCity(undefined); setCat(undefined); }} />} />} />
  );
}

export function TestsScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [q, setQ] = useState(route.params?.q ?? '');
  const [cat, setCat] = useState<Category | undefined>(route.params?.category);
  useEffect(() => {
    if (route.params?.category !== undefined) setCat(route.params.category);
    if (route.params?.q !== undefined) setQ(route.params.q);
  }, [route.params]);
  const paged = usePaged<DiagTest>((page) => CatalogApi.tests({ page, search: q || undefined, category: cat }), [q, cat]);
  return (
    <ListShell paged={paged} render={(t) => <DiagnosticTestCard test={t} onPress={() => nav.navigate('TestDetail', { id: t.id })} />}
      header={
        <View>
          <Header title="Diagnostic tests" subtitle="Browse by category or search by name" back={false} />
          <SearchBar value={q} onChangeText={setQ} placeholder="Search tests" />
          <ChipRow>
            <FilterChip label="All" selected={!cat} onPress={() => setCat(undefined)} />
            {CATS.map((c) => <FilterChip key={c} label={CATEGORY_META[c].name} icon={CATEGORY_META[c].icon} selected={cat === c} onPress={() => setCat(cat === c ? undefined : c)} />)}
          </ChipRow>
          <View style={{ height: spacing.md }} />
        </View>
      }
      empty={<EmptyState icon="flask-outline" title="No tests match" message="Try another category or a shorter search term." />} />
  );
}

export function CenterDetailScreen() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: number };
  const { data: c, loading, error, reload, refreshing, refresh } = useApi(() => CatalogApi.center(id), [id]);
  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title={c?.name ?? 'Center'} subtitle={c ? `${c.city}` : undefined} />
      {loading ? <LoadingSkeleton rows={3} height={110} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : c ? (
        <>
          <Card>
            <Row label="Address" value={c.address} />
            <Row label="Hours" value={`${formatTime(c.opening_time)} – ${formatTime(c.closing_time)}`} />
            <Row label="Phone" value={c.phone || '—'} />
            {c.email ? <Row label="Email" value={c.email} /> : null}
            {c.description ? (<><Divider /><Text style={[typography.body, { color: colors.textMuted }]}>{c.description}</Text></>) : null}
            {c.phone ? <View style={{ marginTop: spacing.md }}><SecondaryButton title="Call center" icon="call-outline" onPress={() => Linking.openURL(`tel:${c.phone.replace(/\s/g, '')}`)} /></View> : null}
          </Card>
          <SectionHeader title={`Available tests (${c.services?.length ?? 0})`} />
          {c.services?.length ? (
            <View style={{ gap: spacing.md }}>
              {c.services.map((s) => (
                <DiagnosticTestCard key={s.id} test={s} price={s.price} cta="Book"
                  onCta={() => nav.navigate('SelectSlot', { centerId: c.id, centerName: c.name, serviceId: s.id, testName: s.name, price: s.price })} />
              ))}
            </View>
          ) : <EmptyState icon="flask-outline" title="No services available" message="This center has no active diagnostic services right now." />}
        </>
      ) : null}
    </Screen>
  );
}

export function TestDetailScreen() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: number };
  const { data: t, loading, error, reload, refreshing, refresh } = useApi(() => CatalogApi.test(id), [id]);
  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <Header title={t?.name ?? 'Test'} subtitle={t ? CATEGORY_META[t.category].name : undefined} />
      {loading ? <LoadingSkeleton rows={3} height={110} /> : error ? <ErrorState message={error.message} onRetry={reload} /> : t ? (
        <>
          <Card>
            {t.description ? <Text style={typography.body}>{t.description}</Text> : null}
            {t.turnaround_hours ? <Row label="Estimated report time" value={`~${t.turnaround_hours} hours`} /> : null}
          </Card>
          <SectionHeader title="Preparation" />
          <Card><Text style={typography.body}>{t.preparation || 'No preparation instructions have been configured for this test.'}</Text>
            <Text style={[typography.caption, { marginTop: spacing.sm }]}>Instructions are provided by the diagnostic center configuration. Always follow your doctor's advice.</Text></Card>
          <SectionHeader title={`Available at ${t.centers?.length ?? 0} ${t.centers?.length === 1 ? 'center' : 'centers'}`} />
          {t.centers?.length ? (
            <View style={{ gap: spacing.md }}>
              {t.centers.map((c) => (
                <Card key={c.service_id}>
                  <Text style={typography.cardTitle}>{c.center_name}</Text>
                  <Text style={typography.caption}>{c.address}, {c.city}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
                    <Text style={typography.price}>{money(c.price)}</Text>
                    <PrimaryButton title="Book" style={{ minHeight: 40 }} onPress={() => nav.navigate('SelectSlot', { centerId: c.center_id, centerName: c.center_name, serviceId: c.service_id, testName: t.name, price: c.price })} />
                  </View>
                </Card>
              ))}
            </View>
          ) : <EmptyState icon="business-outline" title="Not available yet" message="No active center currently offers this test." />}
        </>
      ) : null}
    </Screen>
  );
}
