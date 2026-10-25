export function mobileMode(): 'synthetic'|'ccd_local'|'ccd_authenticated' {
  const mode = process.env.EXPO_PUBLIC_DEMO_MODE ?? 'ccd_authenticated';
  if (mode !== 'synthetic' && mode !== 'ccd_local' && mode !== 'ccd_authenticated') throw new Error('INVALID_DEMO_MODE');
  return mode;
}
export const isCcdLocal=()=>mobileMode()==='ccd_local';
export const isCcdAuthenticated=()=>mobileMode()==='ccd_authenticated';
export const isCcdKnowledge=()=>mobileMode()!=='synthetic';
export const CCD_AUTH_NOTICE='Cuenta BanuChat ficticia · Documentación CCD seleccionada para desarrollo local, sin aval institucional ni actualidad ratificada.';

export const CCD_NOTICE = 'Demostración CCD local · un solo operador. Sin autenticación ni privacidad por usuario. No es un servicio institucional publicado.';
