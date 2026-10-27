export function mobileMode(): 'synthetic'|'ccd_local'|'ccd_authenticated' {
  const mode = process.env.EXPO_PUBLIC_DEMO_MODE ?? 'ccd_authenticated';
  if (mode !== 'synthetic' && mode !== 'ccd_local' && mode !== 'ccd_authenticated') throw new Error('INVALID_DEMO_MODE');
  return mode;
}
export const isCcdLocal=()=>mobileMode()==='ccd_local';
export const isCcdAuthenticated=()=>mobileMode()==='ccd_authenticated';
export const isCcdKnowledge=()=>mobileMode()!=='synthetic';
export const CCD_AUTH_NOTICE='Cuenta BanuChat de demostración · Información CCD seleccionada para desarrollo y pruebas. Sin aval institucional; los datos auxiliares no representan tu expediente académico real.';
export const CCD_AUXILIARY_NOTICE='Datos ficticios de demostración. No corresponden a tu expediente académico real.';

export const CCD_NOTICE = 'Demostración CCD local · un solo operador. Sin autenticación ni privacidad por usuario. No es un servicio institucional publicado.';
