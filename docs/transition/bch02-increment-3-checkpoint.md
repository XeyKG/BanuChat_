# CHECKPOINT BANUCHAT — BCH-02 incremento 3

Fecha local: 2026-10-21 (America/Bogota).
Base aceptada: `23f4e93c3ca7c96ef61bda9a4fc469780cd0a19a`.
Estado: modo CCD implementado en Mobile existente y comprobado operacionalmente
en **Expo Web** con backend CCD real. **Android pendiente por falta de dispositivo
conectado o AVD operativo**. Detener para revisión de Sala de Control.
Sin commit ni push.

## Flujo implementado

Se conserva Expo SDK 57, React Native, TypeScript, Expo Router, diseño, componentes
y contrato REST. `EXPO_PUBLIC_DEMO_MODE=ccd_local` habilita la demostración; la
ausencia del valor mantiene `synthetic`. No se editó la configuración privada
`.env.local` existente ni se instalaron dependencias nuevas.

En CCD se omite el onboarding sintético y se presenta una demostración local para
un operador. El contexto técnico no aparece como nombre o identidad de estudiante.
Home prioriza el chat y muestra el aviso de ausencia de autenticación, privacidad
por usuario y publicación institucional. Calendario, progreso y anuncios se ocultan
y se protegen con `Stack.Protected`, incluido acceso directo por ruta. La prueba
de `/progress` terminó en la entrada CCD, sin llamar a progreso en el backend.

El chat conserva mensajes, carga, desplazamiento, entrada multilínea, límite de
4.000 caracteres, evidencia insuficiente, citas expandibles y visor. Presenta el
texto exacto del backend, incluidas sus advertencias. En CCD las citas se rotulan
«fuente documental», sin presentar la comprobación técnica como aval institucional.
El visor identifica un documento CCD seleccionado, no un documento sintético.
Volver del visor permite continuar el mismo chat. No se reconstruyeron pantallas
ni se introdujo otro diseño.

## Historial y límites de seguridad

No se consulta el historial global del contexto compartido
`/conversations?profile_key=ccd-local-demo`. Un registro en memoria contiene solo
IDs obtenidos al crear conversaciones durante esta apertura. Historial consulta
individualmente esos IDs. GET y POST de otros IDs se rechazan en el cliente antes
de usar la red, aunque compartan `profile_key`. Finalizar o recargar pierde esa
lista; no borra chats del backend. La UI y el cliente deshabilitan el borrado CCD.

La lista es alcance de interfaz, **no autenticación, propiedad ni aislamiento de
usuarios**. El backend sigue sin autorización por usuario: otro proceso local con
acceso a loopback podría consultar sus endpoints. No se habilitó acceso multiusuario
ni se abrió LAN. El aviso explica expresamente el carácter compartido del backend
y evita atribuir conversaciones ajenas como propias. Dos pestañas se utilizaron
por el mismo operador para probar aperturas independientes, no por personas reales.

## Conexión real y bloqueo Android

Android Studio está instalado y configura el SDK en
`C:\Users\samue\AppData\Local\Android\Sdk`. El primer sondeo con la variable de
entorno del sandbox apuntó a una ubicación redirigida y no encontró herramientas.
Se corrigió consultando la ruta configurada en Android Studio. Allí existen
`platform-tools/adb.exe` y `emulator/emulator.exe`.

El arranque de ADB falló dentro del entorno restringido. Ejecutado con acceso local
permitido, inició el daemon y `adb devices -l` devolvió una lista vacía.
`emulator -list-avds` no enumeró AVD. Sin dispositivo conectado/autorizado ni AVD
disponible no fue posible usar ADB reverse, Expo Go o emulador para una prueba
Android. No se descargaron imágenes, crearon AVD, instalaron aplicaciones ni
generaron carpetas nativas `android/` o `ios/`.

La comprobación operacional se realizó en el navegador integrado mediante la
exportación existente de **Expo Web**, con viewport **390 × 844** en el chat CCD.
No es emulación de Android ni prueba física. El modo sintético y la segunda
apertura CCD también se comprobaron en navegador; algunas capturas de esas
pantallas usan el viewport de escritorio por defecto.

Conexión efectiva:

`Expo Web en 127.0.0.1:8083 → relay local del mismo origen → API CCD en 127.0.0.1:3001 → PostgreSQL CCD / Ollama existentes`.

El relay es una herramienta de evaluación del export estático: destino fijo,
Host/Origin restringidos, GET/POST únicamente y listener de loopback. No cambia
CORS, REST ni configuración de la API. `netstat` acreditó escucha exclusiva en
`127.0.0.1` para API CCD 3001, preview CCD 8083, API sintética de prueba 3302 y
preview sintético 8084. No se utilizó `0.0.0.0` ni túnel público. El cliente CCD
rechaza URLs LAN/públicas, credenciales y rutas de API no admitidas.

Las rutas previstas para una futura prueba son USB con `adb reverse` para 3001
y Metro 8081, o el alias de host del emulador `10.0.2.2`. Se documentan en
`mobile/README.md` como pendientes, no como conexiones acreditadas hoy.

## Conversaciones observadas mediante la app

Tres chats nuevos, diez preguntas reales aceptadas, veinte mensajes persistidos
y trece citas. Todos los envíos siguientes se realizaron con el formulario del
chat, no mediante llamadas directas a RAG ni un runner que sustituya la interfaz.

- A: `10cef52f-fdca-41ba-a2aa-17f855150f74`, nueve preguntas / dieciocho mensajes.
- B: `cb16a117-c1ce-47d8-bb35-dd8910b1028f`, una pregunta / dos mensajes, otra apertura.
- C: `a4234ccf-5935-450a-975c-597d8a116adf`, vacío, creado explícitamente tras probar 409.

| Caso | Resultado real en la interfaz y persistencia |
| --- | --- |
| A: cursos → IA Generativa → temas | Siete syllabus; luego descripción de IA y temas de modelos de lenguaje/difusión, evaluación de herramientas y prompts. Ambas respuestas específicas citan solo DOC-101. Se ven los límites de syllabus sin periodo/vigencia confirmados. |
| A: corrección hacia Marca Personal Digital | Responde identidad/reputación profesional, productividad, organización y networking. Se expandió su cita y mostró solo DOC-103. |
| A: pruebas diagnósticas → duración | Responde propósito, aproximadamente dos horas y estructura; el seguimiento conserva el tema. Solo TEST_ORIENTATION y advertencia 202660/vigencia no ratificada. |
| A: consecuencias de no aprobar | Abstención visible con aviso «Evidencia insuficiente» y sin citas. |
| A: contacto CCD | Correo documentado, fuente M12 expandida y advertencia «202660; su vigencia actual no está ratificada». No se oculta ni resume el texto del backend. |
| A: repetición gratuita | Abstención visible, sin citas ni autorización de gratuidad. |
| B: «¿Y qué temas tiene?» sin antecedentes | Solicita aclarar curso/prueba/tema, sin citas; no hereda el tema de A. Antes de crear B, su historial local estaba vacío pese a existir A. |
| Fuente y visor | Se expandió DOC-101 y se abrió su artefacto real dentro de la app. Texto seleccionable, periodo, población y límites visibles. Volver conservó el chat y permitió corregir el tema. |
| Historial local de A | Tras crear C, mostró solo C vacío y A con dieciocho mensajes; no B ni las veinticuatro conversaciones previas del backend. A se reabrió con sus respuestas y citas. |
| Mensaje largo | Se introdujeron 4.001 caracteres: contador 4001/4000 y botón de envío deshabilitado. Se retiró el texto sin enviarlo; no hay POST de ese contenido. |

Se observó «Banu está pensando…», bloqueo de entrada/envío durante carga y
desplazamiento al final de respuestas y citas. Las capturas muestran respuestas
largas, contador y visor con desplazamiento. **No se verificaron teclado virtual
Android, botón atrás nativo ni comportamiento de IME**. Entrada y navegación
probadas aquí son las del navegador.

## HTTP 409 y no repetición

El contrato vigente devuelve `CONFLICT` tanto para cambio de release como para
concurrencia. El cliente conserva esa ambigüedad: bloquea la continuación y explica
las dos posibilidades, mantiene el historial y ofrece «Abrir conversación nueva».
Crear otra conversación requiere una acción explícita y no traslada mensajes ni
borrador. Timeout/red siguen produciendo resultado incierto y no repiten el POST.

Se verificó en dos niveles distintos:

1. Backend real: POST a la conversación histórica
   `7629d586-a0b3-41aa-be0b-e93fd3036be6`, ligada a release anterior, devolvió
   **409 / CONFLICT**. Conservó **16 mensajes antes y después**. Evidencia local:
   `old-release-conflict.json`. No se cargó ese historial ajeno en Mobile.
2. UI: el relay devolvió una sola respuesta 409 marcada `simulated: true` en su
   log, sin reenviar ese POST al backend. Así se comprobó visualmente el estado
   bloqueado, historial preservado y apertura explícita de C vacío, sin cambiar
   releases para fabricar el caso. Es una simulación de respuesta para probar UI,
   **no un 409 de release antigua producido mediante la propia app**.

El fixture solo existe en el script de preview, mediante un archivo local de
activación que se renombra al consumirse. No es endpoint, función del cliente ni
comportamiento de la API. La prueba unitaria comprueba que cada 409/fallo de red
realiza una sola llamada POST. Los logs operacionales no contienen POST exitosos
duplicados por ruta/contenido. Un timeout del mecanismo de espera de la automatización
al principio no fue un timeout de Mobile: se consultó el estado y se comprobó el
201 sin reenviar la pregunta.

## Evidencia, integridad y regresión sintética

Directorio privado e ignorado: `data/ccd/evidence/bch02-increment-3`.
Baseline `before.json`: veinticuatro conversaciones existentes.
Comprobación final: `after-1792631065980.json`.
Conserva corpus, vectores, releases y mensajes/citas de todo el historial previo;
solo añade A, B y C. Las diez respuestas HTTP reales coinciden con el contenido,
indicador de insuficiencia y citas guardados en PostgreSQL. Las trece citas tienen
SHA, localizador y release coincidentes con versión/chunk. El artefacto IA abierto
desde Mobile coincide con el SHA persistido.

Las releases siguen siendo `fb8538af-3280-4a1b-889c-a27564381996` (diez unidades,
actual) y `5834fc47-57c5-498b-98fc-4190330155e4` (dos unidades, histórica), ambas
`ready`. No se ejecutó ingesta, migración, generación de embeddings o publicación.

Transacciones del preview CCD:
`mobile/.expo/ccd_local-evidence/http-1792630149365.jsonl` y
`http-1792630663246.jsonl`. No hay consulta al listado compartido ni solicitudes
de progreso/calendario/anuncios CCD. Se guardaron doce capturas JPEG, incluidas
inicio, cita IA, visor, corrección, insuficiencia, contacto, límite de longitud,
historial separado, 409 simulado y reapertura. `ui-chat-a.txt` y `ui-chat-b.txt`
contienen estados DOM observados, sin personas ni información personal real.

Regresión sintética: otra exportación con `EXPO_PUBLIC_DEMO_MODE=synthetic`, API
real en loopback 3302 y preview 8084. Se comprobaron onboarding, selección de
perfil, Home con las cuatro capacidades originales, progreso, calendario y anuncios.
Cuatro GET reales devolvieron 200: perfiles, progreso de `profile-001`, eventos y
anuncios activos. **No hubo POST/DELETE sintético**, ingesta ni cambio de datos.
No se acredita aquí un nuevo chat sintético por interfaz; las pruebas unitarias
conservan la consulta original de historial por perfil y el contrato de mensajes.

## Validación ejecutada

- Mobile `npm run typecheck`: aprobado.
- Mobile `npm run lint -- --no-cache`: aprobado, sin errores ni advertencias.
- `npx eslint src test scripts/serve-local-web.mjs --no-cache`: aprobado.
- Mobile `npm run test:local`: **6 aprobadas, cero fallidas/omitidas**.
- `expo export --platform web` para CCD y sintético: ambas exportaciones aprobadas.
- Compilación TS estricta de `ccd-mobile-state.mts`: aprobada.
- Verificador SQL/HTTP/artefacto final: aprobado, 10 POST reales, 20 mensajes,
  13 citas, 3 chats nuevos y 1 conflicto UI simulado identificado.
- `git diff --check`, revisión de archivos nuevos y de alcance: aprobadas.

Se reutiliza `tsx` de las dependencias API para los tests Node de Mobile; no se
añadió paquete móvil ni se modificó el lockfile. La primera comprobación de tipos
del archivo de prueba requirió declarar sus tipos Node; se corrigió. La salida
de lint con caché conservaba un aviso de import ya movido; la ejecución final sin
caché pasó limpia. Los errores iniciales de comandos ejecutados desde la raíz sin
`package.json` no son pruebas aprobadas; se corrigió el directorio de ejecución.
No se reejecutaron suites API/RAG sin cambios en esos componentes.

Se cerraron las pestañas de prueba, se restauró el viewport y se detuvieron los
listeners/daemon ADB iniciados durante esta sesión. No se modificó ni detuvo Docker,
PostgreSQL u Ollama, ni se alteraron volúmenes.

## Archivos modificados y límites

Configuración/documentación:
`mobile/.env.example`, `mobile/package.json`, `mobile/README.md`,
`eval/integration/README.md` y este checkpoint.
Cliente:
`mobile/src/config/{api,demo-mode}.ts`,
`mobile/src/session/{session-context.tsx,operator-conversations.ts}`,
`mobile/src/api/{profiles,conversations,messages}.ts`.
Interfaz:
`mobile/src/app/{_layout,index,profiles,home,chat,history,document}.tsx`,
`mobile/src/components/chat-sources.tsx`.
Validación:
`mobile/test/ccd-local.test.ts`, `mobile/scripts/serve-local-web.mjs`,
`eval/integration/ccd-mobile-state.mts`.

Son veintitrés archivos, contando los nuevos. No se modificaron backend, corpus
CCD/sintético, SQL, contratos REST/MCP, embeddings, releases o dependencias/SDK.
No se implementaron autenticación ficticia, notificaciones, Agent/ReAct, MCP ni
agentes adicionales. Las rutas Android y teclado nativo requieren una futura
prueba con hardware/AVD disponible. La pérdida de la lista local al recargar es
deliberada; no hay recuperación de chats de aperturas anteriores ni propiedad
por usuario. El 409 de Mobile no puede distinguir sus dos causas sin ampliar REST.
Las limitaciones léxicas y semánticas de RAG siguen siendo las del incremento 2.

Incremento detenido para revisión de Sala de Control; no iniciar otro incremento.
