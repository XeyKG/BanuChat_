# CHECKPOINT BANUCHAT — OE5

## Nota de precedencia — OE5-H0, 27 de octubre de 2026

El cuerpo posterior es el checkpoint histórico del 24 de octubre, sin reescribir
sus resultados. El producto objetivo actual es `ccd_authenticated`, REST v2,
documentación CCD current y módulos auxiliares ficticios. La
[validación técnica Mobile](../../eval/mobile/results/ccd-current-mobile-validation.md)
posterior acredita recorridos Android físicos del agente y 41 pruebas locales;
la [regresión diagnóstica](../../eval/rag-quality/results/ccd-mobile-diagnostic-fee-regression.md)
acredita la corrección posterior, sin convertirlas en aceptación humana.

El [protocolo OE5 actualizado](../../eval/mobile/oe5-student-validation-protocol.md)
y sus instrumentos están **READY_FOR_ACADEMIC_REVIEW**; muestra, diez ítems,
cinco tareas y umbrales se mantienen. Ningún participante reclutado/evaluado.
**PENDIENTE DE CONFIRMACIÓN POR EL RESPONSABLE ACADÉMICO: procedimiento/revisión aplicable antes del reclutamiento.**
La preparación no cierra OE5 original: iOS físico, push remoto, accesibilidad y
aceptación humana conservan sus brechas. Las menciones posteriores a Android
pendiente, release sintética y notificaciones describen aquel corte histórico.

## Checkpoint original del 24 de octubre de 2026

24 de octubre de 2026. Implementación preparada sobre
`085292d10eaa54e6acbba83b67cb33a7163d36a4`, con árbol limpio al inicio. No se hizo
commit ni push. El alcance se limitó a Mobile, sus contratos REST ya consumidos y los
instrumentos de evaluación; no se modificaron REST, backend, SQL, MCP, N8N, Docker ni
los corpus.

## A. Funcionalidades reutilizadas

- autenticación v2 sintética y CCD con access en memoria, refresh en SecureStore,
  recuperación y logout;
- navegación protegida y capacidades server-side;
- creación, continuidad y borrado permitido de conversaciones;
- chat, fast paths existentes, fallback documental, citas y visor de documentos;
- historial por owner y aislamiento del modo CCD autenticado;
- calendario con filtros y hora de Bogotá, progreso/cursos completados y anuncios;
- conservación de mensajes ante 409 y recuperación manual de POST incierto sin retry;
- estados de carga, error, vacío y reintento ya existentes.

No se reescribieron pantallas ni servicios. El modo `ccd_local` histórico y el modo
`ccd_authenticated` conservan sus límites; las nuevas notificaciones no se exponen en CCD.

## B. Funcionalidades completadas

- pantalla protegida de Notificaciones para cuentas sintéticas;
- solicitud/lectura de permiso y rechazo explícito;
- canal Android `banuchat-reminders`;
- hasta 12 recordatorios locales derivados de calendario y anuncios actuales, 24 horas
  antes, con reemplazo por clave estable;
- prueba local manual a cinco segundos, rotulada como distinta de push remoto;
- recepción foreground y apertura hacia Calendario/Anuncios;
- validación estricta de schema, destino, capacidad y `principal_id` antes de navegar;
- deduplicación de programación y de respuestas procesadas;
- preferencias/identificadores en SecureStore por cuenta y cancelación al desactivar,
  cambiar de cuenta o cerrar sesión, incluida limpieza de una sincronización concurrente;
- payload sin contraseña, token, texto de chat ni dato personal; solo metadatos sintéticos,
  UUID opaco de cuenta, release/recurso y destino permitido;
- indicación de release sintética en Calendario y corrección del aviso de onboarding CCD.

## C. Calendario y progreso

Mobile continúa consumiendo exclusivamente REST. Calendario muestra el identificador corto
de la release devuelto por el API, conserva la ventana de 30 días y sus filtros, y alimenta
los recordatorios solo si Calendario, Anuncios y `/auth/me` coinciden en release. Progreso
conserva filtros, porcentajes, fechas y cursos completados sin cambio de contrato.

La evidencia OE4 existente acredita que la release
`6cf074d2-8d8a-4e21-967d-68a5c94f6946` contenía alta/modificación y excluía cancelación/
eliminación. En este trabajo no hubo API sintética escuchando en 3002/3003 ni teléfono;
por ello **no se declara** que Mobile haya mostrado esa release en una ejecución real.
El plan de dispositivo exige volver a fijar y comprobar la release antes de calificar.

## D. Estado de notificaciones push

Se instalaron las versiones compatibles con Expo SDK 57 de `expo-notifications` y
`expo-dev-client`, y se configuró el plugin de notificaciones. La guía oficial confirma que
push remoto no funciona en Expo Go para SDK 53+ y requiere development build; Android
además requiere canal/FCM y iOS requiere credenciales/dispositivo aplicables:

- https://docs.expo.dev/push-notifications/push-notifications-setup/
- https://docs.expo.dev/push-notifications/faq/

Estado real:

| Capacidad | Estado |
| --- | --- |
| Permiso, rechazo, canal, notificación local, recepción y apertura | Implementado; ejecución física pendiente |
| Casos sintéticos calendario/anuncios | Implementados como recordatorios locales |
| Development build | Dependencia/config plugin preparados; build firmado no creado |
| Expo projectId y FCM/APNs | Pendientes; no hay credenciales autorizadas |
| Registro token→principal en backend | Pendiente; REST congelado no ofrece contrato autorizado |
| Renovación/caducidad y `DeviceNotRegistered` server-side | Pendiente con el registro backend |
| Revocación remota al logout | Pendiente; la limpieza local por cuenta sí está implementada |
| Push CCD | No habilitado por diseño |

Mobile no obtiene ni muestra un ExpoPushToken mientras no exista registro seguro. Inventar
un endpoint o persistir el token localmente no habría satisfecho aislamiento ni revocación.

## E. Autenticación y aislamiento

Las pruebas existentes conservaron login, restore, 401, rotación de refresh, logout offline,
owner de historial, CCD y ausencia de bypass anónimo. OE5 añade pruebas puras que rechazan
payloads de otra cuenta/capacidad y destinos arbitrarios. Las rutas de Notificaciones están
bajo la misma guardia de capacidades sintéticas que Calendario/Progreso/Anuncios.

Esto es evidencia automatizada, no una prueba en dos dispositivos. La cuenta BanuChat sigue
siendo ficticia y no equivale a identidad UNAB.

## F. Pruebas ejecutadas

| Prueba | Resultado observado |
| --- | --- |
| `npm run typecheck` | PASS, sin errores |
| `npm run lint -- --no-cache` | PASS, sin hallazgos |
| `npm run test:local` | PASS, 38/38; incluye 36 regresiones y 2 casos de notificaciones |
| `npx expo-doctor@latest` | PASS, 21/21 después de alinear solo parches de SDK 57 |
| `npx expo export --platform all --output-dir .expo/oe5-export-retry` | PASS; bundles Hermes Android/iOS y 13 rutas Web |
| Primer `expo export` con `%TEMP%` del host | No calificable: Hermes recibió `permission denied`; repetición con temp local pasó |
| `npm audit --omit=dev` | 8 avisos (3 moderados, 5 altos) en árbol Expo/router; las correcciones sugeridas son cambios incompatibles de SDK, no aplicadas |
| `adb devices`, AVD, Xcode | BLOCKED: `adb`/`emulator` no instalados y Xcode no disponible en Windows |
| Integración REST sintética real | No ejecutada: 3002/3003 no escuchaban; solo PostgreSQL CCD aislado estaba activo |

No se ejecutaron tests de backend, Docker, PostgreSQL, Ollama, E2E remoto, FCM/APNs ni
servicios externos. La exportación no sustituye un build firmado ni una ejecución física.

## G. Android, iOS y accesibilidad

Android/iOS compilaron sus bundles JavaScript/Hermes; no se afirma instalación ni ejecución.
iOS físico permanece pendiente de macOS/Xcode, firma y dispositivo. Android físico y push
local/remoto permanecen pendientes de SDK de plataforma, development build y teléfono.

Se preservaron escalado de texto y scroll, teclado en login/chat, touch targets, roles,
labels, estados busy/disabled, regiones live/alert y contenido documental seleccionable.
Se corrigieron tonos usados como texto pequeño: `muted`, `success`, `warning` y `amber`
superan ahora 4,5:1 sobre sus superficies habituales según cálculo sRGB. La validación real
con TalkBack/VoiceOver, texto ampliado y gestos sigue pendiente; revisión estática no equivale
a WCAG ni a accesibilidad en dispositivo.

## H. Cinco tareas y SUS

`eval/mobile/oe5-student-validation-protocol.md` fija antes de ejecutar:

- elegibilidad, diversidad de programas y muestra mínima;
- consentimiento, minimización y separación de contactos;
- versión/dispositivo/release congelados;
- instrucciones estándar y cinco tareas con tiempo, resultado y éxito/fallo;
- registro de tiempos, errores, asistencia y bloqueos;
- SUS de diez ítems y fórmula individual/media;
- tasa de completación con numerador/denominador y umbrales estrictos;
- análisis de resultados adversos sin imputación ni cambio a posteriori.

No se reclutó a nadie ni se generaron resultados. Con diez participantes, >85 % exige al
menos 43/50 tareas; la aceptación también exige media SUS >70 y ningún individual <50.

## I. Estado de requisitos OE5

| Requisito | Estado |
| --- | --- |
| Login, chat, citas, documentos, historial, calendario, progreso, anuncios y logout | Implementados/reutilizados; regresión automática PASS |
| Conversación incompatible con release | Implementado previamente: conserva historial y exige nueva conversación explícita |
| Separación sintético/CCD | Implementada y protegida; regresión automática PASS |
| Notificación local sintética y UX de permisos | Implementada; dispositivo pendiente |
| Push remoto completo | Parcial/bloqueado por backend, credenciales, build y dispositivo |
| Accesibilidad estática | Mejorada/parcial; lector de pantalla y texto ampliado físicos pendientes |
| Android físico | Pendiente verificable |
| iOS | Bundle PASS; simulador/dispositivo no ejecutados |
| Prueba de errores 401/409/timeout | Cubierta parcialmente en tests; recorrido físico pendiente |
| 403/503 real | Instrumentado en plan; entorno controlado pendiente |
| Estudio ≥10 estudiantes y umbrales | Protocolo preparado; ejecución pendiente |

## J. Implicaciones para OE6

Antes de despliegue/evaluación se requiere decidir y autorizar un contrato de dispositivos
autenticado, almacenamiento mínimo, revocación, receipts/caducidad, rate limiting y política
de retención; configurar FCM/APNs/projectId sin commitear secretos; generar development y
release builds; ejecutar Android/iOS reales; cerrar o aceptar los avisos de dependencias; y
completar aprobación, reclutamiento y estudio SUS. OE6 no puede presentar la exportación ni
las notificaciones locales como validación de push remoto o despliegue institucional.

## K. Cierre

OE5 queda técnicamente más completo en Mobile y metodológicamente preparado, sin alterar
contratos congelados ni perder capacidades existentes. El checkpoint es **parcial**: código,
tests, lint, doctor y bundles pasan; hardware, push remoto, integración REST observada y
validación humana conservan bloqueos explícitos. No se avanza automáticamente a OE6.
