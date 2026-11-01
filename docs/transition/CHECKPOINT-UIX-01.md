# CHECKPOINT UIX-01 — BanuChat

Fecha: 2026-11-01 (America/Bogota). Base: `6a2ef4d40943bb29f9eda90bb185895c6467ddfa`.
Estado: **UIX_01_IMPLEMENTED_WEB_VALIDATED_ANDROID_PARTIAL**.
Sin commit ni push. Se detiene UIX-01; no inicia UIX-02 ni ADMIN-01.

## Base y alcance

Se leyeron AGENTS.md, package.json, CHECKPOINT-WEB-03 y los componentes/tokens
directamente implicados. Git inicial: únicamente `.agents/` y `skills-lock.json`
sin seguimiento, preexistentes; no se modificaron. La exportación base produjo
`entry-a5df9e89a567cffa6d5971448cb0ca28.js`, igual al bundle documentado en WEB-03.

Se mantienen Expo SDK 57, React Native 0.86.3, Expo Router, rutas protegidas,
capacidades, login/AuthSession, SecureStore nativo y caché web en memoria. Sin
dependencias nuevas. No se cambian backend, REST, SQL, RAG, Agent/MCP, N8N,
autenticación, corpus ni datos de demostración congelados. Las únicas escrituras
al backend fueron las operaciones de prueba del recorrido WEB-02 existente.

## Skills: disponibilidad, procedencia y licencias

Las seis skills solicitadas ya estaban instaladas **localmente** bajo
`.agents/skills/`, con origen y computedHash del instalador en `skills-lock.json`.
No se instaló ni actualizó ninguna skill. Se leyeron sus instrucciones antes de
aplicarlas y referencias de animación/auditoría pertinentes. No se ejecutaron
sus comandos de instalación, feedback ni envío externo.

| Skills | Procedencia registrada / revisión de licencia |
| --- | --- |
| expo-design-system, expo-native-ui, expo-animation | `expo/skills`; MIT declarado, contrastado con [licencia oficial](https://raw.githubusercontent.com/expo/skills/main/LICENSE). Animación incluye además LICENSE MIT de Emil Kowalski en su carpeta. |
| vercel-react-native-skills | `vercel-labs/agent-skills`, `skills/react-native-skills`; MIT contrastado con el [frontmatter oficial](https://raw.githubusercontent.com/vercel-labs/agent-skills/main/skills/react-native-skills/SKILL.md). No se encontró LICENSE raíz en la URL consultada (404); no se atribuye una comprobación inexistente de ese archivo. |
| design-taste-frontend | Distribuida por `sickn33/agentic-awesome-skills`, origen declarado `Leonxlnx/taste-skill`; [MIT del distribuidor](https://raw.githubusercontent.com/sickn33/agentic-awesome-skills/main/LICENSE) y [MIT del origen](https://raw.githubusercontent.com/Leonxlnx/taste-skill/main/LICENSE) revisadas. |
| design-ux | Mismo distribuidor; origen `connerkward/ckw-design-skill`; MIT declarado y [licencia de origen](https://raw.githubusercontent.com/connerkward/ckw-design-skill/main/LICENSE) revisada. |

SHA-256 de los bytes locales de cada SKILL.md, para reproducir el inventario con
`Get-FileHash .agents/skills/*/SKILL.md -Algorithm SHA256`:

| Skill | SHA-256 local |
| --- | --- |
| expo-design-system | `10182f288264887e35f051634a15553974a8167be14da4918853d2ccf97c8b20` |
| expo-native-ui | `83903d7a0a9aa32e1130283456f97b3e71f4083b372adfa7e025aa126f360a81` |
| expo-animation | `24575736846fb6c1501414855fd3da52f231eddfedbcbd54c3f3f4bb435f11ef` |
| vercel-react-native-skills | `4012750a5ccbe064ca04af3835d5d1b011979d2d09d9b6df1c8128fac58e0a66` |
| design-taste-frontend | `9210d971842abb0540eaf992a6ef0c2635984e7d9bcf30cd2c97f3d6e1042a01` |
| design-ux | `61bce88105921f99d5dec42bd21000d0fe47748271ed6e68f05d03c0acb3125d` |

Son hashes del archivo local, **no** una equivalencia afirmada con el computedHash
del instalador ni una verificación byte a byte de toda la procedencia upstream.
Las recomendaciones genéricas de Tailwind, fuentes descargadas, iconotecas,
controles/rutas nuevos y dependencias ajenas se subordinan al alcance del repo.
Se conserva la tipografía del sistema, los glyphs y los controles existentes.
La regla 0 de design-ux solicita un juez separado: se utilizó un subagente solo
para revisar capturas, sin delegar implementación ni modificar archivos.

## Decisiones visuales e interacción

- **Identidad:** se mantiene la marca geométrica y el azul existente. Índigo
  profundo para la acción principal y las burbujas propias, azul para foco,
  selección y fuentes. Fondos claros, menos sombras y colores secundarios en
  accesos, mayor separación entre información y acción. Estados semánticos
  mantienen su paleta. Tokens nuevos de tipografía, movimiento y bordes dentro
  de `src/ui/tokens.ts`; no hay un segundo sistema de diseño.
- **Login:** composición de dos paneles solo en escritorio. En tablet/Android/
  móvil web, marca compacta y formulario en columna, aviso al final, etiquetas
  asociadas, foco visible, siguiente campo con teclado y estado de envío único.
  No se añaden recuperación, registro, autenticación ni persistencia.
- **Home:** saludo, acceso principal a Banu, aviso íntegro de demo y accesos
  secundarios. El CTA blanco y el fondo índigo hacen reconocible la tarea.
  Se retiran círculos decorativos. Rejilla web de dos columnas preservada;
  Android conserva lista y controles de sesión propios.
- **Chat:** autor encima de la respuesta, tarjeta a todo el ancho útil,
  interlineado y texto seleccionable. Fuentes desplegables con apertura del
  visor existente. Se retira el punto verde estático, que sugería conexión real.
  Compositor con foco, botón claro y ayuda breve; se conservan borrador, límite,
  sugerencias, bloqueo por conflicto y recuperación manual del envío incierto.
- **Navegación/estados:** agrupación visual Explorar y pie de cuenta en la
  barra web, selección y foco conservados. Menú compacto, Escape y acceso al
  contenido mantienen el comportamiento anterior. Cabeceras y controles
  compartidos usan el mismo vocabulario visual; mínimo compartido de 48 dp,
  sin forzar otra navegación sobre Android.
- **Movimiento:** propósito de feedback y aparición de contenido. Reanimated
  ya instalado: presión 120 ms con curva ease-out, apariciones de opacidad
  180 ms y retardos antiguos limitados a 60 ms; sin desplazamientos de mensajes.
  Progreso anima scaleX (240 ms), no ancho. Puntos de generación animan opacidad
  solo durante el estado pendiente/activo; se cancelan al desmontarse o al pasar
  a segundo plano. Preferencia de movimiento reducido suscrita, ReduceMotion.System
  y regla web para desactivar movimiento, incluido scroll programático del chat.
  No se afirma rendimiento medido en un Android moderado ni 60 fps.

## Archivos modificados

| Grupo | Archivos |
| --- | --- |
| Sistema existente | `mobile/src/ui/tokens.ts`, `animated.tsx`, `icons.tsx`, `web-appearance.ts` |
| Pantallas | `mobile/src/app/login.tsx`, `home.tsx`, `chat.tsx` |
| Componentes | `mobile/src/components/app-button.tsx`, `screen-header.tsx`, `chat-sources.tsx`, `web-frame.web.tsx` |
| Evidencia reproducible | `mobile/scripts/check-uix01.mjs`, `compare-uix01.mjs` (nuevos) |
| Documentación | `mobile/README.md`, este checkpoint |

## Validación real

Desde `mobile`, salvo que se indique lo contrario:

| Comprobación | Resultado y frontera |
| --- | --- |
| `npm run typecheck` | PASS, también después de los cambios finales de TS/TSX. |
| `npm test` | 63/63 PASS, cero fallos/saltados. Incluye sesión, adaptadores, caché/borradores, operaciones pendientes, propietarios y OE2/notificaciones. |
| `npm run web:test` | 1/1 PASS, proxy loopback existente, ejecutado fuera del sandbox. |
| `npm run web:export` | PASS, 15 rutas; bundle final `entry-77bfbd47488eb045a2a0af577f743106.js`. |
| `node scripts/check-uix01.mjs before` / `after` | PASS, 44 capturas por etapa, anchos 1366/768/390 × 900. Fixtures 100 % sintéticos interceptados para **toda** la API. No lee cuentas ni escribe backend. |
| `node scripts/compare-uix01.mjs` | PASS, galería de 44 pares y manifiesto SHA-256 de ambos originales. |
| `node --import tsx scripts/check-unified-web-browser.mts --web02 --skip-login-controls` | PASS integrado, estado BANUCHAT_WEB_02_BROWSER_VALIDATED. API real, mismos transportes y recorrido WEB-02. |
| Exportación Android Hermes con CLI Expo existente | PASS, 1671 módulos, `entry-45bcd5df8f3cd45715fd1292242d2afd.hbc`. Salida `.expo/uix01-android`, TEMP/TMP `.expo/uix01-hermes-temp`, variables públicas solo en proceso, sin tocar `.env.local` ni generar proyectos nativos. |
| `npm run lint -- --no-cache` | FAIL por 4 errores y 2 warnings previos. OE2/changes: setState en effect; WebFrame: acceso a ref durante render; chat y use-chat-state.web: dependencias de hooks. No se silencian reglas. |
| ESLint focal de archivos modificados, excluyendo WebFrame preexistente | Exit 0, cero errores, un warning previo de dependencias del chat. ESLint sobre fuentes de HEAD confirma los errores/warnings previos; no se atribuyen a UIX-01. |
| `node --check` de ambos evaluadores JS | PASS. |
| `git diff --check` y revisión de alcance | PASS al cierre; solo Mobile y documentación UIX-01. |

El recorrido sintético mide ausencia de desbordamiento raíz y dentro de burbujas,
controles visibles de al menos 44 px (las primitivas compartidas ahora piden 48),
login rechazado, borrador al navegar/redimensionar, sugerencias sin envío,
fuentes/visor, generación, error con un único POST interceptado, texto largo sin
espacios, abstención, vacío, OE2 no disponible, Tab/foco de 3 px y Escape. En
movimiento reducido comprueba cero animaciones en ejecución en Home. Incluye
aserción del alto del panel de login para no volver a dejar una franja vacía.

WEB-02 integrado comprueba filtros/búsquedas/fechas y carga/vacío/error, OE2 y
Antes/Ahora, navegación responsive, Enter/Tab/Escape, conservación de borrador y
operación pendiente al salir/volver, documento real, historial, 409 y fallo de red
sin reenvío, comprobación manual, cancelar/confirmar borrado de un chat nuevo,
aislamiento entre dos cuentas, logout, expiración y recarga sin persistencia.
Se omiten solo los controles de login negativo/503 ya acreditados en WEB-02;
el nuevo evaluador cubre rechazo de login sintético. Limpieza real: dos sesiones
revocadas, dos ya inactivas, cero sin confirmar, perfil Edge descartable retirado.
No se repite RAGAS ni evaluación semántica por tratarse de presentación.

El preflight inicial **dentro** del sandbox no pudo observar servicios y dio
NOT_READY. La repetición autorizada fuera del aislamiento verificó los servicios
existentes y el dispositivo; no se arrancó, reinició ni reconfiguró backend,
PostgreSQL, Ollama, N8N o Metro. El proxy 8085 ya escuchaba y se reutilizó; el
intento inicial de iniciar otro devolvió EADDRINUSE y no creó un segundo proxy.

## Evidencia y comparaciones

Raíz local regenerable e ignorada: `mobile/.expo/uix01/`.

- `comparison-index.html`: galería antes/después en los tres tamaños.
- `comparison-manifest.json`: 44 pares con SHA-256.
- `before/` y `after/`: 44 PNG por etapa y `report.json` con medidas y checks.
- Login, error de login, Home, chat/respuesta, fuentes, visor sintético,
  historial, progreso, calendario/anuncios vacíos, errores OE2/Banu al día,
  texto largo/abstención, bienvenida, generación, error, menú y movimiento reducido.
- `android/login.png`, `android/initial.png`: capturas físicas de login y
  bienvenida; **no** son una comparación nativa antes/después.

El harness conserva respuestas de prueba solo en el proceso/browser; los tokens
fixture son valores constantes falsos, nunca credenciales de usuario. Esta evidencia
no contiene conversaciones reales ni documentos CCD. Los originales no se editan.
El primer intento de base falló por fetch loopback en sandbox; después se corrigió
un fixture de creación que debía responder 201. Se repitió la base sobre el mismo
bundle original antes de exportar UIX. Las capturas finales incluyen dos correcciones
de revisión: chevron dirigido a la derecha y panel de login a toda la altura.

Informe integrado privado, fuera del repositorio:
`%LOCALAPPDATA%/BanuChat/web-02/e2175596-d94e-4ca0-88df-128a83370ec9/report.json`.
Como en WEB-02, conserva su conversación propia con mensajes de ensayo y elimina
solo el otro chat propio nuevo empleado para probar el borrado. No borra chats
preexistentes ni modifica el dataset congelado.

## Auditoría independiente y límites

Un subagente que no implementó la UI revisó capturas base y finales con
design-ux. Su inspección de capturas/traza no equivale a prueba humana.

| Heurística | Resultado localizado |
| --- | --- |
| Estado del sistema | Generación/error distinguibles; retirado punto verde ficticio. |
| Correspondencia con el mundo real | Pregunta, chat, documento y fuente reconocibles; chevron corregido. |
| Control y libertad | Inicio/Volver, cierre del menú, borrador preservado en la traza. |
| Consistencia | Paleta, controles y jerarquía comunes sin igualar layouts. Panel login corregido. |
| Prevención de errores | Login/envío vacíos deshabilitados; un POST en fallo controlado. No acredita idempotencia durable. |
| Reconocimiento | Home móvil muestra el CTA antes del aviso; sugerencias y fuentes a la vista. |
| Eficiencia | Borrador conservado. Menú compacto requiere scroll para logout: menor, con scroll visible. |
| Minimalismo | Más ancho para respuesta; aviso obligatorio del chat aún ocupa espacio: menor aceptado por alcance. |
| Recuperación | Errores legibles y recuperación existente; no se atribuye éxito a un envío incierto. |
| Ayuda | Abrir documento explícito, fuentes progresivas, ayuda junto al compositor y límites de demo. |

No se observaron bloqueadores ni hallazgos mayores finales en lo inspeccionado.
El juez reexaminó la recaptura final y confirmó el panel completo del login y
los chevrons corregidos. No es auditoría WCAG completa, prueba con estudiantes,
lector de pantalla ni certificación universal de navegadores.

Cálculo ejecutado de luminancia relativa sRGB sobre parejas opacas de tokens:
ink/surface **18,54:1**, textSecondary/background **7,41:1**, white/accent
**6,21:1**, white/brand **14,97:1**, onBrandSecondary/brand **11,10:1** y
muted/surface **5,33:1**. Es una comprobación limitada de paleta, no una auditoría
de todos los píxeles, estados, opacidades, iconos ni criterios WCAG.

Android físico: YAL-L21 previamente autorizado, build existente y Metro habitual.
Se observó bienvenida y login actualizado, escala de fuente del sistema **1,15**,
sin cambiarla. Se configuraron temporalmente reverse 3004/8084, inicialmente
ausentes. El intento de seguir al Home no se acredita: no se confirmó login y
después otra aplicación apareció en primer plano; se detuvieron las interacciones.
No se acredita Home/chat/teclado Android, TalkBack ni rendimiento físico de las
animaciones. Se retiraron únicamente ambos reverse creados en esta ventana.
No se instaló APK ni se hizo Gradle, upgrade de SDK o generación android/ios.

Pendiente: recorrido físico completo con teclado virtual, mensajes/fuentes y
movimiento reducido en dispositivo moderado; revisión con lector de pantalla;
lint global previo. No se continúa automáticamente con ninguna macrotarea nueva.
