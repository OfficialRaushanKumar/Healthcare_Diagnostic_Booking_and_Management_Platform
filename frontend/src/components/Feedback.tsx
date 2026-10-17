import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, elevation, radii, spacing, typography } from '../design-system/tokens';
import { label } from '../utils/format';
import { PrimaryButton, SecondaryButton } from './Buttons';

const STATUS: Record<string, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  CONFIRMED: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
  PAID: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
  COMPLETED: { bg: colors.infoSoft, fg: colors.info, icon: 'ribbon' },
  PENDING_PAYMENT: { bg: colors.warningSoft, fg: colors.warning, icon: 'time' },
  CREATED: { bg: colors.warningSoft, fg: colors.warning, icon: 'time' },
  CANCELLED: { bg: colors.dangerSoft, fg: colors.danger, icon: 'close-circle' },
  REJECTED: { bg: colors.dangerSoft, fg: colors.danger, icon: 'ban' },
  FAILED: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle' },
  EXPIRED: { bg: '#EEF1F6', fg: colors.textMuted, icon: 'hourglass' },
  REFUNDED: { bg: colors.infoSoft, fg: colors.info, icon: 'return-down-back' },
  NONE: { bg: '#EEF1F6', fg: colors.textMuted, icon: 'remove-circle' },
};

/** Icon + text, so status never relies on color alone. */
export function StatusBadge({ status, prefix }: { status: string; prefix?: string }) {
  const s = STATUS[status] ?? STATUS.NONE;
  const text = `${prefix ? prefix + ' ' : ''}${label(status)}`;
  return (
    <View accessible accessibilityLabel={`Status: ${text}`} style={[styles.badge, { backgroundColor: s.bg }]}>
      <Ionicons name={s.icon} size={13} color={s.fg} />
      <Text style={[typography.badge, { color: s.fg }]}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'folder-open-outline', title, message, action }: { icon?: keyof typeof Ionicons.glyphMap; title: string; message?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.center} accessible accessibilityLabel={`${title}. ${message ?? ''}`}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={34} color={colors.primary} /></View>
      <Text style={[typography.heading, { textAlign: 'center' }]}>{title}</Text>
      {message ? <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginTop: 6 }]}>{message}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center} accessibilityRole="alert">
      <View style={[styles.emptyIcon, { backgroundColor: colors.dangerSoft }]}><Ionicons name="cloud-offline-outline" size={34} color={colors.danger} /></View>
      <Text style={[typography.heading, { textAlign: 'center' }]}>Something went wrong</Text>
      <Text style={[typography.body, { textAlign: 'center', color: colors.textMuted, marginTop: 6 }]}>{message}</Text>
      {onRetry ? <View style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}><PrimaryButton title="Try again" icon="refresh" onPress={onRetry} /></View> : null}
    </View>
  );
}

export function LoadingSkeleton({ rows = 3, height = 96 }: { rows?: number; height?: number }) {
  const o = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(o, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(o, { toValue: 0.45, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [o]);
  return (
    <View accessible accessibilityLabel="Loading" accessibilityLiveRegion="polite" style={{ gap: spacing.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Animated.View key={i} style={{ height, borderRadius: radii.lg, backgroundColor: '#E4EAF3', opacity: o }} />
      ))}
    </View>
  );
}

export function ConfirmationDialog({ visible, title, message, confirmLabel = 'Confirm', cancelLabel = 'Keep', danger, loading, onConfirm, onCancel }:
  { visible: boolean; title: string; message: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean; loading?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.scrim}>
        <SafeAreaView style={{ width: '100%', alignItems: 'center' }}>
          <View style={styles.dialog} accessibilityViewIsModal>
            <Text style={typography.heading} accessibilityRole="header">{title}</Text>
            <Text style={[typography.body, { color: colors.textMuted, marginTop: 8, marginBottom: spacing.xl }]}>{message}</Text>
            <View style={{ gap: spacing.sm }}>
              <PrimaryButton title={confirmLabel} danger={danger} loading={loading} onPress={onConfirm} />
              <SecondaryButton title={cancelLabel} disabled={loading} onPress={onCancel} />
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

type ToastKind = 'success' | 'error' | 'info';
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [t, setT] = useState<{ msg: string; kind: ToastKind } | null>(null);
  const y = useRef(new Animated.Value(-80)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string, kind: ToastKind = 'info') => {
    setT({ msg, kind });
    Animated.spring(y, { toValue: 0, useNativeDriver: Platform.OS !== 'web', bounciness: 4 }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => Animated.timing(y, { toValue: -120, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setT(null)), 3500);
  }, [y]);
  const tone = t?.kind === 'success' ? colors.success : t?.kind === 'error' ? colors.danger : colors.navy900;
  const icon = t?.kind === 'success' ? 'checkmark-circle' : t?.kind === 'error' ? 'alert-circle' : 'information-circle';
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t ? (
        <Animated.View pointerEvents="none" style={[styles.toastWrap, { transform: [{ translateY: y }] }]}>
          <SafeAreaView edges={['top']}>
            <View accessibilityRole="alert" accessibilityLiveRegion="assertive" style={[styles.toast, { backgroundColor: tone }]}>
              <Ionicons name={icon} size={20} color={colors.white} />
              <Text style={[typography.label, { color: colors.white, flex: 1 }]}>{t.msg}</Text>
            </View>
          </SafeAreaView>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill },
  center: { alignItems: 'center', paddingVertical: spacing.xxxl, paddingHorizontal: spacing.lg },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  scrim: { flex: 1, backgroundColor: 'rgba(10,31,68,0.5)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  dialog: { width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, ...elevation.raised },
  toastWrap: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.lg, zIndex: 100 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, maxWidth: 520, marginTop: spacing.sm, ...elevation.raised },
});
