# CHECKPOINT UIX-02 — BanuChat

Fecha: 2026-11-01 (America/Bogota). Rama `main`; HEAD inicial
`e699a899056995d82431d4e8c4de228e581d6391` (`Refresh mobile UI and add agent design skills`).
Árbol inicial limpio: UIX-01 y sus skills ya estaban conservados en ese commit.
Estado: **UIX_02_IMPLEMENTED_WEB_AND_ANDROID_SMOKE_VALIDATED**.
Sin commit ni push. No se inicia ADMIN-01 ni otra macrotarea.

## Preservación y método

Se leyeron AGENTS.md, los checkpoints UIX-01/WEB-03, tokens, animaciones y las
dependencias directas de las pantallas autorizadas. Se reutilizaron las seis
skills locales revisadas en UIX-01 (Expo, Vercel, design-taste y design-ux), sin
reinstalar ni actualizar. Prevalecen las restricciones del repositorio. La
auditoría independiente de capturas se delegó solo por la regla 0 de design-ux;
el subagente no implementó ni operó el teléfono.

Se conservan SDK 57, React Native 0.86.3, rutas/capacidades, transportes REST,
confirmaciones y separación entre corpus CCD, auxiliares ficticios y OE2. Sin
dependencias nuevas. No se modificaron backend, autenticación, propiedad de
recursos, SQL, migraciones, RAG, corpus, Agent/MCP, N8N, publicaciones ni datos
congelados. Los flujos de prueba reales crean únicamente conversaciones propias
de las cuentas ficticias ya existentes.

## Implementación

| Superficie | Cambio observable |
| --- | --- |
| Primitivas | `secondary-ui.tsx` reúne ContentColumn, SurfaceCard, FilterChip, StatusBadge, ScreenState, DemoNotice, SourceMeta y CardGrid. Importa el único archivo de tokens existente. CardGrid mide el ancho real del contenido; Android conserva una columna y web usa dos cuando caben. |
| Historial | Fecha principal y hora/recuento separados. Abrir incluye su chevron; eliminar tiene texto y zona independiente. Crear usa AppButton. Se conservan confirmación, aislamiento, carga, error, vacío y apertura. |
| Progreso | Resumen compacto en superficie neutra; cursos y porcentajes ganan protagonismo. AnimatedProgressBar conserva movimiento reducido y recibe una etiqueta por curso; se elimina el progressbar accesible duplicado. Filtros completos, sin ocultar el último en móvil. |
| Calendario | Filtros que envuelven, etiquetas de evento legibles, hora separada y lista con eje por día. Campo civil y botones conservan handlers y validación; se compacta la barra web para evitar dejar Hoy aislado. Sin modificar agrupación, rango ni zona horaria. |
| Anuncios | Búsqueda web con etiqueta persistente, estados comunes, filtros completos, tarjetas en dos columnas cuando caben y título/estado/fechas separados. Se mantiene la búsqueda solo donde ya existía. |
| Publicaciones OE2 | Categorías y filtros compartidos, búsqueda etiquetada, rejilla sobre espacio real, estado visible y procedencia delimitada. Release, versión, fechas de origen y avisos ficticios permanecen. |
| Banu al día | Resumen con cuatro estadísticas accesibles, filtros compactos y tarjetas de cambio con estado textual/color. Antes/Ahora apila en móvil y compara columnas en web amplia; conserva valores, fuentes y tiempos de origen/observación. Identificadores de ambas releases siguen íntegros en un bloque de procedencia al pie. Retiradas siguen sin enlace actual. |
| Visor | Columna de lectura, estados compartidos y texto seleccionable con corte de palabras largas en web. Sigue siendo texto plano; no ejecuta HTML ni incorpora parser Markdown. Conserva UUID protegido, límites y errores. |
| Notificaciones | Superficies, aviso de demostración y estado local coherentes. Se conservan permisos, operaciones, cancelación y mensajes; no se activa ningún recordatorio durante esta prueba ni se añade push. |

`web-appearance.ts` pierde 24 líneas de reglas que dependían de wrappers, hijos
de tarjetas o grids específicos de estas pantallas. El layout pasa a componentes
RN compartidos. Permanece CSS web pertinente para foco, hover, fuente del sistema,
lectura de identificadores y los layouts principales de UIX-01. Se retiraron
estilos muertos de las pantallas modificadas, sin refactor general.

## ESLint y ajustes de seguridad técnica

Los **4 errores y 2 advertencias** de UIX-01 se resolvieron, sin supresiones:

- OE2 y Banu al día derivan carga de una clave de petición y solo almacenan
  resultados dentro de callbacks asíncronos, como ya hacía el visor. Conservan
  la guarda de desmontaje/respuesta tardía y el reintento manual. No hay retry
  automático ni cambios de contratos.
- WebFrame recuerda el último ID de conversación en estado de navegación,
  actualizado de forma condicional cuando cambia la ruta. Deja de leer/escribir
  refs durante render; el ID sigue ligado al montaje de la sesión y no se fabrica.
- El hook web consulta `cache.slot()` directamente: el cache ya garantiza la
  identidad por sesión/conversación/campo y utiliza initial solo al crear el slot.
  No se modifica WebChatCache, su invalidación, almacenamiento ni semántica. Un
  test nuevo comprueba identidad/listeners/valor pendiente ante initial frescos.
- El efecto de carga del chat declara sus setters estables. La regresión real
  verifica borrador, pending al salir/volver, cuenta, logout y respuesta tardía.

El componente común de carga conserva los nombres accesibles anteriores de
los indicadores. Un intento WEB-02 descubrió el cambio accidental de un nombre
al añadir puntos suspensivos; se corrigió en el componente. Otro intento detectó
la aserción textual antigua del resumen de cambios: se actualizó para contrastar
**las cuatro** estadísticas accesibles con REST, en vez de depender de su diseño
en una sola línea. No se deshabilitó ni debilitó la comprobación de valores.

## Android: defecto encontrado y recorrido físico

Dispositivo previamente autorizado YAL-L21, build existente
`com.anonymous.banuchat`, Metro habitual 8084 y API habitual 3004. El usuario
confirmó disponibilidad exclusiva del teléfono para esta prueba. Cada acción
ADB comprobó primero que BanuChat seguía en primer plano; coordenadas derivadas
de la jerarquía actual, sin serial ni credenciales en los informes.

Al enfocar el login se reprodujo un **SIGABRT de Yoga**:
`YGNodeGetOwner(childYogaNode) == &yogaNode_`. El buffer de fallos incluye el mismo
aborto a las 03:48 de UIX-01 y a las 04:30 de esta ventana. Por ello no se atribuye
su origen a las pantallas secundarias nuevas. Se consultó el
[antecedente primario de React Native](https://github.com/react/react-native/issues/52349);
no se usa ese issue como demostración de la causa particular ni como autorización
para actualizar el SDK.

Se dejó de montar **en Android** el subárbol de presentación exclusivo web del
login, antes oculto con display:none. La UI visible nativa es la misma. Después
se pudo enfocar, escribir, autenticar y completar el recorrido sin otro aborto
observado. No se afirma haber corregido el motor Yoga. No cambió la validación,
el cliente de autenticación, almacenamiento o credenciales. La automatización
también se corrigió para pasar con Siguiente al campo de contraseña y verificar
su foco real: las primeras pulsaciones por coordenadas quedaban cubiertas por
el teclado y no acreditaron login. No se capturaron campos con credenciales.

**Realmente ejercitado en el teléfono:**

- Login → Home; abrir un chat propio vacío, escribir un borrador sintético con
  teclado virtual visible y compositor/botón alcanzables; cerrar teclado y volver
  a Home. No se envía ese borrador al backend.
- Home → Progreso → Inicio; Calendario → Inicio; Anuncios → Inicio;
  Notificaciones → Inicio, sin activar permisos/pruebas ni programar recordatorios.
- Publicaciones OE2 → Banu al día → expandir Antes/Ahora → Inicio; Historial → Inicio.
- Recaptura del detalle sin el overlay de Fast Refresh y cierre de la sesión
  ficticia: login visible al terminar. Fuente del sistema 1,15, sin cambiarla.

Los reverse 3004/8084, inicialmente ausentes, se crearon temporalmente y se
retiraron al cerrar. No se instaló APK ni se generaron android/ios. No se detuvo
API, Metro, PostgreSQL, Ollama o N8N.

**Fronteras físicas pendientes:** abrir una fuente real en el visor nativo,
generación de respuesta y recuperación de errores en Android, TalkBack,
preferencia reducida del sistema y medición de rendimiento de animaciones.
No se acredita push, recepción de notificaciones ni pruebas humanas con estudiantes.

## Pruebas ejecutadas

| Comprobación | Resultado real |
| --- | --- |
| `npm run typecheck` | PASS. |
| `npm test` | **64/64 PASS**, cero fallos/saltados; incluye un test adicional del cache y las regresiones móviles existentes. |
| `npm run lint -- --no-cache` | **PASS, cero errores y cero advertencias**. |
| `npm run web:test` | **1/1 PASS**, proxy existente, puertos efímeros exclusivamente loopback. |
| `npm run web:export` | PASS, 15 rutas. Bundle final `entry-0407dc22d99ed2f25d23a17bef58a179.js`. |
| `check-uix01.mjs before --secondary` | PASS, **72 capturas nuevas** sobre la base e699a89; bundle base `entry-77bfbd47488eb045a2a0af577f743106.js`. |
| `check-uix01.mjs after --secondary` | PASS, 72 vistas comparables y 3 capturas adicionales del pie de procedencia. |
| `check-unified-web-browser.mts --web02 --skip-login-controls` | **BANUCHAT_WEB_02_BROWSER_VALIDATED**. Consulta real, filtros, calendario civil, OE2, Antes/Ahora, teclado/foco, responsive, chat/fuentes/visor, borradores y pending, aislamiento, error/409 sin reenvío, confirmación de borrado de chat nuevo, logout y recarga. |
| Android físico | Smoke descrito arriba **ejecutado**, sin extender el PASS a fronteras no probadas. |
| Exportación Android Hermes | PASS con CLI Expo instalada, 1672 módulos, bundle final `entry-b3de3dd3ef57b3afb460c7316c4d33e2.hbc`, salida ignorada `.expo/uix02-android`. Sin modificar `.env.local`; variables públicas solo en proceso y TEMP/TMP en `.expo/uix02-hermes-temp`. |
| `node --check` de los evaluadores JS | PASS. |
| `git diff --check` y alcance | PASS al cierre. Solo Mobile y este checkpoint; sin archivos backend/datos/infra/skills modificados. |

El recorrido WEB-02 final se ejecutó antes de dos ajustes posteriores exclusivamente
de estilo (flexBasis del campo de fecha y tipografía/espaciado de estadísticas).
No cambian handlers ni estado; se recapturó el layout final y se exportó nuevamente
Hermes. No se repite una consulta RAG costosa por esos ajustes de presentación.
Informe integrado privado:
`%LOCALAPPDATA%/BanuChat/web-02/11ed7d3f-b874-4e37-9799-ef2b88b1352f/report.json`.
Limpieza: dos sesiones revocadas, dos ya inactivas, ninguna sin confirmar y perfil
descartable retirado. Mantiene su conversación propia de ensayo, como WEB-02;
la prueba física mantiene otro chat propio vacío. No se borraron chats preexistentes.

## Evidencia, auditoría y límites

Raíz regenerable e ignorada: `mobile/.expo/uix02/`.

- `before/`, `after/`: PNG y report.json con medidas/checks. La API está
  **completamente interceptada** con contenido 100 % sintético; cero peticiones
  a backend, cero mensajes escritos y ninguna credencial real leída por ese harness.
- Anchos **1366, 768 y 390**, altura 900. Contenido largo, curso en tres estados,
  agrupación por fechas, anuncios, programación OE2, cambios añadidos/modificados/
  retirados, vacío/error/carga, ausencia de predecesora, visor sintético, fuentes,
  Escape/foco y movimiento reducido. Antes/Ahora se desplaza explícitamente al
  viewport; no se presenta una captura del encabezado como validación del detalle.
- `comparison-index.html`: **72 pares**; `comparison-manifest.json`: hashes
  SHA-256 de ambos originales. Tres PNG after adicionales `changes-provenance-*`
  conservan visible la procedencia de las dos publicaciones.
- `android/`: capturas del recorrido físico y report.json sin secretos. Los
  originales de desarrollo y la recaptura limpia se distinguen (`before-after-clean`).
  No son comparaciones nativas antes/después ni contienen documentos CCD abiertos.

La primera preparación del fixture de cambios falló porque no incluía los seis
decimales de timestamps exigidos por el parser; se corrigió **el fixture**, nunca
el contrato. Se repitió la base sobre el mismo bundle original. La primera traza
de detalle no lo desplazaba a la vista; se mejoró y se recapturó la base antes
de exportar el producto modificado. No se reutiliza salida UIX-01 como evidencia
de UIX-02. Iteraciones posteriores se guiaron por capturas y auditoría independiente.

| Heurística revisada | Resultado final acotado |
| --- | --- |
| Estado, errores y recuperación | Carga/error/vacío consistentes; nombres accesibles conservados; reintento manual. |
| Correspondencia y consistencia | Fechas, estados y acciones reconocibles; filtros, badges y superficies comunes. |
| Control y prevención | Abrir/crear/eliminar distinguidos; confirmación e aislamiento acreditados por WEB-02. Retiradas sin enlace actual. |
| Reconocimiento y eficiencia | Filtros completos en móvil, búsquedas con etiqueta, comparación legible y estadísticas separadas. |
| Minimalismo y ayuda | Procedencia al pie conserva IDs, versiones y tiempos. Avisos íntegros; el resumen de progreso ya no domina sobre los cursos. |

Sin bloqueadores visuales ni hallazgos mayores finales observados por el juez.
Quedan detalles menores: scroll considerable de OE2/radar con fuente ampliada,
etiquetas del resumen de Progreso próximas entre sí en Android y prefijos Antes/
Ahora redundantes. No justifican ocultar avisos ni cambiar reglas de comparación.
La inspección de capturas no acredita lectores de pantalla, WCAG completo,
contraste de cada píxel, Safari/Firefox ni fps. Se conserva la paleta de UIX-01.

## Archivos modificados

- `mobile/src/components/secondary-ui.tsx` (nuevo), `oe2-change-card.tsx`, `web-frame.web.tsx`.
- `mobile/src/app/history.tsx`, `progress.tsx`, `calendar.tsx`, `announcements.tsx`,
  `oe2.tsx`, `oe2-changes.tsx`, `document.tsx`, `notifications.tsx`.
- Ajustes acotados: `mobile/src/app/login.tsx` (ramas solo web), `chat.tsx`
  (dependencias estables), `src/session/use-chat-state.web.ts`, `src/ui/animated.tsx`
  (etiqueta accesible del progreso), `src/ui/web-appearance.ts`.
- `mobile/test/web-chat-cache.test.ts`.
- `mobile/scripts/check-uix01.mjs`, `compare-uix01.mjs`, `uix02-review.mjs` (nuevo),
  `unified-web02-journey.mts` (estadísticas contra REST).
- `mobile/README.md` y este checkpoint.

Los scripts operativos de ADB y logs de diagnóstico son locales ignorados; no se
incluyen credenciales, seriales o configuraciones privadas en Git. No se continúa
con nuevas funcionalidades, administración o cambios de SDK.
