# CHECKPOINT UIX-04C — BanuChat

Inicio: 2026-11-01 (America/Bogota).
Cierre: 2026-11-02 (America/Bogota).
Estado: **UIX_04C_IMPLEMENTED_WEB_VALIDATED_ANDROID_SMOKE_VALIDATED**.
Trabajo terminado para revisión humana, con límites explícitos de accesibilidad
y rendimiento. No se inicia UIX-04D ni ADMIN-01. Sin commit ni push.

## Base y restricciones

- Rama inicial: `main`. HEAD inicial y conservado:
  `6caf20ef27051b051afdb3dc8aca09575acdaa68`.
- Árbol inicial limpio. UIX-04A y UIX-04B ya estaban incorporadas. No se
  descartaron cambios del usuario ni se hicieron restauraciones destructivas.
- Se leyeron AGENTS.md, checkpoints UIX-04A/04B, README y componentes/primitivas
  solicitados, sus dependencias directas y scripts de evidencia pertinentes.
- Se reutilizaron las seis skills locales: expo-animation, expo-native-ui,
  expo-design-system, vercel-react-native-skills, design-ux y design-taste-frontend.
  Se conservó su registro de procedencia/licencias. No se instalaron paquetes.
  Sus instrucciones no sustituyen los límites del repositorio. La regla 0 de
  design-ux justificó el juez independiente de solo lectura, sin implementación.
- SDK 57, RN 0.86.3, React 19.2.3, Router y Reanimated 4.5.1 conservados.
  No se generaron `android/` ni `ios/` ni se instaló otro APK.
- No se modificaron backend, REST, auth, políticas de sesión/permisos, errores,
  retry, caché, modelos, PostgreSQL, RAG, Ollama, Agent/MCP, N8N, corpus ni OE2.
  PNG oficiales y tokens de identidad permanecen intactos.
- Evidencias iniciales y hashes de ocho archivos centrales:
  `mobile/.expo/uix04c/baseline-source/` y `baseline-source-manifest.json`.
  Ninguna carpeta de evidencia de etapas anteriores se sobrescribió.

## Diagnóstico y decisiones

| Tipo / prioridad | Evidencia | Corrección delimitada |
| --- | --- | --- |
| Defecto confirmado / alta | Con cuatro mensajes, abrir las fuentes de una respuesta antigua cambiaba su posición de 453 a −301 px: salto de −754 px. | Chat limita auto-scroll a carga/conversación/turno/espera nuevos; expandir referencias conserva la lectura. Resultado final 453 → 453, delta 0. |
| Defecto confirmado / alta | El recorrido web acumulaba 112 listeners de movimiento reducido, también después de desmontar las pantallas privadas. | Fuente compartida con un listener, suscripción/desuscripción y protección frente a consultas/eventos obsoletos. Final: un listener en Home, Chat y Login; lo conserva legítimamente la raíz de navegación. |
| Defecto confirmado / media | Escape, después de abrir el menú desde Más inferior, enfocaba el disparador superior. | Se recuerda el disparador real; se enfoca la primera opción al abrir y se restaura el foco correcto al cerrar con Escape. |
| Defecto confirmado / media | Radios web sin nombre de grupo en varias pantallas; flechas no cambiaban selección y cada chip era parada Tab. | Nombres de grupo, una parada por selección, flechas con retorno circular y Home/End. Se mantienen grupos independientes y selección exclusiva existente. |
| Defecto confirmado / media | `busy` y expansión nativos no se exponían explícitamente en RN Web en los controles inspeccionados. | ARIA ocupado/expandido y página actual; selección nativa conservada. El spinner del botón es decorativo. |
| Defecto confirmado / media | Estrés CSS real al 150%, 360 px: CTA de Home invadía el espacio del búho. | El CTA reserva ancho al avatar y su texto puede envolver. Separación final de 17 px, sin reducir fuente ni modificar PNG. |
| Defecto confirmado / menor | En ese estrés el título Publicaciones se partía dentro de la palabra por la acción Inicio a la derecha. | El encabezado web admite envolver; el título conserva su ancho mínimo de palabra y Inicio pasa debajo cuando es necesario. |
| Defecto confirmado / menor, ampliación física autorizada | Con fuente nativa efectiva 1,45, el ala de Banu invadía el extremo blanco del CTA de Home. | Solo para fuente nativa >1,3, el hero pasa a columna, amplía el ancho del texto y coloca el avatar en flujo debajo del CTA. Verificado de nuevo, sin solapamiento; fuente normal y web conservan composición. |
| Mejora justificada | Preferencia de movimiento modificada durante presión/progreso/typing podía conservar valores intermedios durante la transición de efectos. | Con movimiento reducido se pinta directamente el estado completo y se mantienen cancelaciones de animación. Stack usa `none` cuando corresponde. |
| Mejora justificada | Selección de chip apoyada principalmente en color; nombre accesible de barra repetía el porcentaje del valor. | Selección subrayada y en negrita; barra anuncia curso, valor y rango sin repetir porcentaje en su nombre. Datos intactos. |
| Hipótesis no implementada | No se demostró que listas, imágenes originales o edición necesitaran otra arquitectura. | Sin memoización masiva, nueva caché, conversión indiscriminada a FlatList ni cambios de assets. |

La entrada contextual de Banu ya estaba cubierta por FadeIn/BubbleIn; se conserva.
No se añade un bucle permanente al personaje. Duraciones existentes: presión
120 ms, entrada 180 ms, progreso 240 ms. Se usan opacidad/transformaciones,
cancelación y preferencia de movimiento; no se anima la lectura documental.

## Archivos modificados

Todas las rutas de esta lista son relativas a la raíz del repositorio.

| Archivos | Motivo |
| --- | --- |
| `mobile/src/ui/animated.tsx`, nuevo `motion-preference.ts` | Suscripción compartida y estados completos en movimiento reducido. |
| Nuevo `mobile/src/ui/filter-keyboard.ts` | Teclado dentro del grupo de filtros existente. |
| `mobile/src/ui/web-appearance.ts`, `mobile/src/app/home.tsx` | Texto ampliado: separación CTA/avatar, redistribución de encabezados y avatar en flujo con fuente nativa grande. |
| `mobile/src/components/app-button.tsx`, `banu-core.tsx`, `chat-sources.tsx`, `secondary-ui.tsx` | Estados accesibles, selección perceptible y teclado, sin sustituir primitivas. |
| `mobile/src/components/web-frame.web.tsx` | Foco del menú y disparador real. |
| `mobile/src/app/_layout.tsx` | Preferencia de movimiento en transición Stack. Guardas y claves de sesión intactas. |
| `mobile/src/app/chat.tsx` | Posición al expandir referencias y estado ocupado del envío. |
| `mobile/src/app/progress.tsx`, `calendar.tsx`, `announcements.tsx`, `oe2.tsx` | Nombre accesible de grupos; barra de progreso sin porcentaje duplicado. |
| Nuevo `mobile/test/motion-preference.test.ts` | Tres pruebas de ciclo de vida, cambios de preferencia y carreras asíncronas. |
| `mobile/scripts/check-uix01.mjs`, nuevos `uix04c-review.mjs`, `compare-uix04c.mjs` | Evidencia focal aislada, baselines protegidos y galería compartible. |
| `mobile/README.md`, este checkpoint | Reproducción, resultados y límites. |

## Validación ejecutada

| Comando / recorrido | Resultado real |
| --- | --- |
| `npm run typecheck` | PASS. Incluye comprobación final tras ARIA de navegación. |
| `npm run lint -- --no-cache` | PASS, sin errores ni advertencias de lint. |
| `npm test` | PASS, 68/68; incluye tres pruebas nuevas de movimiento. |
| `npm run web:export` | PASS, 15 rutas; bundle final `entry-d12a0c743eb85bfcb4efccb4e2bd1cde.js`, 2,2 MB. |
| `npm run web:test` | PASS, 1/1: proxy, restricciones de transporte, errores y exportación. |
| Export Expo Android Hermes | PASS, bundle final `entry-d62d92f257c7718c037a766d2d80b609.hbc`, 4 MB; 30 assets. No equivale a instalar ni medir una release. |
| `node scripts/check-uix01.mjs after --uix04c` | PASS, 19 capturas y 27 comprobaciones finales; `errors: []`, API escapada 0, un POST interceptado 503 sin reenvío y con borrador conservado. |
| Mismo comando con `--text-stress` | PASS, 8 capturas; tres vistas con texto/altura de línea realmente multiplicados por 1,5 a 360 px. CTA/avatar separados 17 px. |
| Mismo comando con `--scroll-stress` | PASS, 7 capturas; fixture de cuatro mensajes y posición estable al expandir fuentes antiguas. |
| `node scripts/compare-uix04c.mjs` | PASS, 24 pares, rutas relativas, manifiesto SHA-256. |
| `node --check` de los tres scripts nuevos/modificados de UIX-04C | PASS. |
| WEB-02 real, `node --import tsx scripts/check-unified-web-browser.mts --web02 --skip-login-controls` | PASS, `BANUCHAT_WEB_02_BROWSER_VALIDATED`; detalles debajo. |
| `git diff --check` y revisión de alcance | PASS. Solo frontend móvil/web, pruebas, scripts y documentación de UIX-04C. |

Android se exportó con el CLI instalado, `EXPO_NO_DOTENV=1`, modo
`ccd_authenticated`, canal `adb_reverse` y API loopback local; salida
`.expo/uix04c/android-export`. TEMP/TMP solo se cambiaron en ese proceso.

WEB-02 real verificó progreso/calendario/anuncios/OE2/cambios, responsive,
borrador y teclado, chat documental real con dos fuentes, visor, reapertura,
aislamiento por cuenta, 409 y POST incierto sin reenvío, confirmación de borrado,
logout, cambio de cuenta y protección tras recarga. Solo eliminó su nueva
conversación vacía de prueba. Limpieza: dos sesiones revocadas, dos ya inactivas,
cero sin confirmar, perfil temporal cerrado. Informe privado fuera de Git:

`C:/Users/samue/AppData/Local/BanuChat/web-02/ffb4127c-63e1-40a3-92cd-55a6e724c700/report.json`

Ese recorrido precedió los últimos ajustes visuales de CTA/encabezado y la
corrección de scroll. Sus casos afectados se verificaron después mediante los
recorridos focales y Android, sin repetir consultas RAG costosas innecesarias.
El estrés CSS y scroll preceden únicamente el último atributo web `aria-current`;
el recorrido general final comprueba ese atributo y el resto de las interacciones.
Tras la autorización posterior se corrigió únicamente el hero con fuente nativa
grande y se repitieron typecheck, lint, 68 tests, exportaciones web/Hermes y el
recorrido general web de 27 comprobaciones; no hubo nuevas consultas RAG.

## Accesibilidad y adaptación

Se verificaron Tab, Shift+Tab, Space, Enter, Escape, flechas y Home/End en los
controles pertinentes del recorrido focal. Filtros de Progreso, Calendario,
Noticias, OE2 y Banu al día: grupo nombrado, selección, una parada Tab por grupo.
Menú compacto: primera opción al abrir, cierre y retorno a Más. Login conserva
orden Usuario → Contraseña y vuelta. Visor responde a Enter en Volver. Se
mantienen foco visible, foco de contenido, rutas y controles de acceso existentes.

Envío ocupado, expansión de fuentes y página actual tienen ARIA explícito.
No se añadió una región viva al transcript completo. Los anuncios existentes
de carga/error se conservan; no se rediseña su semántica de recuperación.
El error controlado conserva borrador y un solo POST. Preferencia web reducida
modificada durante la sesión: cero animaciones web activas en la comprobación.
Las pruebas unitarias acreditan que un evento actual prevalece sobre lecturas o
eventos obsoletos y que el último consumidor libera la suscripción.

Geometría web a 360/390/820/1440 × 900: sin overflow raíz ni de mensajes en
las capturas finales; sin controles visibles menores de 43 px en el detector.
No se afirma que toda la interfaz nativa tenga geometría certificada a partir de
UIAutomator. El estrés CSS al 150% no equivale a escala de fuente física Android.
CDP también aceptó emulación OS 1,5, pero no se utiliza como prueba de que las
fuentes explícitas CSS px crecieran; para eso se creó el estrés CSS separado.

Contraste calculado de pares de texto de tokens existentes:

| Primer plano / fondo | Relación |
| --- | --- |
| banuInk / surface | 14,55:1 |
| banuSecondary / banuCanvas | 5,84:1 |
| banuMagentaStrong / banuSoft | 7,84:1 |
| white / banuMagenta | 6,82:1 |
| banuOnNavy / banuNavy | 9,08:1 |

Informe `mobile/.expo/uix04c/contrast-report.json`. Son pares focales de texto;
no una certificación de todos los bordes, estados, fondos o WCAG completa.

El juez independiente revisó imágenes y reportes sin implementar ni operar la UI.
Sin blockers/majors en las vistas auditadas; su hallazgo menor del título OE2
al 150% se corrigió y volvió a revisar. Esta revisión no sustituye un lector real.

## Android físico

Huawei YAL-L21, Android 10, development build existente, 1080 × 2340, densidad
480, escala de fuente inicial y restaurada **1,15**. Se reutilizaron servicios locales y
dos reverse temporales 3004/8084; no se instalaron herramientas ni APK.

Realizado: Login con cuenta ficticia; Home; creación de un chat vacío propio;
teclado/compositor y borrador largo; limpieza del borrador sin enviarlo; Historial;
Progreso con Completados seleccionado; Calendario con Cierres seleccionado;
Noticias; categorías OE2; Banu al día y Antes/Ahora; fuentes de una conversación
documental existente; visor cargado y regreso a Chat/Home; Notificaciones; logout.
No se enviaron nuevos mensajes físicos para obtener documentos. Se conserva la
conversación vacía creada por el smoke; no se borraron conversaciones previas.

En el caso de teclado el botón Enviar quedó completamente por encima del IME en
la captura inspeccionada. Se comprobaron etiquetas/estados nativos y acciones;
esto no acredita orden hablado, pronunciación ni experiencia TalkBack.

Notificaciones locales: permiso ya concedido, estado inicial inactivo y cero
futuras. Activación programó **7 recordatorios sintéticos**. Se envió la prueba
local de cinco segundos y la UI confirmó la recepción nativa durante esa apertura.
Después se desactivó/canceló: **inactivo, cero futuras**, sin errores. No se
afirma recepción push remoto ni que se observara un banner del sistema. No había
recordatorios personales existentes que alterar. Proveedor y permisos intactos.

Final: sesión cerrada y sin aviso de revocación incierta; ambos reverse retirados
y lista vacía; XML temporal propio eliminado. El primer smoke no cambió ajustes;
la ampliación autorizada siguiente sí los cambió temporalmente y los restauró.
TalkBack no se activó. Informes `android/report.json`, `notifications-report.json` y
`performance-report.json` bajo `.expo/uix04c/`. Capturas locales `android/after/`.

### Ampliación física tras autorización del propietario

El 2026-11-02 llegó la aprobación explícita para cambiar temporalmente fuente y
animaciones y restaurarlas. Se registraron los valores originales antes de actuar:
`font_scale=1.15`, `animator_duration_scale=null` (clave ausente),
`transition_animation_scale=1.0`, `window_animation_scale=1.0`.

Se solicitó `font_scale=1.5`; Dimensions del runtime Hermes midió
**1.4500000476837158**. No se presenta como un 150% efectivo exacto. El recorrido
con esa escala comprobó Home con scroll, menú, Progreso/Completados,
Calendario/Cierres, OE2, Banu al día, Historial y compositor con borrador largo.
Enviar se mantuvo por encima del teclado. El viewport disponible para leer la
conversación queda muy reducido mientras se edita con fuente grande; no impide
enviar ni desplazar el borrador. Se limpió sin enviarlo y se usó un chat propio
existente, sin crear conversaciones ni consultas RAG adicionales.

Se desactivaron temporalmente las tres escalas de animación (`0`). La API nativa
AccessibilityInfo confirmó `isReduceMotionEnabled()=true` y el evento de cambio.
Tras restaurar se confirmó `false`, con eventos `[true,false]`, y Dimensions
volvió a aproximadamente `1.15`. Esta lectura del build físico se obtuvo mediante
el inspector existente, sin agregar un modo de diagnóstico al producto.

La fuente ampliada reveló el solapamiento menor CTA/avatar descrito en la tabla.
Se corrigió solo esa condición de Home y se repitió el caso físico y Progreso con
movimiento reducido; el juez independiente confirmó separación, texto y botón
completos. La composición normal se capturó otra vez después de restaurar.
No se redujo fuente ni se alteró el PNG. No se midió FPS ni se provocó una espera
RAG para comprobar typing físico; ese estado sigue cubierto por web/pruebas.

Los cuatro valores fueron restaurados exactamente, incluyendo eliminar la clave
animator originalmente ausente en lugar de sustituirla por `1`. La restauración
se ejecutó en `finally` también en los intentos diagnósticos parciales. Al terminar
se cerró la sesión, se retiraron ambos reverse y el dump temporal, y se volvieron
a leer los valores originales. No se activaron notificaciones en esta ampliación.

Evidencias dentro de `mobile/.expo/uix04c/android/`:

- `settings-before-home-fix/`: recorrido ampliado inicial y solapamiento.
- `settings-authorized/report.json`: comprobación focal final, errores `[]`,
  `restored: true`, lectura nativa y eventos de activación/restauración.
- `settings-authorized/home-hero-bottom-font145.png`: corrección final.
- `settings-authorized/home-restored-font115.png` y `logout-final.png`: cierre.
- `settings-comparison.html`: comparación física local con rutas relativas;
  no incorporada a la carpeta pública `share/`.

Los dos primeros intentos de preparación se conservan como `settings-attempt-01/`
y `settings-attempt-02/`: CDP inicialmente no resolvía la promesa polyfill y luego
el driver esperaba 1,50 exacto, mientras Huawei aplicaba 1,45. Se corrigió el
diagnóstico, no el producto, y todos restauraron los ajustes. Una lectura del
primer recorrido también colisionó con otra sonda simultánea al compartir una
variable diagnóstica; el reporte final usa claves por proceso y confirma la
restauración nativa. No se atribuyen esos fallos del driver a AccessibilityInfo.

## Rendimiento medido

| Medición / condiciones | Antes | Después / interpretación |
| --- | --- | --- |
| Listeners web de prefers-reduced-motion, mismo recorrido con API interceptada | Home 25; Chat 92; tras logout 112 | Un listener compartido en todos esos puntos. Reducción comprobable de suscripciones retenidas; no se presenta como mejora de FPS. |
| Editor web, Edge headless, bundle exportado, 12 entradas y dos rAF por muestra | Mediana 32,5 ms; TaskDuration 0,028336 s | Mediana final 32,1 ms; TaskDuration 0,052027 s. Sin mejora de latencia acreditada; ruido de entorno y muestras pequeñas. |
| Android físico desarrollo, seis gestos alternados de Home, ventana de 6364 ms | Sin baseline equivalente | 325 frames, 22 janky (6,77%); p50 7 ms, p90 13 ms. Diagnóstico de desarrollo, no FPS release. |
| Memoria Android en ese proceso de desarrollo con HMR y recorrido prolongado | Sin baseline | PSS total 1 101 153 KiB, aproximadamente 1,05 GiB. Una muestra; requiere proceso fresco/release para atribuir causas o compararla. |

No se hicieron afirmaciones de aceleración general, render time nativo ni FPS
release. La evidencia del cuello confirmado fue el ciclo de suscripciones y el
salto de lectura de fuentes; no justificó cambiar arquitectura, caché o listas.

## Evidencias y reproducción

Raíz local: `mobile/.expo/uix04c/` (ignorada por Git).

- **Galería compartible:** `share/index.html`, 24 pares: 19 comparaciones
  generales, dos focales de fuentes y tres de texto CSS ampliado. `manifest.json`
  registra hashes/procedencia; `observations.json` guarda mediciones y límites.
  Compartir únicamente la carpeta `share/`, que usa rutas relativas y solo
  capturas de fixtures sintéticos interceptados.
- `before/` y `after/`: informes generales e interacción, capturas web. La base
  before corresponde al HEAD inicial. El último after tiene 27 comprobaciones;
  las iteraciones previas tenían 26, antes de añadir la de página actual.
- `scroll-stress/{before,after}/`: reproducción focal antes/después de corregir
  scroll; su antes no se presenta como una nueva captura del HEAD inicial.
- `text-stress/iterations/01/` frente a `text-stress/after/`: comparación focal
  previa a los ajustes de CTA/encabezado, durante UIX-04C, claramente rotulada.
  No existió una captura CSS 150% de HEAD previa a toda la macrotarea.
- `iterations/` y `diagnostics/`: iteraciones/preparación conservadas. No son
  resultados finales; no se mezclan con la galería.
- `android/`: evidencia física local, incluyendo visor real. No se incorpora a
  artefactos públicos. WEB-02 real permanece en su carpeta privada externa.

Reproducción focal desde `mobile`, con exportación y servidor web local existente:

```powershell
npm run web:export
node scripts/check-uix01.mjs after --uix04c
node scripts/check-uix01.mjs after --uix04c --text-stress
node scripts/check-uix01.mjs after --uix04c --scroll-stress
node scripts/compare-uix04c.mjs
```

Los tres recorridos interceptan toda API, no leen credenciales y no llegan al
backend. El generador necesita las bases históricas locales ya capturadas; no
deben reemplazarse por capturas de código final. La galería contiene solo su
allowlist, no perfiles de navegador ni bundles/configuración.

Incidencias del diagnóstico distinguidas de defectos del producto: Enter del
primer driver CDP carecía de texto de tecla; corregido el driver, Volver funciona
sin editar ScreenHeader. En Android primero se eligió una conversación sin
fuentes, y al cerrar sesión se intentó usar la barra inferior desde Historial;
se corrigió el recorrido para usar Inicio y el control real de Home. Los intentos
fallidos no se declaran PASS ni motivaron cambios de producto.

## Pendientes y límites

- **TalkBack no ejecutado.** Está instalado pero no se activó. La autorización
  posterior cubrió fuente y animaciones; TalkBack se trató por separado.
  UIAutomator, inspector y ARIA no equivalen a un lector de pantalla real.
- **Fuente adicional y movimiento reducido Android:** comprobados según la
  ampliación autorizada anterior; escala efectiva 1,45, preferencia true/false
  y restauración exacta. No se acredita un 1,50 efectivo ni typing físico en espera.
- **Rendimiento release/FPS y memoria comparable:** pendiente; Hermes exportado
  no lo acredita. No se generó proyecto nativo para conseguirlo.
- Error físico forzado y lectura hablada completa de respuestas/procedencia no
  ejecutados. Error controlado web y regresión funcional real sí verificados.
- Sin certificación WCAG, estudio con estudiantes ni aval institucional CCD.

Para la prueba humana pendiente: registrar primero los valores personales;
activar TalkBack con ayuda del propietario y recorrer Login → Home → Chat →
fuentes/visor → filtros → Notificaciones → salida, verificando nombre, estado,
orden y anuncios sin repetir todo el transcript. Como extensión del recorrido
con lector, comprobar especialmente typing en espera y presión en curso; los
casos de fuente/progreso/teclado sin lector ya se realizaron. Restaurar los valores
originales y comprobar inactivo/cero recordatorios y sesión cerrada. No cambiar
ajustes ni repetir notificaciones sin autorización.
