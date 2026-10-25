export const colors = {
  // Superficies
  background: '#F6F7FA',
  surface: '#FFFFFF',
  surfaceSoft: '#FAFBFD',

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
  small: 14,
  body: 16,
  heading: 22,
  title: 30,
  display: 34,
} as const;

export const layout = {
  minTouchTarget: 44,
  controlHeight: 52,
  maxContentWidth: 560,
  maxReadingWidth: 680,
} as const;

export const shadows = {
  soft: {
    shadowColor: '#10122A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  card: {
    shadowColor: '#10122A',
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pop: {
    shadowColor: '#10122A',
    shadowOpacity: 0.16,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
} as const;
