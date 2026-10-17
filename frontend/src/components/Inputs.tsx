import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, fonts, radii, sizes, spacing, typography } from '../design-system/tokens';

interface FieldProps extends Omit<TextInputProps, 'style'> {
  label: string; error?: string; icon?: keyof typeof Ionicons.glyphMap; right?: React.ReactNode;
}

export function TextInputField({ label, error, icon, right, ...rest }: FieldProps) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={[typography.label, { marginBottom: 6 }]}>{label}</Text>
      <View style={[styles.box, focus && styles.focus, !!error && styles.err]}>
        {icon ? <Ionicons name={icon} size={sizes.icon.md} color={colors.textFaint} /> : null}
        <TextInput {...rest} accessibilityLabel={label} placeholderTextColor={colors.textFaint}
          onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }} onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
          style={styles.input} />
        {right}
      </View>
      {error ? <Text style={[typography.error, { marginTop: 6 }]} accessibilityLiveRegion="polite">{error}</Text> : null}
    </View>
  );
}

export function PasswordInputField(props: FieldProps) {
  const [show, setShow] = useState(false);
  return (
    <TextInputField {...props} icon="lock-closed-outline" secureTextEntry={!show} autoCapitalize="none" autoCorrect={false}
      right={
        <Pressable onPress={() => setShow((s) => !s)} hitSlop={10} accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={sizes.icon.md} color={colors.textMuted} />
        </Pressable>
      } />
  );
}

/** react-hook-form binding so screens stay declarative. */
export function FormField<T extends FieldValues>({ control, name, password, ...rest }: FieldProps & { control: Control<T>; name: Path<T>; password?: boolean }) {
  return (
    <Controller control={control} name={name}
      render={({ field: { value, onChange, onBlur }, fieldState: { error } }) => {
        const P = password ? PasswordInputField : TextInputField;
        return <P {...rest} value={(value as string) ?? ''} onChangeText={onChange} onBlur={onBlur} error={error?.message} />;
      }} />
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Search tests or centers', onSubmit }: { value: string; onChangeText: (t: string) => void; placeholder?: string; onSubmit?: () => void }) {
  return (
    <View style={[styles.box, { backgroundColor: colors.surface }]}>
      <Ionicons name="search" size={sizes.icon.md} color={colors.textFaint} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.textFaint}
        accessibilityLabel={placeholder} returnKeyType="search" onSubmitEditing={onSubmit} style={styles.input} autoCorrect={false} />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={sizes.icon.md} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: sizes.input, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.lg },
  focus: { borderColor: colors.primary },
  err: { borderColor: colors.danger },
  input: { flex: 1, minHeight: sizes.input - 4, fontFamily: fonts.regular, fontSize: 16, color: colors.text, outlineWidth: 0 } as never,
});
