import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  navy900: '#0A1F44',
  navy700: '#14306B',
  primary: '#2152D9',
  primaryDark: '#173EA8',
  primarySoft: '#E8EEFD',
  teal: '#0E9F8E',
  tealSoft: '#E1F6F3',
  bg: '#F5F8FC',
  surface: '#FFFFFF',
  border: '#E1E7F0',
  text: '#0F1B33',
  textMuted: '#55657E',
  textFaint: '#8795AB',
  success: '#157347',
  successSoft: '#E3F5EA',
  warning: '#9A5B00',
  warningSoft: '#FFF1D6',
  danger: '#B42318',
  dangerSoft: '#FDE8E6',
  info: '#2152D9',
  infoSoft: '#E8EEFD',
  white: '#FFFFFF',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radii = { sm: 8, md: 12, lg: 16, xl: 24, pill: 999 } as const;
export const sizes = { button: 52, input: 52, icon: { sm: 16, md: 20, lg: 24, xl: 32 }, touch: 44 } as const;
export const breakpoints = { tablet: 768, desktop: 1100 } as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, color: colors.text } as TextStyle,
  title: { fontFamily: fonts.bold, fontSize: 24, lineHeight: 32, color: colors.text } as TextStyle,
  heading: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.text } as TextStyle,
  cardTitle: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.text } as TextStyle,
  price: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24, color: colors.navy900 } as TextStyle,
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text } as TextStyle,
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textMuted } as TextStyle,
  label: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20, color: colors.text } as TextStyle,
  error: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.danger } as TextStyle,
  badge: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16 } as TextStyle,
  button: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22 } as TextStyle,
};

const shadow = (o: number, r: number, y: number, e: number): ViewStyle =>
  Platform.select({
    ios: { shadowColor: '#0A1F44', shadowOpacity: o, shadowRadius: r, shadowOffset: { width: 0, height: y } },
    android: { elevation: e },
    default: { boxShadow: `0px ${y}px ${r * 2}px rgba(10,31,68,${o})` } as ViewStyle,
  }) as ViewStyle;

export const elevation = { none: {} as ViewStyle, card: shadow(0.06, 6, 2, 2), raised: shadow(0.1, 12, 6, 6) };
export const MAX_CONTENT_WIDTH = 720; // keeps wide browser layouts readable instead of stretching
