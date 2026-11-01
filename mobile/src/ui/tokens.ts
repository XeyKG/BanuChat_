export const colors = {
  // Superficies
  background: '#F5F6FA',
  surface: '#FFFFFF',
  surfaceSoft: '#F8F9FC',

  // Bordes
  border: '#E7E9F0',
  borderStrong: '#D4D8E3',
  hairline: 'rgba(16, 18, 35, 0.07)',

  // Texto
  ink: '#101223',
  text: '#101223',
  textSecondary: '#4B5062',
  muted: '#646B7D',
  disabled: '#B7BBC9',

  // Marca y acento
  brand: '#1B2350',
  brandDeep: '#141A3C',
  primary: '#3B4FE0',
  primaryStrong: '#2B3FC4',
  primarySoft: '#EEF0FE',
  accent: '#3B4FE0',
  accentStrong: '#2B3FC4',
  accentSoft: '#EEF0FE',
  accentSoftStrong: '#DFE4FD',

  // Estado
  success: '#087A55',
  successSoft: '#E7F7F0',
  warning: '#875A00',
  warningSoft: '#FFF8E6',
  error: '#C4322B',
  errorSoft: '#FEF1F0',
  errorBorder: '#F3C2BE',
  warningBorder: '#E9D6A4',
  onBrandSecondary: '#D8DDF4',

  // Acentos secundarios
  violet: '#6D4AC8',
  violetSoft: '#F1ECFC',
  amber: '#9A6100',
  amberSoft: '#FCF3E2',

  white: '#FFFFFF',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  section: 48,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999,
} as const;

export const typography = {
  caption: 12,
  meta: 13,
  small: 14,
  body: 16,
  heading: 22,
  title: 30,
  display: 34,
} as const;

// Shared rhythm; platforms retain their own layout and system typeface.
export const textStyles = {
  eyebrow: { fontSize: typography.caption, lineHeight: 18, fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },
  title: { fontSize: typography.title, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  heading: { fontSize: typography.heading, lineHeight: 30, fontWeight: '700', letterSpacing: -0.4 },
  body: { fontSize: typography.body, lineHeight: 25 },
  small: { fontSize: typography.small, lineHeight: 22 },
} as const;

export const motion = { press: 120, enter: 180, progress: 240 } as const;

export const layout = {
  minTouchTarget: 48,
  controlHeight: 52,
  maxContentWidth: 560,
  maxReadingWidth: 680,
} as const;

export const shadows = {
  soft: {
    boxShadow: '0 2px 6px rgba(16, 18, 42, 0.04)',
  },
  card: {
    boxShadow: '0 6px 20px rgba(16, 18, 42, 0.06)',
  },
  pop: {
    boxShadow: '0 8px 24px rgba(16, 18, 42, 0.12)',
  },
} as const;
