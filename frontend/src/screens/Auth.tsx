import { zodResolver } from '@hookform/resolvers/zod';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { z } from 'zod';
import { toApiError } from '../api/client';
import { FormField, Header, PrimaryButton, Screen, useToast } from '../components';
import { colors, elevation, radii, spacing, typography } from '../design-system/tokens';
import { useAuth } from '../context/AuthContext';

export function WelcomeScreen() {
  const nav = useNavigation<any>();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [hovered, setHovered] = useState('');
  const hoverHandlers = (key: string) => ({ onHoverIn: () => setHovered(key), onHoverOut: () => setHovered('') });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('medibook-heading-motion')) return;
    const style = document.createElement('style');
    style.id = 'medibook-heading-motion';
    style.textContent = `
      @keyframes medibook-health-spectrum { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
      #medibook-heading-gradient { color: transparent !important; background-image: linear-gradient(100deg, #1769aa, #0d9488, #3b67e8, #7258cc, #1769aa); background-size: 300% 300%; background-clip: text; -webkit-background-clip: text; animation: medibook-health-spectrum 8s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { #medibook-heading-gradient { animation: none; background-position: 40% 50%; } }
    `;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFF' }}>
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', width: 430, height: 430, borderRadius: 215, backgroundColor: '#EEF2FF', top: 80, right: -210, opacity: 0.8 }} />
        <View style={{ position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: '#E7FAF7', top: 470, left: -210, opacity: 0.7 }} />
      </View>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: width < 600 ? 20 : 48 }}>
          <View style={{ minHeight: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#E9EDF5' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', ...elevation.raised }}><Ionicons name="medkit" size={23} color={colors.white} /></View>
              <View><Text style={{ fontFamily: 'Inter_700Bold', fontSize: 19, color: colors.navy900, letterSpacing: -0.4 }}>Medi<Text style={{ color: colors.teal }}>Book</Text></Text><Text style={{ fontFamily: 'Inter_500Medium', fontSize: 10, color: colors.textFaint, letterSpacing: 1.1 }}>CARE, MADE SIMPLE</Text></View>
            </View>
            {wide ? <View style={{ flexDirection: 'row', gap: 34, alignItems: 'center' }}>{['How it works', 'Diagnostics', 'For care teams'].map((item) => <Text key={item} style={{ fontFamily: 'Inter_500Medium', color: colors.textMuted, fontSize: 14 }}>{item}</Text>)}</View> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: width < 500 ? 8 : 14 }}>
              <Pressable onPress={() => nav.navigate('Login')} accessibilityRole="button" style={({ pressed }) => [{ paddingHorizontal: width < 500 ? 10 : 18, minHeight: 44, justifyContent: 'center', borderRadius: 14 }, pressed && { opacity: 0.7 }]}><Text style={{ fontFamily: 'Inter_600SemiBold', color: colors.navy900, fontSize: 14 }}>Sign in</Text></Pressable>
              <Pressable onPress={() => nav.navigate('Register')} accessibilityRole="button" {...hoverHandlers('top-cta')} style={({ pressed }) => [{ backgroundColor: colors.primary, paddingHorizontal: width < 500 ? 13 : 20, minHeight: 46, borderRadius: 14, flexDirection: 'row', gap: 8, alignItems: 'center', ...elevation.raised, transform: [{ translateY: hovered === 'top-cta' ? -2 : 0 }, { scale: pressed ? 0.98 : 1 }] }]}><Text style={{ color: colors.white, fontFamily: 'Inter_600SemiBold', fontSize: 14 }}>Get started</Text><Ionicons name="arrow-forward" size={16} color={colors.white} /></Pressable>
            </View>
          </View>

          <View style={{ alignItems: 'center', paddingTop: wide ? 62 : 42, paddingBottom: 35 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: '#CBD8FF', backgroundColor: '#F0F4FF', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 9 }}><View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: colors.teal }} /><Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1.1 }}>YOUR HEALTH, ONE SIMPLE BOOKING</Text></View>
            <Text accessibilityRole="header" style={{ color: colors.navy900, fontFamily: 'Inter_700Bold', fontSize: width > 1150 ? 65 : width > 700 ? 52 : width < 390 ? 35 : 40, lineHeight: width > 1150 ? 75 : width > 700 ? 62 : width < 390 ? 43 : 49, letterSpacing: width < 600 ? -1.5 : -2.5, textAlign: 'center', maxWidth: 1050, marginTop: 26 }}>Healthcare Diagnostic <Text nativeID="medibook-heading-gradient" style={{ color: colors.primary }}>Booking &amp; Management Platform</Text></Text>
            <Text style={{ textAlign: 'center', color: colors.textMuted, fontFamily: 'Inter_400Regular', fontSize: width > 700 ? 18 : 15, lineHeight: width > 700 ? 29 : 24, maxWidth: 650, marginTop: 18 }}>Find trusted diagnostic centers, compare tests and book a time that works for you — all in one calm, secure place.</Text>
            <View style={{ flexDirection: width < 430 ? 'column' : 'row', gap: 12, marginTop: 27, width: width < 430 ? '100%' : undefined, justifyContent: 'center' }}>
              <Pressable onPress={() => nav.navigate('Register')} accessibilityRole="button" {...hoverHandlers('hero-cta')} style={({ pressed }) => [{ backgroundColor: colors.primary, minHeight: 58, borderRadius: 17, paddingHorizontal: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, ...elevation.raised, transform: [{ translateY: hovered === 'hero-cta' ? -3 : 0 }, { scale: pressed ? 0.985 : 1 }] }]}><Text style={{ color: colors.white, fontFamily: 'Inter_700Bold', fontSize: 16 }}>Get started</Text><Ionicons name="arrow-forward" size={19} color={colors.white} /></Pressable>
              <Pressable onPress={() => nav.navigate('Login')} accessibilityRole="button" {...hoverHandlers('sign-in')} style={({ pressed }) => [{ backgroundColor: colors.white, borderWidth: 1, borderColor: '#DDE4F0', minHeight: 58, borderRadius: 17, paddingHorizontal: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, transform: [{ translateY: hovered === 'sign-in' ? -2 : 0 }, { scale: pressed ? 0.985 : 1 }] }]}><Text style={{ color: colors.navy900, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>I have an account</Text></Pressable>
            </View>
          </View>

          <View style={{ width: '100%', maxWidth: 1050, alignSelf: 'center', minHeight: wide ? 270 : 390, backgroundColor: '#102B4B', borderRadius: 28, padding: width < 600 ? 22 : 34, marginBottom: 24, overflow: 'hidden', flexDirection: wide ? 'row' : 'column', alignItems: 'center', justifyContent: 'space-between', gap: 24, ...elevation.raised }}>
            <View pointerEvents="none" style={{ position: 'absolute', width: 350, height: 350, borderRadius: 175, right: wide ? 180 : -115, top: -210, backgroundColor: '#1769AA', opacity: 0.35 }} />
            <View pointerEvents="none" style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, right: -70, bottom: -135, backgroundColor: '#0D9488', opacity: 0.3 }} />
            <View style={{ flex: 1, maxWidth: 490, alignSelf: wide ? 'center' : 'stretch' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8 }}><Ionicons name="sparkles" size={14} color="#70E1D0" /><Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1, color: '#B8F1E8' }}>LESS STRESS. MORE CLARITY.</Text></View>
              <Text style={{ color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: width < 600 ? 25 : 31, lineHeight: width < 600 ? 32 : 39, letterSpacing: -0.8, marginTop: 18 }}>A better way to book your next health check.</Text>
              <Text style={{ color: '#C0D1E5', fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, marginTop: 10, maxWidth: 420 }}>Choose a test, find a nearby diagnostic center and pick a time that fits your day.</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 20 }}>
                {[{ icon: 'shield-checkmark' as const, label: 'Secure checkout' }, { icon: 'time-outline' as const, label: 'Flexible slots' }].map((tag) => <View key={tag.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.17)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 }}><Ionicons name={tag.icon} size={14} color="#70E1D0" /><Text style={{ color: '#E1EBF7', fontFamily: 'Inter_500Medium', fontSize: 11 }}>{tag.label}</Text></View>)}
              </View>
            </View>
            <Pressable onPress={() => nav.navigate('Register')} accessibilityRole="button" accessibilityLabel="Preview the booking process" {...hoverHandlers('booking-preview')}
              style={({ pressed }) => [{ width: wide ? 300 : '100%', maxWidth: 360, borderRadius: 22, backgroundColor: '#FFFFFF', padding: 19, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', ...elevation.raised, transform: [{ translateY: hovered === 'booking-preview' ? -5 : 0 }, { scale: pressed ? 0.99 : 1 }] }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text style={{ color: '#152D4B', fontFamily: 'Inter_600SemiBold', fontSize: 13 }}>Your booking, made simple</Text><View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: '#E8F7F4', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="calendar-clear" size={17} color="#0D9488" /></View></View>
              <View style={{ gap: 12, marginTop: 17 }}>
                {[{ n: '01', title: 'Choose a diagnostic test', icon: 'flask-outline' as const }, { n: '02', title: 'Pick a nearby center', icon: 'location-outline' as const }, { n: '03', title: 'Select a time that suits you', icon: 'time-outline' as const }].map((step, index) => <View key={step.n} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 9, borderRadius: 13, backgroundColor: index === 0 ? '#F0F5FF' : '#FAFBFD' }}><View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: index === 0 ? '#DDE8FF' : '#EDF5F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name={step.icon} size={16} color={index === 0 ? colors.primary : '#0D9488'} /></View><Text style={{ flex: 1, color: '#34465D', fontFamily: 'Inter_500Medium', fontSize: 11 }}>{step.title}</Text><Text style={{ color: '#9AA8B9', fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>{step.n}</Text></View>)}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EDF0F5' }}><Ionicons name="lock-closed" size={12} color="#0D9488" /><Text style={{ color: '#718097', fontFamily: 'Inter_500Medium', fontSize: 10 }}>Your details stay protected</Text></View>
            </Pressable>
          </View>

          <View style={{ width: '100%', maxWidth: 1050, alignSelf: 'center', backgroundColor: colors.white, borderRadius: 26, borderWidth: 1, borderColor: '#E5EAF4', padding: width < 600 ? 18 : 26, ...elevation.raised, marginBottom: 25 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}><View><Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: colors.navy900 }}>Your care, at a glance</Text><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: colors.textFaint, marginTop: 4 }}>A smoother way to plan your health checks</Text></View><View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: '#EAF7F5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="pulse" size={21} color={colors.teal} /></View></View>
            <View style={{ flexDirection: width < 650 ? 'column' : 'row', gap: 12 }}>
              {[
                { icon: 'location' as const, tint: colors.primary, bg: '#EEF2FF', title: 'Find a center', detail: 'Trusted labs near you' },
                { icon: 'flask' as const, tint: '#0C9A89', bg: '#E9F8F5', title: 'Compare tests', detail: 'Clear prices, all in one place' },
                { icon: 'calendar' as const, tint: '#8B5CF6', bg: '#F3EEFF', title: 'Choose your time', detail: 'Book around your day' },
              ].map((item, index) => {
                const key = `feature-${index}`;
                const active = hovered === key;
                return <Pressable key={item.title} onPress={() => nav.navigate('Register')} {...hoverHandlers(key)} style={({ pressed }) => [{ flex: 1, minHeight: 90, borderRadius: 18, borderWidth: 1, borderColor: active ? '#C8D5FF' : '#EDF0F6', backgroundColor: active ? '#FBFCFF' : '#FFFFFF', padding: 15, flexDirection: 'row', gap: 12, alignItems: 'center', transform: [{ translateY: active ? -3 : 0 }, { scale: pressed ? 0.99 : 1 }], ...elevation.card }]}><View style={{ width: 43, height: 43, borderRadius: 14, backgroundColor: item.bg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={item.icon} size={21} color={item.tint} /></View><View style={{ flex: 1 }}><Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colors.navy900 }}>{item.title}</Text><Text style={{ fontFamily: 'Inter_400Regular', fontSize: 11, color: colors.textFaint, marginTop: 4 }}>{item.detail}</Text></View><Ionicons name="arrow-forward" size={16} color={active ? colors.primary : '#A7B1C2'} /></Pressable>;
              })}
            </View>
          </View>

          <View style={{ flexDirection: width < 600 ? 'column' : 'row', justifyContent: 'center', alignItems: 'center', gap: width < 600 ? 10 : 32, paddingVertical: 12, paddingBottom: 30 }}>
            {[{ icon: 'shield-checkmark' as const, text: 'Secure booking' }, { icon: 'time' as const, text: 'Flexible appointments' }, { icon: 'heart' as const, text: 'Care that puts you first' }].map((item) => <View key={item.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Ionicons name={item.icon} size={16} color={colors.teal} /><Text style={{ color: colors.textMuted, fontFamily: 'Inter_500Medium', fontSize: 12 }}>{item.text}</Text></View>)}
          </View>
          <Text style={{ textAlign: 'center', color: '#9AA6B8', fontFamily: 'Inter_400Regular', fontSize: 11, paddingBottom: 22 }}>Demo platform · all centers and data are fictional</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const loginSchema = z.object({ email: z.string().min(1, 'Enter your email').email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });
type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const nav = useNavigation<any>();
  const { login } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const { control, handleSubmit } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const submit = handleSubmit(async (v) => {
    setBusy(true); setFormError('');
    try { await login(v.email, v.password); }
    catch (e) {
      const err = toApiError(e);
      const msg = err.status === 401 ? 'Incorrect email or password.' : err.message;
      setFormError(msg); toast(msg, 'error');
    } finally { setBusy(false); }
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Welcome back" subtitle="Log in to manage your appointments" />
      {formError ? <ErrorBanner text={formError} /> : null}
      <FormField control={control} name="email" label="Email address" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" />
      <FormField control={control} name="password" label="Password" password placeholder="Your password" onSubmitEditing={() => { submit(); }} />
      <PrimaryButton title="Log in" onPress={submit} loading={busy} />
      <Pressable onPress={() => nav.replace('Register')} accessibilityRole="link" style={{ alignSelf: 'center', padding: spacing.lg }}>
        <Text style={typography.body}>New to MediBook? <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Create an account</Text></Text>
      </Pressable>
    </Screen>
  );
}

const registerSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().min(1, 'Enter your email').email('Enter a valid email'),
  phone: z.string().trim().regex(/^\+?[0-9 ]{10,15}$/, 'Enter a valid phone number (10–15 digits)'),
  password: z.string().min(8, 'Use at least 8 characters'),
  confirm_password: z.string(),
  terms: z.boolean().refine((v) => v, 'Please accept the terms to continue'),
}).refine((d) => d.password === d.confirm_password, { path: ['confirm_password'], message: 'Passwords do not match' });
type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const nav = useNavigation<any>();
  const { register } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const { control, handleSubmit, setError, setValue, watch, formState: { errors } } =
    useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { full_name: '', email: '', phone: '', password: '', confirm_password: '', terms: false } });
  const terms = watch('terms');

  const submit = handleSubmit(async (v) => {
    setBusy(true); setFormError('');
    try {
      await register({ full_name: v.full_name.trim(), email: v.email, phone: v.phone.trim(), password: v.password, confirm_password: v.confirm_password });
      toast('Account created. Welcome to MediBook!', 'success');
    } catch (e) {
      const err = toApiError(e);
      // Server-side validation messages are mapped back onto their fields.
      for (const [k, m] of Object.entries(err.fields)) if (k in v) setError(k as keyof RegisterForm, { message: m });
      setFormError(err.message);
    } finally { setBusy(false); }
  });

  return (
    <Screen edges={['top', 'bottom']}>
      <Header title="Create your account" subtitle="It only takes a minute" />
      {formError ? <ErrorBanner text={formError} /> : null}
      <FormField control={control} name="full_name" label="Full name" icon="person-outline" autoComplete="name" placeholder="Your name" />
      <FormField control={control} name="email" label="Email address" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="you@example.com" />
      <FormField control={control} name="phone" label="Phone number" icon="call-outline" keyboardType="phone-pad" placeholder="+91 98765 43210" />
      <FormField control={control} name="password" label="Password" password placeholder="At least 8 characters" />
      <FormField control={control} name="confirm_password" label="Confirm password" password placeholder="Repeat your password" />
      <Pressable onPress={() => setValue('terms', !terms, { shouldValidate: true })} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}
        accessibilityLabel="I accept the terms and privacy policy" style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginBottom: spacing.sm, minHeight: 44 }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: terms ? colors.primary : colors.border, backgroundColor: terms ? colors.primary : colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          {terms ? <Ionicons name="checkmark" size={16} color={colors.white} /> : null}
        </View>
        <Text style={[typography.body, { flex: 1 }]}>I accept the terms and privacy policy (demo app, no real health data)</Text>
      </Pressable>
      {errors.terms ? <Text style={[typography.error, { marginBottom: spacing.md }]}>{errors.terms.message}</Text> : null}
      <PrimaryButton title="Create account" onPress={submit} loading={busy} style={{ marginTop: spacing.sm }} />
      <Pressable onPress={() => nav.replace('Login')} accessibilityRole="link" style={{ alignSelf: 'center', padding: spacing.lg }}>
        <Text style={typography.body}>Already registered? <Text style={{ color: colors.primary, fontFamily: 'Inter_600SemiBold' }}>Log in</Text></Text>
      </Pressable>
    </Screen>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: spacing.sm, backgroundColor: colors.dangerSoft, padding: spacing.md, borderRadius: radii.md, marginBottom: spacing.lg }}>
      <Ionicons name="alert-circle" size={20} color={colors.danger} />
      <Text style={[typography.label, { color: colors.danger, flex: 1 }]}>{text}</Text>
    </View>
  );
}
