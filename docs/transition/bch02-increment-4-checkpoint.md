# CHECKPOINT BANUCHAT — BCH-02 incremento 4

Fecha local: 2026-10-21 (America/Bogota).
Base aceptada: `7ffb3f66fdf41cc4993ab7b1f8f658ac10ef9ce7`.
Estado: **validación Android bloqueada por ausencia de dispositivo/AVD disponible**.
Se completó únicamente el preflight. Detener aquí; Android no está probado.

## Entorno observado

| Componente | Resultado real |
| --- | --- |
| PC utilizado | Microsoft Windows 11 Home, versión 10.0.26200, 64 bits. |
| Dispositivo Android / versión de Android | Ninguno disponible; sistema Android no identificado ni probado. |
| SDK | `C:\Users\samue\AppData\Local\Android\Sdk`, coincide con la configuración de Android Studio. |
| ADB | Android Debug Bridge 1.0.41; platform-tools 37.0.0-14910828. |
| Emulador instalado | Android emulator 36.5.11.0, build 15261927. No se inició un emulador. |
| Node.js | v24.19.0. |
| Expo instalado en Mobile | 57.0.26. |
| CLI Expo local | 57.0.27; se invocó el ejecutable ya instalado, sin descargar paquetes. |

Comandos ejecutados con las rutas absolutas del SDK:

- `adb version`: correcto.
- `adb devices -l`: lista vacía, tanto al inicio como en la comprobación final.
  No apareció un teléfono autorizado, `unauthorized` ni `offline`.
- `emulator -version`: herramienta disponible.
- `emulator -list-avds`: salida sin nombres de AVD.
- `adb reverse --list`: **`error: no devices/emulators found`**.
- La ruta habitual `C:\Users\samue\.android\avd` no existe.

Existe una carpeta previa `system-images/android-26/google_apis`. Esto no demuestra
que haya un AVD operativo ni que esa imagen sea compatible con Expo Go para SDK 57.
No se modificó ni utilizó esa imagen. No se descargaron imágenes ni se creó un AVD.
El daemon ADB iniciado para el preflight se cerró al terminar.

## Compatibilidad Expo Go

Se confirmó la versión instalada del proyecto y su CLI. **No se pudo comprobar
compatibilidad efectiva de Expo Go**, porque no hay un Android al cual consultar
la aplicación instalada o donde abrir el proyecto. No se afirma que Expo Go esté
instalado ni que una versión genérica de la tienda admita este SDK.

La versión de Expo Go y la apertura efectiva del proyecto SDK 57 deben verificarse
en el dispositivo elegido. Si aparece un aviso de SDK incompatible, detener esa
prueba y seleccionar una distribución oficial compatible con SDK 57; no migrar
Expo/React Native ni generar un development build como solución implícita.

## Acciones concretas del operador — ruta preferida USB

1. Conectar un teléfono Android mediante un **cable con datos**, desbloquearlo y
   habilitar Opciones de desarrollador → Depuración USB en ese teléfono de prueba.
2. Aceptar en el teléfono la autorización RSA para este PC de confianza.
3. Ejecutar en PowerShell:

   ```powershell
   $adbPath='C:\Users\samue\AppData\Local\Android\Sdk\platform-tools\adb.exe'
   & $adbPath devices -l
   ```

   Debe aparecer un serial con estado **`device`**. Si aparece `unauthorized`,
   desbloquear y aceptar la autorización. Si no aparece nada, comprobar cable,
   puerto USB y detección/controlador del fabricante en el Administrador de
   dispositivos de Windows. No continuar hasta obtener `device`.
4. Abrir o instalar desde una fuente oficial Expo Go compatible con **SDK 57**.
   Registrar su versión y la versión de Android. Puede consultarse el paquete con
   `adb -s SERIAL shell dumpsys package host.exp.exponent`; la compatibilidad se
   acredita abriendo el proyecto, no solo leyendo `versionName`.
5. Con un solo dispositivo de prueba seleccionado, crear redirecciones USB:

   ```powershell
   & $adbPath -s SERIAL reverse tcp:3001 tcp:3001
   & $adbPath -s SERIAL reverse tcp:8081 tcp:8081
   & $adbPath -s SERIAL reverse --list
   ```

   Sustituir `SERIAL` por el valor observado. Estas redirecciones **no se ejecutaron
   en esta corrida**: no había destino. No cambiar la API a `0.0.0.0`.
6. Iniciar la API CCD existente en una terminal, desde `backend/api`:

   ```powershell
   npm run start:ccd
   ```

   Comprobar que anuncie modo `ccd_local` en `http://127.0.0.1:3001`. No ejecutar
   ingesta, cambiar releases ni abrir LAN para preparar esta prueba.
7. En otra terminal, desde `mobile`, configurar solo esa sesión de PowerShell:

   ```powershell
   $env:EXPO_PUBLIC_DEMO_MODE='ccd_local'
   $env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:3001/api/v1'
   npx expo start --localhost --port 8081
   ```

   Abrir `exp://127.0.0.1:8081` con Expo Go en el teléfono, por ejemplo:

   ```powershell
   & $adbPath -s SERIAL shell am start -a android.intent.action.VIEW -d 'exp://127.0.0.1:8081'
   ```

   Si la app no se abre o informa incompatibilidad, registrar el error real antes
   de corregir nada. No usar LAN, túnel público ni una actualización automática
   del SDK para evitarlo.
8. Con la app efectivamente abierta, registrar modelo, Android y versión de Expo
   Go; entonces ejecutar los casos nativos autorizados y capturar la interfaz sin
   información personal. Para el error de red, comprobar primero si el turno quedó
   persistido y no repetir automáticamente un POST incierto.

Como alternativa, el operador puede poner a disposición un AVD ya configurado y
compatible. Debe aparecer en `emulator -list-avds` y luego en `adb devices -l`.
Si habilitarlo requiere descargar una imagen o crear/configurar un emulador pesado,
pedir autorización específica antes. No se eligió ni creó uno en esta ejecución.

## Casos y pruebas de esta corrida

| Tipo | Estado |
| --- | --- |
| Preflight SDK, ADB, Expo y enumeración de destinos | Ejecutado; bloqueo reproducido y documentado. |
| Conexión USB mediante reverse | No establecida: no hay destino Android. |
| Compatibilidad efectiva Expo Go / SDK 57 | No comprobada; falta dispositivo y app ejecutándose. |
| Inicio, chat, seguimientos y corrección de curso en Android | No ejecutados. |
| Pruebas diagnósticas, contacto, citas, visor e historial en Android | No ejecutados. |
| Error de red/recuperación nativa sin POST duplicado | No ejecutado. |
| Teclado, scroll, atrás, área segura y campo de escritura Android | No ejecutados. |
| Capturas Android | Ninguna; no hay interfaz Android operativa que capturar. |
| Expo Web | No repetido. La evidencia del incremento 3 conserva su alcance Web. |
| Pruebas simuladas | Ninguna nueva. El 409 simulado del incremento 3 no se atribuye a Android. |
| Typecheck, lint, suites unitarias/E2E | No reejecutadas: no hubo cambios de código ni una app Android disponible. |

No se inició API, Metro, PostgreSQL, Ollama ni preview Web en este incremento.
No se reprodujo un defecto de aplicación que autorice corregir código. Tampoco
se identificó una necesidad de cambiar seguridad del backend.

## Evidencia y archivos

Registro local no público e ignorado por Git:
`data/ccd/evidence/bch02-increment-4/android-preflight.json`.
Contiene versiones observadas, listas vacías y error de ADB; no incluye seriales,
personas, UID, expedientes ni capturas ficticias.

Único archivo versionable modificado: este checkpoint. `git diff --check`, revisión
de espacios/finales de línea del archivo nuevo y revisión de alcance: aprobadas. Sin cambios en Mobile, SDK, dependencias,
backend, configuración de red, corpus, releases, embeddings, SQL o datos sintéticos.
No se ejecutaron comandos Docker, commit ni push.

**Siguiente condición para reanudar:** un destino Android compatible visible como
`device` en ADB. Hasta entonces, validación nativa pendiente; detener para Sala de Control.
