import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, elevation, MAX_CONTENT_WIDTH, radii, sizes, spacing, typography } from '../design-system/tokens';
import { money } from '../utils/format';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  footer?: React.ReactNode;
  padded?: boolean;
  edges?: ('top' | 'bottom')[];
  keyboard?: boolean;
}
/** Safe-area aware screen. Content is centered with a max width so wide browser windows don't stretch the mobile UI. */
export function Screen({ children, scroll = true, refreshing, onRefresh, footer, padded = true, edges = ['top'] }: ScreenProps) {
  const body = (
    <View style={[styles.column, padded && { paddingHorizontal: spacing.lg }]}>{children}</View>
  );
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: spacing.xxl, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}
        >
          {body}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{body}</View>
      )}
      {footer ? <View style={styles.footer}><View style={styles.column}>{footer}</View></View> : null}
    </SafeAreaView>
  );
}

export function Header({ title, subtitle, back = true, right }: { title: string; subtitle?: string; back?: boolean; right?: React.ReactNode }) {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      {back && nav.canGoBack() ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => nav.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.navy900} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={typography.title} accessibilityRole="header" numberOfLines={2}>{title}</Text>
        {subtitle ? <Text style={[typography.caption, { marginTop: 2 }]}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text style={typography.heading} accessibilityRole="header">{title}</Text>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button" accessibilityLabel={`${action} ${title}`} hitSlop={8} style={{ minHeight: 32, justifyContent: 'center' }}>
          <Text style={[typography.label, { color: colors.primary }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, style, onPress, accessibilityLabel }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void; accessibilityLabel?: string }) {
  const base = [styles.card, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}
      style={({ pressed }) => [...base, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  );
}

export function FilterChip({ label, selected, onPress, icon }: { label: string; selected?: boolean; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: !!selected }} accessibilityLabel={`${label}${selected ? ', selected' : ''}`}
      style={[styles.chip, selected && styles.chipOn]}>
      {icon ? <Ionicons name={icon} size={sizes.icon.sm} color={selected ? colors.white : colors.primary} /> : null}
      <Text style={[typography.label, { color: selected ? colors.white : colors.navy900 }]}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
    </Pressable>
  );
}

export function ChipRow({ children }: { children: React.ReactNode }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.xs }}>{children}</ScrollView>;
}

export function PriceDisplay({ amount, prefix, size = 'md' }: { amount: string | number | null; prefix?: string; size?: 'sm' | 'md' | 'lg' }) {
  const fs = size === 'lg' ? 28 : size === 'sm' ? 15 : 18;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }} accessible accessibilityLabel={`${prefix ?? ''} ${money(amount)}`}>
      {prefix ? <Text style={typography.caption}>{prefix}</Text> : null}
      <Text style={[typography.price, { fontSize: fs, lineHeight: fs + 6 }]}>{money(amount)}</Text>
    </View>
  );
}

export function ProfileAvatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
  return (
    <View accessible accessibilityLabel={`Avatar for ${name}`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold', fontSize: size * 0.38 }}>{initials}</Text>
    </View>
  );
}

export function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <View style={styles.kv}>
      <Text style={[typography.caption, { flex: 0.9 }]}>{label}</Text>
      <Text style={[strong ? typography.cardTitle : typography.body, { flex: 1.4, textAlign: 'right' }]}>{value}</Text>
    </View>
  );
}

export const Divider = () => <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.md }} />;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  column: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center', flexGrow: 1 },
  footer: { backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, padding: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg },
  backBtn: { width: sizes.touch, height: sizes.touch, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  section: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, ...elevation.card },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.navy900, borderColor: colors.navy900 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, paddingVertical: 6 },
});
