import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, sizes, spacing, typography } from '../design-system/tokens';

interface BtnProps {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap; style?: ViewStyle; danger?: boolean; accessibilityHint?: string;
}

export function PrimaryButton({ title, onPress, loading, disabled, icon, style, danger, accessibilityHint }: BtnProps) {
  const off = disabled || loading;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={title} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [styles.base, { backgroundColor: danger ? colors.danger : colors.primary }, pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] }, off && styles.off, style]}>
      {loading ? <ActivityIndicator color={colors.white} /> : (
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={sizes.icon.md} color={colors.white} /> : null}
          <Text style={[typography.button, { color: colors.white }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function SecondaryButton({ title, onPress, loading, disabled, icon, style, danger }: BtnProps) {
  const off = disabled || loading;
  const c = danger ? colors.danger : colors.primary;
  return (
    <Pressable onPress={onPress} disabled={off} accessibilityRole="button" accessibilityLabel={title}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [styles.base, { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: c }, pressed && { backgroundColor: danger ? colors.dangerSoft : colors.primarySoft }, off && styles.off, style]}>
      {loading ? <ActivityIndicator color={c} /> : (
        <View style={styles.inner}>
          {icon ? <Ionicons name={icon} size={sizes.icon.md} color={c} /> : null}
          <Text style={[typography.button, { color: c }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, badge }: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; label: string; badge?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}
      style={({ pressed }) => [styles.iconBtn, pressed && { backgroundColor: colors.primarySoft }]}>
      <Ionicons name={icon} size={sizes.icon.lg} color={colors.navy900} />
      {badge ? <View style={styles.dot} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minHeight: sizes.button, borderRadius: radii.md, paddingHorizontal: spacing.xl, alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  off: { opacity: 0.5 },
  iconBtn: { width: sizes.touch, height: sizes.touch, borderRadius: radii.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', top: 10, right: 11, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.teal },
});
