# WEB-01 — BanuChat en navegador local

Fecha: **2026-10-31**, America/Bogota. Base inspeccionada: `02a847f`, árbol limpio.
Estado: **BANUCHAT_WEB_01_BROWSER_VALIDATED**.
Alcance acreditado: Edge **150.0.4078.48 headless** en Windows, aplicación Expo
exportada y REST v2 Unified real. No es validación humana ni despliegue público.

## Implementación

Se reutilizan Expo SDK 57, React Native Web, Expo Router, AuthSession, los clientes
REST y las pantallas de Mobile. Ya existían chat, citas desplegables, visor de texto,
historial, control de POST incierto y autorización por propietario. Faltaban el
almacén web explícito, un canal HTTP local seguro, confirmaciones web y composición
adaptable. El servidor histórico se conserva como antecedente y no se ejecutó.

- Adaptadores `.web` para refresh en memoria, URL same-origin y proveedor de
  notificaciones no disponible. Access continúa privado en AuthSession. No hay
  localStorage/sessionStorage/IndexedDB, cookies de sesión ni credenciales públicas.
- AuthSession conserva validaciones y rotación; añade únicamente una clasificación
  saneada de fallo de login para distinguir credenciales rechazadas de servicio
  ausente. La regresión falló antes del cambio y pasó después. Los mensajes nativos
  y SecureStore permanecen vigentes.
- Navegación lateral desde 1024 px y barra compacta debajo; se reutilizan marca,
  iconos, colores, conversación, compositor y fuentes. Home admite un ancho web
  mayor. Se mantienen los avisos CCD y de datos auxiliares ficticios.
- Confirmaciones por plataforma para historial y continuación tras envío incierto.
  Android sigue usando Alert. Notificaciones no tiene acceso ni ruta habilitada
  en navegador; no se importa Expo Notifications en el proveedor web.
- Servidor estático/proxy separado en `127.0.0.1:8085`, destino fijo
  `127.0.0.1:3004`. Valida Host/Origin/Fetch Metadata, rutas, métodos, query,
  cabeceras sensibles duplicadas y body de 16.384 bytes, también chunked. Rechaza
  rutas v1/administrativas y traversal. Conserva errores y bytes del backend,
  elimina cookies, usa no-store, no habilita CORS ni registra payloads. La CSP
  autoriza hashes de los scripts inline propios de Expo, sin permitir eval o
  scripts inline arbitrarios. No incorpora lógica de negocio ni reintentos.

## Evidencia operacional

Ejecución final: **22:15:22–22:15:49 UTC**, **18 comprobaciones PASS**. Evidencia
privada bajo `%LOCALAPPDATA%/BanuChat/web-01/9427117e-0696-419d-bc01-34e45742b452`:
`report.json`, capturas/DOM, `custody-and-services.json` y `evidence-manifest.json`.
ACL sin herencia, concedida al usuario; fuera del repositorio y OneDrive.
Se eliminaron los siete perfiles Edge temporales creados durante el incremento.
El evaluador versionable también comprobó su carga inicial con `--inspect`.

| Recorrido | Resultado observado |
| --- | --- |
| Carga, credencial incorrecta, login y Home | Aplicación hidratada; rechazo visible; login real y saludo del perfil ficticio. |
| Servicio de login ausente | 503 inyectado solo en la pestaña; mensaje específico. No se detuvo la API. |
| Crear chat y preguntar sobre temas de IA Generativa | Conversación persistida; respuesta real sobre contenidos del curso y cuatro fuentes. No acredita disponibilidad, matrícula ni derechos individuales. |
| Fuentes y documento | Desplegar, abrir cita documental permitida y leer el derivado CCD en el visor de texto. |
| Historial | Listar y reabrir la conversación propia con su respuesta. |
| Otra cuenta y acceso anónimo | GET y DELETE ajenos: 404; el listado de la segunda cuenta excluyó la conversación; GET anónimo: 401. La conversación propia continuó disponible. |
| Responsive | Capturas a 1366, 768 y 390 px; sin desbordamiento horizontal del documento raíz. |
| Horario confirmado del CCD para un domingo de 2030 | Abstención real y aviso de evidencia insuficiente. |
| Conflicto | 409 controlado en navegador, bloqueo del compositor y creación explícita de otra conversación; un solo POST. |
| Red incierta | Fallo controlado en navegador, aviso de resultado sin confirmar y GET de comprobación del historial; un solo POST, sin reenvío. |
| Borrado | Cancelar produjo cero DELETE; confirmar produjo uno. Se verificó primero que el destino fuera una conversación nueva del ensayo; luego GET 404. |
| Logout, ruta protegida, segunda cuenta y recarga | Logout visible; acceso documental/chat anterior bloqueado; login de la otra cuenta; recarga descartó la sesión. Almacenes web y cookies vacíos. |
| Consola | No se observaron contraseñas, access tokens ni contenido de la consulta en los mensajes examinados. El proxy solo emitió su arranque. |

Las respuestas positivas y la abstención proceden del código habitual y la API real.
503/409/pérdida de red son pruebas de interfaz controladas mediante DevTools, no
evidencia de una caída real de dependencias. No se simuló una respuesta RAG correcta.
La renovación serializada en memoria se verificó con reloj controlado; no se esperó
el vencimiento real de quince minutos en el navegador.

Incidencias conservadas en informes privados anteriores: una consulta inicial
terminó en abstención sin fuentes; no se modificó RAG para forzar una cita. Se
corrigieron selectores del evaluador para botones con nombre por texto y controles
visibles: Expo Router conserva pantallas ocultas en el stack. También se alcanzó
el límite vigente de login; una lectura confirmó seis intentos en la ventana con
vencimiento 22:15 UTC. Se esperó su vencimiento, sin resetear límites ni cuentas.
La interfaz conserva un error general para 429; el procedimiento exige detener
intentos y consultar el vencimiento.

## Pruebas y compilación

- `npm run typecheck`: PASS.
- Siete archivos focales: `web-auth`, `auth-session`, `ccd-authenticated`,
  `ccd-session-ownership`, `ccd-presentation`, `notifications-native` y
  `notifications`: **31/31 PASS**. Incluyen refresh concurrente bajo reloj
  controlado, logout, cuerpos tardíos de otra sesión, confirmaciones y regresión
  del adaptador nativo de recordatorios.
- `npm run web:test`: PASS. Backend sintético local; rechazos de origen/ruta/método,
  límites declarados/chunked, duplicación de Authorization, no-store, ausencia de
  CORS/Set-Cookie, conservación exacta de 409/binario/204 y error saneado si falta
  el backend de prueba.
- `npm run web:export`: PASS, 15 rutas estáticas y bundle web. Se comprobó ausencia
  de los marcadores del almacén SecureStore y preferencias nativas en el bundle web.
- Export Android con Hermes: **PASS, 1670 módulos**, conservando SDK y configuración
  del canal USB. Dos intentos fallaron por escritura del temporal de Windows; pasó
  usando `TEMP`/`TMP` en `mobile/.expo/web01-hermes-temp`. No fue defecto de código.
  Esto acredita el bundle Android, no un nuevo APK, Gradle ni ejecución física.
- `git diff --check`: PASS; enlaces nuevos comprobados y alcance revisado.

## Servicios y preservación

API habitual: PID **32444**, loopback 3004, sin reinicio; GET anónimo de `/auth/me`
devuelve 401. PostgreSQL Unified 55463 respondió consultas de solo lectura. N8N
15679 `/healthz`: 200; Ollama 11434 `/api/version`: 200. Metro conserva PID **24684**
en 8084. El servidor web respondió 200 durante las pruebas y se detiene al cerrar
la validación; se inicia con el procedimiento enlazado abajo.

Una lectura final confirmó **3/3 sesiones de la ejecución final revocadas**, incluidas
las sesiones de la segunda cuenta y la descartada por recarga. Recargar por sí solo
no revoca remotamente: el evaluador consultó el estado y limpió sus sesiones usando
el contrato existente. No se atribuye esa limpieza a una función del navegador.

Solo hubo escrituras funcionales autorizadas de login, sesiones y conversaciones de
las cuentas ficticias del ensayo. No se modificaron cuentas/conversaciones ajenas,
base/esquemas manualmente, corpus, releases, modelos, RAG, Agent, MCP, workflows
N8N, pipeline OE2 o contratos. No se publicaron fixtures adicionales ni se ejecutaron
OE1/RAGAS/scheduler. No se repite aquí una auditoría criptográfica de todo el corpus
ni una evaluación exhaustiva de las integraciones previamente cerradas.

## Entrega y límites

Arranque y URL: [procedimiento web local](../operations/web-local.md),
**http://127.0.0.1:8085/login**. Desde `mobile`: `npm run web:export`, luego
`npm run web:serve`. La API Unified debe estar disponible previamente.

Archivos: configuración/scripts y [README Mobile](../../mobile/README.md);
adaptadores en `mobile/src/auth`, `config`, `notifications` y `ui`; WebFrame;
ajustes acotados de layout/login/home/chat/history; [pruebas web](../../mobile/test/web-auth.test.ts)
y [proxy](../../mobile/scripts/test-unified-web.mjs). Documentos no cambió su
implementación ni renderiza HTML. El [evaluador opcional](../../mobile/scripts/check-unified-web-browser.mts)
no forma parte del frontend ni de los tests unitarios habituales.

WEB-02 queda sujeto a decisiones para transporte/sesión remotos, TLS, orígenes de
despliegue, navegadores adicionales, accesibilidad y validación humana autorizada.
No se acreditan Safari/iOS, teléfono web físico, push, SUS, autenticación institucional
o recepción de notificaciones web. Las pantallas auxiliares existentes se conservan;
no se repitieron sus evaluaciones completas en esta macrotarea.

Sin commit, push, despliegue público o inicio de otra macrotarea.
