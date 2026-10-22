export function isCcdLocal(): boolean {
  const mode = process.env.EXPO_PUBLIC_DEMO_MODE ?? 'synthetic';
  if (mode !== 'synthetic' && mode !== 'ccd_local') throw new Error('INVALID_DEMO_MODE');
  return mode === 'ccd_local';
}

export const CCD_NOTICE = 'Demostración CCD local · un solo operador. Sin autenticación ni privacidad por usuario. No es un servicio institucional publicado.';
