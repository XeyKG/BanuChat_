export const colors = {
  brand: '#172554',
  primary: '#1D4ED8',
  primaryStrong: '#1E40AF',
  primarySoft: '#EFF6FF',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#64748B',
  disabled: '#94A3B8',
  error: '#B91C1C',
  errorSoft: '#FEF2F2',
  warning: '#92400E',
  warningSoft: '#FFFBEB',
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
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  caption: 12,
  small: 14,
  body: 16,
  heading: 22,
  title: 30,
} as const;

export const layout = {
  minTouchTarget: 44,
  controlHeight: 48,
  maxContentWidth: 560,
  maxReadingWidth: 680,
} as const;
