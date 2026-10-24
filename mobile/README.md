# BanuChat Mobile

## Estado vigente CCD autenticado

`EXPO_PUBLIC_DEMO_MODE=ccd_authenticated` añade CCD autenticado con REST v2 y
SecureStore; es distinto de `ccd_local`/v1 y del modo `synthetic` predeterminado.
Valida `me.evidence_mode=ccd_local`, contexto técnico y las tres capacidades
chat/historial/documentos. No permite seleccionar perfil/release, compartir
historial por contexto o usar v1 como bypass. Home y navegación ocultan progreso,
calendario y anuncios personales. El aviso visible identifica cuentas ficticias,
material seleccionado local y ausencia de aval/actualidad institucional.

Se conservan diseño y onboarding, adaptando su texto a las capacidades CCD.
Solo refresh se persiste en SecureStore, en una clave CCD separada por URL;
access permanece en memoria. Login acepta U+8 y legado BCH-DEMO-####.
Sesiones/recursos usan los servicios v2 existentes, con refresh/logout y sin retry
de POST incierto. El modo sintético conserva sus seis capacidades/corpus.

Arranque público sin secretos: `scripts/start-ccd-auth.ps1`. Las contraseñas
individuales se consultan personalmente desde DPAPI; no están en archivos
versionables. Procedimiento y guion en el
[runbook Android CCD](../docs/operations/ccd-auth-i1b-android.md). Desde O4, la API
canónica de 3003 apunta a `banuchat-dev` en 55453; Mobile no cambió su URL ni sus
contratos.
**Android no fue ejecutado ni aprobado por el agente**; typecheck, lint y pruebas
de servicios no sustituyen esa validación personal. Resultados/límites en el
[checkpoint O4](../docs/transition/docker-organization-o4-checkpoint.md).

## Antecedente AUTH-P4-L0

El modo synthetic usa ahora login propio por UID/contraseña y RESTv2 protegido;
seleccionar un perfil ya no autentica. La documentación v1/sesión por perfiles más
abajo se conserva como antecedente. CCD local mantiene su modo histórico separado.
Recuperación por correo **SUSPENDIDA**, sin registro público. No usar la configuración
LAN HTTP histórica para contraseñas o tokens. Configuración/canal seguro,
aprovisionamiento y límites en el [runbook](../docs/operations/auth-p4l0-login-local.md)
y [checkpoint](../docs/transition/bch04-auth-p4l0-checkpoint.md).

Implementación y pruebas locales no equivalen a validación completa en dispositivo.
Solo refresh se guarda en expo-secure-store57.0.4; access queda en memoria y no se
guarda contraseña. Web falla cerrado para autenticación; no reemplaza Android/iOS.

Aplicación móvil en Expo + React Native + TypeScript, inicializada con Expo SDK
57 y Expo Router. El dispositivo principal para desarrollo es un teléfono Android
real con Expo Go.

## Demostración CCD local — BCH-02 incremento 3

Modo explícito `EXPO_PUBLIC_DEMO_MODE=ccd_local`. El valor por defecto es
`synthetic`; no se cambia `.env.local` automáticamente ni se migra Expo/React Native.
La pantalla inicial identifica una demostración local para un operador, sin identidad
institucional, autenticación ni privacidad por usuario. No muestra el contexto técnico
como estudiante. Home prioriza el chat; calendario, progreso y anuncios están ocultos
y protegidos en Expo Router. Las fuentes y el visor conservan el contrato REST y
presentan los límites/advertencias que devuelve el backend sin resumirlos.

El historial CCD no enumera `/conversations?profile_key=ccd-local-demo`. Registra
solo IDs creados por esta apertura en memoria, consulta individualmente esos chats
y rechaza GET/POST de otros IDs antes de usar la red. No hay borrado CCD en la UI
ni en su cliente API. Finalizar o recargar pierde esa lista local; el backend sigue
conservando los chats. Es un alcance de interfaz para el operador, **no autorización
por usuario**: otros procesos locales aún podrían consultar el backend sin autenticación.
No compartir esta demostración entre personas ni abrir el listener en LAN.

Un HTTP 409 bloquea la continuación, conserva los mensajes y ofrece crear otra
conversación vacía por acción explícita. No se trasladan ni reenvían mensajes. REST
usa el mismo código `CONFLICT` para cambio de release y concurrencia; Mobile no
inventa una causa más precisa. Timeout/red siguen sin repetir el POST automáticamente.

La API CCD debe escuchar **solo en `127.0.0.1:3001`**. El cliente CCD rechaza URLs
LAN/públicas, credenciales y rutas distintas de `/api/v1`. Admite loopback, el alias
de host del emulador Android `10.0.2.2` y el preview web loopback descrito abajo.
Para un dispositivo USB con ADB operativo, la ruta prevista es:

```powershell
# Con un dispositivo autorizado visible en `adb devices -l`:
adb reverse tcp:3001 tcp:3001
adb reverse tcp:8081 tcp:8081
# Desde mobile, sin cambiar la configuración de la API:
$env:EXPO_PUBLIC_DEMO_MODE='ccd_local'
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:3001/api/v1'
npx expo start --localhost --port 8081
```

Abrir Expo Go compatible con el SDK 57 mediante `exp://127.0.0.1:8081`. Para un AVD
operativo, el host de API puede ser `http://10.0.2.2:3001/api/v1`, conservando el
bind del backend en loopback. **Estas rutas Android no se acreditaron en este
incremento**: el SDK existe, pero `adb devices -l` no encontró dispositivo y
`emulator -list-avds` no enumeró AVD. No se instaló ni generó Android nativo.

La comprobación realizada fue **Expo Web**, con viewport 390 × 844 para el chat CCD,
API real, PostgreSQL CCD y Ollama. Se utilizó un relay de desarrollo del mismo origen,
exclusivo de loopback: frontend `127.0.0.1:8083` → API fija `127.0.0.1:3001`.
No modifica CORS ni el listener de API; el relay valida Host/Origin y no admite DELETE.
Es una herramienta de evaluación local, no hosting ni un servicio institucional.

```powershell
# Terminal API, desde backend/api:
npm run start:ccd
# Terminal frontend, desde mobile:
$env:EXPO_PUBLIC_DEMO_MODE='ccd_local'
$env:EXPO_PUBLIC_API_BASE_URL='http://127.0.0.1:8083/api/v1'
$env:EXPO_NO_TELEMETRY='1'
npx expo export --platform web --output-dir .expo/ccd-web
node scripts/serve-local-web.mjs ccd_local
# Abrir http://127.0.0.1:8083 en el navegador local.
```

El preview guarda transacciones en `.expo/ccd_local-evidence`, ignorado por Git.
Solo para probar el 409 sin cambiar releases, crear allí el archivo
`simulate-conflict-once`: el siguiente POST de mensajes recibe un 409 marcado
`simulated: true` en la evidencia, sin llegar al backend; el archivo se renombra
al consumirse. No está habilitado por defecto ni forma parte del cliente móvil/API.

Validación local:

```powershell
npm run typecheck
npm run lint -- --no-cache
npm run test:local
```

Las seis pruebas usan el `tsx` ya instalado en `backend/api/node_modules` para
evitar otra dependencia móvil; requieren instalar previamente las dependencias API.
El [CHECKPOINT incremento 3](../docs/transition/bch02-increment-3-checkpoint.md)
registra resultados, capturas, conexión real, bloqueos y límites de plataforma.

La app consume exclusivamente la API REST de BanuChat; no accede directamente a
MCP, N8N ni PostgreSQL. Para configurar la URL de API local, copia `.env.example`
a `.env.local` y define `EXPO_PUBLIC_API_BASE_URL`. Por ejemplo:

```dotenv
EXPO_PUBLIC_API_BASE_URL=http://<IP-LAN-DEL-PC>:3000/api/v1
```

`EXPO_PUBLIC_*` se incluye en el bundle de la app y no debe contener secretos.
La URL del API no es un secreto. **Solo para el modo sintético**, en pruebas LAN el backend debe escuchar
temporalmente en `0.0.0.0`, y el celular y el PC deben estar conectados a la misma
red privada. El teléfono debe conectarse a la IP privada del PC, no a `0.0.0.0`.
No expongas el API a Internet.

## Desarrollo

```bash
npm install
npx expo start
```

Abre el proyecto con Expo Go en el teléfono Android.

## Estado del MVP móvil de demostración

Implementado: Expo SDK 57, React Native + TypeScript, Expo Router, URL base de API
configurable, sesión local para perfiles sintéticos, Home, navegación protegida,
creación de conversación al abrir Chat, chat con citas, estados de carga y error,
presentación local de Banu al iniciar el chat, calendario, progreso de cursos,
historial conversacional visible, consulta directa de anuncios sintéticos y apertura
interna de fuentes documentales desde respuestas nuevas o conversaciones reabiertas.
El [checkpoint histórico J3](../eval/integration/results/j3-checkpoint-2026-10-03.md)
documenta las validaciones manuales M1–M5 con Expo Go en Android físico; no cubre
historial y anuncios posteriores. Este README registra además las validaciones
manuales de M6.1, M6.1.1 y M6.1.2, sin atribuirlas a J3.
M6.2 aplica consistencia y pulido visual al flujo existente sin ampliar su
alcance funcional; todavía requiere validación manual en el dispositivo físico.

La aplicación implementa un flujo local de sesión para perfiles sintéticos de
demostración. Este mecanismo permite seleccionar, utilizar y cerrar una sesión
asociada a un perfil, pero no constituye autenticación institucional ni valida
credenciales reales. La sesión se conserva únicamente en memoria y puede perderse
al reiniciar completamente la aplicación.

Si el envío de un mensaje termina con timeout o fallo de red, la app no repite el
POST automáticamente. El usuario puede comprobar manualmente el historial para
reconciliar un turno confirmado o decidir explícitamente continuar si todavía no
aparece. Esta recuperación permanece en memoria y no ofrece idempotencia durable ni
una garantía de procesamiento exactamente una vez.

Las fuentes documentales con artifact disponible abren un visor interno que solicita
el archivo exclusivamente por `document_version_id`. El visor trata el cuerpo como
texto seleccionable, muestra el Markdown sintético sin ejecutar HTML ni enlaces y
maneja carga, error, 404 y reintento. El corpus actual usa Markdown; la app no afirma
interpretar otros formatos documentales.

La selección de perfiles del modo sintético conserva su alcance de demostración;
el modo CCD usa el contexto técnico sin identidad descrito arriba. Una futura autenticación de usuario final requiere diseño explícito;
no hay despliegue, identidad ni integración institucional previstos en el alcance
vigente. El backend actual usa Intent Router y Document RAG directo; Agent/ReAct
y MCP siguen pendientes como arquitectura objetivo.

Siguen pendientes la autenticación y autorización de usuario final, las
notificaciones push y la distribución/operación en producción.
