# CHECKPOINT UIX-04B — BanuChat

Fecha: 2026-11-01 (America/Bogota).
Estado: **UIX_04B_IMPLEMENTED_WEB_VALIDATED_ANDROID_SMOKE_VALIDATED**.
Implementación terminada para revisión humana. No se inicia UIX-04C/D ni ADMIN-01.
Sin commit ni push.

## Base y restricciones

- Rama inicial y final: `main`.
- HEAD inicial: `bd0f342c8253b8a4569816e56a4063c0e7614087`.
- Árbol inicial limpio, con UIX-03 y UIX-04A ya incorporadas. No se descartaron
  cambios del usuario ni se restauraron archivos contra un HEAD anterior.
- Se leyeron AGENTS.md, checkpoints UIX-04A/UIX-02, README, componentes, tokens
  y dependencias directas de las ocho pantallas autorizadas.
- Se reutilizaron las seis skills locales solicitadas y su registro existente:
  expo-design-system, expo-native-ui, expo-animation, vercel-react-native-skills,
  design-taste-frontend y design-ux. No se instalaron ni actualizaron skills,
  dependencias o frameworks. Sus preferencias quedan subordinadas al repositorio
  y al mockup. La regla 0 de design-ux motivó un juez independiente de solo lectura.
- Se conserva Expo SDK 57, React Native 0.86.3 y todas las dependencias actuales.
  No hay WebViews, proyectos nativos generados, migraciones ni nuevo sistema visual.
- No se modifican backend, contratos, auth, permisos, sesión, modelos, REST,
  PostgreSQL, RAG, Ollama, Agent/MCP, N8N, corpus, pipeline ni datos OE2/CCD/demo.

Referencia principal encontrada en
`mobile/.expo/uix04a/reference/BanuChat_mockup_refinado_UIX04.html`, SHA-256
`7c0a0ebdce8dba32431feba7e2417a3d0cce247d2ec089f3af6a60d53c785927`.
Se revisaron sus composiciones y las capturas verificadas de UIX-04A. Se renderizaron
32 vistas secundarias del HTML offline, verificando su hash y bloqueando HTTP/HTTPS.
No se copia su lógica simulada ni sus datos al producto.

Antes de editar las pantallas se conservaron 98 capturas web nuevas y las ocho
pantallas nativas. Código inicial relevante y hashes en
`mobile/.expo/uix04b/baseline-source/` y `baseline-source-manifest.json`.
Las evidencias UIX-01/02/03/04A no se sobrescribieron. La bandera `--uix04b` protege
`before/report.json` contra una segunda captura sobre la base ya existente.

## Decisiones y alcance implementado

Se adoptan los tokens existentes banuInk, banuNavy, banuMagenta,
banuMagentaStrong, banuSoft, banuCanvas, banuBorder, banuMuted/banuSecondary
y las sombras banuPanel/banuInset/banuControl. Los valores antiguos permanecen
estables para otros consumidores. No se modifica el PNG oficial de Banu.

`secondary-ui.tsx` mantiene sus APIs: columna responsive hasta 1180 px y lectura
hasta 680 px; tarjetas blancas con profundidad discreta; avisos de demo en rosa
suave con texto íntegro; metadatos secundarios seleccionables; chips con borde,
selección magenta y feedback Reanimated breve; badges que conservan verde/ámbar/rojo
semánticos; carga/error/vacío diferenciados y Banu sin marco en el vacío.
CardGrid sigue midiendo el ancho disponible y conserva el orden; nativo queda vertical.

ScreenHeader adopta fondo cálido, tinta navy y acción de salida visible. Web añade
el mismo eyebrow y breadcrumb del lenguaje aprobado. El shell mantiene el subárbol
estable y el comportamiento existente de foco, rutas y guardas.

| Pantalla | Mejora y comportamiento conservado |
| --- | --- |
| Historial | Tarjetas suaves, icono magenta, fecha/hora/recuento jerarquizados y Eliminar separado en rojo. Mantiene orden, carga, creación, apertura, confirmación de borrado y restricciones de sesión. No inventa títulos ausentes del modelo. |
| Progreso | Resumen y tarjetas equilibradas, títulos de curso contenidos y barras magenta/verde. Estadísticas se redistribuyen al faltar ancho, sin partir «Completados». Porcentajes y resumen siguen procediendo de la respuesta existente. |
| Calendario | Controles de periodo, fecha, Hoy, rango y chips con identidad unificada; fechas con espacio flexible, timeline y tarjetas legibles. Validación y rango civil de Bogotá de 30 días intactos. |
| Noticias | Búsqueda, filtros temporales, tarjetas y fechas refinados. Conserva mínimo de búsqueda, límite, estados y datos; no inventa categorías que el contrato auxiliar no expone. |
| OE2 | Superficies, búsqueda, categorías y estados consistentes. Mantiene IDs, release, versión, publicación y origen, así como la separación explícita entre publicaciones ficticias y documentos CCD. |
| Banu al día | Resumen con mínimos de ancho, badges semánticos y Antes/Ahora apilado en tablet; columnas desde 1100 px. Conserva cuatro recuentos, filtros, versiones, fechas, observación, vínculos y retirados sin enlace actual. |
| Visor | Lectura plana, texto seleccionable, aviso y versión documental real visible. Preserva UUID, carga, contenido íntegro, errores, reintento y regreso. No añade relieve sobre párrafos. |
| Notificaciones | Permisos, estado, acciones y límites de push/local con la nueva identidad. Handlers y proveedor intactos; ninguna solicitud de permisos por un efecto visual. Sigue siendo una ruta exclusiva nativa. |

AppButton se reutiliza mediante su `tone="banu"` ya existente; no cambia su API ni
el comportamiento por defecto. Las transiciones reutilizan las primitivas actuales:
entradas de 180 ms y presión de 120 ms, con movimiento reducido. No se añaden bucles,
animaciones de sombra/dimensiones ni efectos sobre lectura documental.

### Ajustes acotados de UIX-04A

Home Android reduce padding/gaps y el mínimo del hero de 356 a 320, y permite que
su título use todo el ancho disponible: en el teléfono probado pasa de cuatro a
tres líneas, con CTA y búho completos y mayor visibilidad del siguiente apartado.
Solo se aplica con altura ≥600, ancho ≥340 y fontScale ≤1,3. No cambia tamaños de
texto, preferencias del sistema, contenido ni handlers. Web y ventanas no aptas
conservan su composición.

Sidebar tablet reduce espacios y mantiene Cerrar sesión fuera del scroll de enlaces.
No elimina entradas ni sus permisos. Se verifica visible a 820×900; los enlaces y
submenú siguen desplazándose. El menú compacto conserva su cierre de sesión dentro
del área desplazable, con Escape y foco; se comprobó además su geometría y hit test.
La acción estrecha de fuentes no necesitó cambios de chat ni visor.

Login y Chat no se rediseñan ni se editan. El contenido web de Home conserva UIX-04A.

## Validaciones ejecutadas

| Comando / recorrido | Resultado real |
| --- | --- |
| `npm run typecheck` desde mobile | PASS sobre el código final. |
| `npm run lint -- --no-cache` | PASS, sin errores ni advertencias de lint. |
| `npm test` | **65/65 PASS**, sin saltadas; repetido al cierre. |
| `npm run web:test` | **1/1 PASS** sobre la exportación definitiva. |
| `npm run web:export` | PASS, 15 rutas, `entry-452f34a6ed575a2d1f649a20b4e28aff.js`. |
| `check-uix01.mjs before --uix04b` | PASS, 98 capturas de base. |
| `check-uix01.mjs after --uix04b` | **PASS, 112 capturas**, errors=[], escapedApi=0, postCount=0. |
| `capture-uix04a-reference.mjs --uix04b` | PASS, 32 imágenes del HTML offline; no evidencia runtime de Expo. |
| `compare-uix01.mjs --uix04b` | 98 pares web, 28 pares mockup/app y 10 pares nativos con manifiestos. |
| Focal de menú compacto 390×900 | Área desplazable 500 px de alto; Cerrar sesión con 44 px de alto y hit test positivo, dentro del viewport tras scroll. |
| WEB-02 real | **BANUCHAT_WEB_02_BROWSER_VALIDATED**. |
| Exportación Android Hermes | PASS, 1690 módulos, 30 assets, `entry-a276627d16c086e388543ac8bc10ea27.hbc`. |
| Android físico | Navegación por las ocho secundarias, filtros, Antes/Ahora, visor/regreso y logout comprobados con los límites siguientes. |
| `node --check` en los cuatro helpers JS y `git diff --check` | PASS. |

Las capturas web de la app usan API 100 % interceptada y fixtures sintéticos,
sin mensajes ni escrituras de backend. Cubren contenido/carga/vacío/error de las
seis listas, documento largo/error/carga/reintento/regreso al chat, ausencia de
publicación anterior, versiones y procedencia, filtros, mínimos de búsqueda,
fecha inválida, rango inclusivo, foco, Escape y movimiento reducido (cero
animaciones activas). Controles web visibles medidos ≥44 px; sin overflow raíz
ni los desbordamientos internos específicos comprobados. La inspección visual
complementa esas medidas; no se presenta como certificación de todo nodo posible.

WEB-02 real se ejecutó con los servicios existentes, sin reiniciarlos:
`node --import tsx scripts/check-unified-web-browser.mts --web02 --skip-login-controls`.
Comprueba REST real en progreso/calendario/noticias/OE2/cambios, filtros y búsqueda,
responsive, foco/teclado, borrador/pending, chat/documento/fuentes/historial,
aislamiento, 409/operación incierta sin reenvío, confirmación de borrado de su chat
vacío nuevo, logout/cambio de cuenta y recarga sin persistencia. No borra chats
preexistentes; conserva su conversación documental de ensayo.
Informe privado:
`%LOCALAPPDATA%/BanuChat/web-02/8ac4a374-af6a-4a7e-bd21-e4fe790dc16f/report.json`.
Limpieza confirmada: dos sesiones revocadas, dos ya inactivas, cero sin confirmar
y perfil Edge desechable retirado. Este recorrido precedió únicamente a ajustes
posteriores de estadísticas/espaciado y ARIA; el harness final comprueba esos
cambios. No se repitió una consulta RAG costosa por modificaciones de presentación.

Hermes se exporta con variables públicas solo en el proceso, EXPO_NO_DOTENV=1 y
TEMP/TMP dentro de `.expo/uix04b/hermes-temp`; no se cambia .env.local ni se genera APK.

### Hallazgos y correcciones durante la validación

- El sandbox bloqueó loopback/ADB con EACCES; se ejecutaron las validaciones con
  el acceso local autorizado. Ese intento no se acredita como fallo de producto
  ni PASS. El registro de preparación fallida se conserva aparte de la base válida.
- El helper Android heredado usaba etiquetas antiguas de Home; se ajustó a las
  etiquetas reales para capturar el antes, sin modificar rutas del producto.
- El juez detectó palabras aisladas en estadísticas a 360 px y con fuente nativa
  1,15. Se redistribuyeron las estadísticas con ancho mínimo; las nuevas capturas
  y el juez confirman «Modificados» y «Completados» completos.
- La comprobación nueva de progreso falló inicialmente. Se limitaron sus consultas
  al DOM visible y una prueba focal confirmó que el filtro sí devolvía solo el curso
  completado. También reveló un problema real: RNW 0.21 no trasladaba las props
  agregadas accessibilityState/accessibilityValue a ARIA. Se añadieron aria-checked
  y aria-valuemin/max/now explícitos, conservando las props nativas. La prueba focal
  y el harness final verifican selección true/false y valor 100. No se relajó la
  aserción para hacer pasar la implementación. Iteraciones fallidas preservadas.
- Algunas tomas físicas mostraban Refreshing/fade de desarrollo; la galería usa
  imágenes estables limpias, incluida `history-clean.png`. No se ocultó accesibilidad
  ni se retocaron PNG para mejorar las capturas.

## Comprobación física y sus límites

YAL-L21, Android 10, 1080×2340, densidad 480 y font_scale 1,15 leídos del dispositivo.
Development build `com.anonymous.banuchat` ya instalada y en primer plano; guardas
antes de interactuar. Sin reinstalar, borrar datos ni cambiar ajustes. Login con
cuenta ficticia existente; credenciales no impresas ni capturadas.

Se recorrieron Historial, Progreso, Calendario, Noticias, OE2, Banu al día,
Notificaciones y visor. Se comprobaron filtros de cursos completados/cierres,
categorías OE2 Convocatorias/Novedades, expansión Antes/Ahora y scroll. En
Notificaciones se observó permiso ya concedido, estado inactivo y cero recordatorios;
no se pulsó activar, prueba local ni cancelar. Sus garantías funcionales siguen
acreditadas por las pruebas existentes de deduplicación, cancelación y aislamiento,
no por una activación física nueva.

El visor se abrió durante la comprobación inicial de UIX-04B desde una conversación
propia existente: nodo de texto observado de 251 caracteres, versión visible y
regreso al chat confirmado. Esas imágenes limpias permanecen en `android/after/`;
el visor no cambió después. Una repetición posterior del helper no completó la
localización de un enlace visible en un turno anterior de un chat de varios turnos;
no se acredita ese intento como PASS. No se enviaron mensajes nuevos para sortearlo.
La galería identifica expresamente el origen de esas dos tomas.

Las pruebas físicas no crearon ni eliminaron conversaciones ni modificaron registros
preexistentes. Logout confirmado sin aviso de revocación incierta. Se retiraron
solo los reverse USB 3004/8084 añadidos por esta tarea (lista inicial vacía) y su
volcado UI temporal. App sin sesión; API/proxy/Metro existentes intactos.

El juez independiente inspeccionó imágenes reales de la app frente al HTML y los
reportes: sin bloqueadores, problemas mayores ni hallazgos visuales pendientes en
la evidencia final revisada. No operó UI ni acredita comportamiento por inspección.
Las parejas de texto/color calculadas en `contrast.json` dan entre 4,83:1 y 13,86:1;
selección magenta/rosa 7,84:1. No equivale a auditar WCAG completo.

## Evidencias locales y reproducción

Raíz ignorada: `mobile/.expo/uix04b/`.

- `before/`: 98 capturas; `after/`: 112 capturas finales, 1440/820/390/360×900.
- `reference-render/`: 32 PNG del mockup offline y hash de su HTML.
- `comparison-index.html`, `comparison-manifest.json`: 98 pares con SHA-256.
- `mockup-comparison.html`: 28 pares referencia/app. Notificaciones no se fuerza
  en web: la guarda existente se conserva y se comprueba en Android.
- `extra-states.html`: estados solo posteriores, incluidos errores/carga del visor.
- `android/index.html`, `android/comparison-manifest.json`, `android/report.json`:
  10 pares físicos (ocho pantallas, Home y detalle Antes/Ahora), resultados y límites.
  Las imágenes emparejadas del visor están en after/; las otras finales en final/.
- `iterations/01` y `02`: intentos anteriores, sin sobrescribir la base.
- `debug/`, `navigation-focal/`: comprobaciones focales de ARIA y geometría del menú.
- `contrast.json`, `android-export/`, `validation-manifest.json`: cálculos, Hermes
  y resumen verificable de evidencias.

Las galerías enlazan imágenes por rutas relativas y pueden trasladarse con sus
carpetas de capturas. Las imágenes reales del visor corresponden al entorno CCD
local: siguen ignoradas por Git y deben revisarse antes de distribuir fuera de él.

## Archivos modificados

- `mobile/src/app/history.tsx`, `progress.tsx`, `calendar.tsx`, `announcements.tsx`,
  `oe2.tsx`, `oe2-changes.tsx`, `document.tsx`, `notifications.tsx`.
- `mobile/src/app/home.tsx`: únicamente ajuste responsive nativo autorizado.
- `mobile/src/components/secondary-ui.tsx`, `screen-header.tsx`,
  `oe2-change-card.tsx`, `web-frame.web.tsx`.
- `mobile/src/ui/animated.tsx`: únicamente atributos ARIA de la barra;
  `tokens.ts`: comentario de adopción, sin alterar valores antiguos;
  `web-appearance.ts`: integración visual y wrap de secundarias.
- `mobile/scripts/check-uix01.mjs`, `uix02-review.mjs`, `compare-uix01.mjs`,
  `capture-uix04a-reference.mjs`: evidencia UIX-04B separada y pruebas focales.
- `mobile/README.md` y este checkpoint.

AppButton se reutiliza sin editar; Login, Chat, assets, API, auth, sesión y el
proveedor/modelo de notificaciones no se modifican. Las capturas y helpers ADB
temporales quedan bajo `.expo/`, fuera de Git.

## Diferencias respecto al mockup y pendientes reales

Se conserva la tipografía del sistema, objetivos táctiles de la app, avisos de demo,
datos reales del entorno, autenticación y controles de recuperación. No se portan
favoritos/búsqueda de historial, títulos inventados, acciones editoriales, recordatorios
web ni categorías que no existan en el contrato. El visor muestra el texto real y su
versión, no la página ilustrativa del HTML. Hay mayor densidad móvil por datos y
procedencia que deben mantenerse visibles. No se añadió paginación donde no existe;
Banu al día conserva su aviso has_more y la indicación de refinar filtros.

PENDIENTE: revisión visual humana de aceptación; TalkBack y auditoría completa de
accesibilidad/geometría nativa; rendimiento/FPS/memoria en release; activación,
sincronización, entrega y cancelación físicas de recordatorios; preferencia reducida
del sistema Android y otros navegadores/dispositivos no probados. Las validaciones
realizadas se limitan al alcance descrito. UIX-04B se detiene aquí.
