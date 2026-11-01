# CHECKPOINT UIX-04A — BanuChat

Fecha: 2026-11-01 (America/Bogota).
Estado: **UIX_04A_IMPLEMENTED_WEB_AND_ANDROID_SMOKE_VALIDATED**.
Implementación terminada para revisión visual humana; límites de accesibilidad y
rendimiento indicados al final.
Sin commit ni push. No se inicia UIX-04B/C/D ni ADMIN-01.

## Estado inicial y preservación

Rama `main`, HEAD `9ffa237089f7f2be0c9d4361178992cd03e1c01f`
(`Refresh secondary mobile screens for UIX-02`). El árbol local **ya contenía
UIX-03 sin commit**, con sus PNG oficiales y checkpoint. El posterior retoque
pastel rechazado se había revertido: no había SoftCanvas ni gradientes pastel;
la exportación base coincidía con `entry-032115406d2a4a24a8f3dab1d0fc7b02.js`.
No se supuso que el remoto representara el workspace.

Modificaciones preexistentes: README; helpers check/compare-uix01; login, home,
chat; AppButton, secondary-ui, web-frame.web; animated, tokens, web-appearance.
Sin seguimiento preexistente: checkpoint UIX-03, carpeta de PNG/procedencia Banu,
banu-avatar y test de fidelidad de recursos. No se descartó ninguno.

Se leyeron AGENTS.md, README, checkpoints UIX-01/02/03 y las implementaciones y
dependencias directas autorizadas. Los archivos iniciales relevantes se copiaron
a `.expo/uix04a/baseline-source/`, con manifiesto SHA-256. El baseline visual nuevo
se capturó antes de modificar las pantallas. La bandera --uix04a rechaza volver a
sobrescribir `before/report.json`.

Se conservan SDK 57, RN 0.86.3, Router, AuthSession, SecureStore, sesión web en
memoria, transportes y contratos. No hay dependencias nuevas, otro proyecto,
WebView ni carpetas nativas generadas. No se modifican backend, auth, REST,
PostgreSQL, RAG, Ollama, Agent/MCP, N8N, corpus, datos congelados ni publicaciones.

## Referencia exacta y recursos

ZIP aportado: `BanuChat_UIX04_Mockup_Para_Codex.zip`.
SHA-256: `c261bfa99aab492f24054ac07fbe435982e310f49ef7fe988e6a37fc298b663c`.

Fuente de verdad: **BanuChat_mockup_refinado_UIX04.html**.
SHA-256: `7c0a0ebdce8dba32431feba7e2417a3d0cce247d2ec089f3af6a60d53c785927`.
Se extrajo el ZIP con verificación de rutas, a una carpeta inexistente de trabajo:
`mobile/.expo/uix04a/reference/`. No se sobrescribió código ni el ZIP original.
Se consultaron su guía, CSS/estructura y seis PNG aportados. Las etapas de
secundarias que menciona la guía quedan subordinadas al alcance UIX-04A del usuario.

El HTML se renderizó sin HTTP/HTTPS para Login/Home/Chat a los cuatro tamaños:
12 PNG en `reference-render/`. Son evidencia de **la referencia**, no de Expo ni
de servicios reales. No se copió su JavaScript simulado, readonly de perfil,
respuestas, citas, agenda, likes, favoritos o permisos al producto.

Se reutiliza `mobile/assets/images/banu/banu-color.png`, PNG oficial RGBA
1254 × 1254, SHA-256
`07bcc4dd2d7e49b1437f0f3b6defb830299d435a9b71930d931f2bde90134787`.
Se conservan los tres originales y `provenance.json` de UIX-03; no se cambia texto
UNAB, transparencia, proporciones o bytes. No se usa el PNG reducido embebido
como sustituto del original, ni se generan variantes. expo-image mantiene contain,
downscaling de presentación y caché local; la mascota junto a texto es decorativa.
La autorización de uso proviene del propietario que suministró los recursos;
no se atribuye una licencia pública de marca no aportada.

## Skills consultadas

Se reutilizaron, sin instalación/actualización, las seis skills locales y su
registro en skills-lock.json: expo-design-system, expo-native-ui, expo-animation,
vercel-react-native-skills, design-taste-frontend y design-ux. Se consultaron sus
instrucciones pertinentes de adopción del sistema existente, propiedades nativas,
gradientes Fabric, rendimiento, imágenes, motion y revisión renderizada. Las
skills Expo y Vercel tienen procedencia/licencia MIT registradas; las dos de diseño
conservan su procedencia comunitaria y revisión local previa. No prevalecen sus
preferencias de framework, librerías, fuente o estética sobre el repositorio y
el mockup. La regla 0 de design-ux motivó el juez independiente, solo de lectura.

## Auditoría y decisiones de implementación

| Diferencia con UIX-03 | Implementación UIX-04A |
| --- | --- |
| Identidad índigo genérica y avatar circular | Wordmark Banu/Chat con magenta y mascota a color sin disco en composiciones principales. |
| Hero previo con icono antes del texto | Hero navy, texto a la izquierda y búho a la derecha; CTA blanco. En móvil se reservan anchos para que el texto no invada el dibujo. |
| Home sin columna de agenda y accesos en lista nativa | Agenda lateral de escritorio; rejilla de dos columnas en móvil; historial al pie y rutas existentes conservadas. |
| Chat como piezas sobre el fondo | Panel blanco continuo con cabecera, lista y compositor; rosa suave para usuario, asistente sin tarjeta interior dominante. Fuentes laterales en escritorio amplio. |
| Login previo de gran presentación horizontal | Tarjeta de bienvenida navy/formulario blanco; vertical compacta en Android y web estrecha. Se conserva usuario/contraseña real. |
| Navegación previa solo menú compacto en tablet | Sidebar desde 760 px (216 px en tablet y 246 px en escritorio); barra inferior en compacto y navegación nativa adaptada. |

Los valores navy #252d4b, tinta #24283c, magenta #9b326f/#80265a,
rosa #f7edf3, canvas #faf9fb y borde #e9e7ec viven en el archivo de tokens existente.
Los tokens banu y el tone opcional de AppButton permiten adoptar esta fase sin
recolorear el contenido de UIX-02. La navegación compartida sí adopta la identidad
aprobada. No se crea otro theme, librería visual ni sistema paralelo.

Sombras de panel/control/inset/hero están centralizadas. Lectura de respuestas y
documentos plana, límites/fuentes visibles sin depender del relieve. El hero usa
gradiente estático CSS en web y experimental_backgroundImage de Fabric en nativo.
No hay blur animado, animación de sombra o tamaños por frame. Se conservan entradas
Reanimated de 180 ms, feedback de presión de 120 ms, aparición de mensajes y typing
solo con operación pendiente/app activa. No se porta el bucle perpetuo de flotación
del HTML; Banu participa en la entrada y feedback del hero, sin distraer al leer.
Se conserva preferencia reducida suscrita y ReduceMotion.System.

### Login

Nuevo shell con marca/título, panel de Banu y formulario. Campos de 52 px, etiquetas
persistentes y texto de entrada de 16 px, avance de teclado y submit existentes.
Se mantienen validación, errores, bloqueo busy, almacenamiento, handlers y
redirección. La referencia tiene un perfil readonly sin auth: se sustituye por
los dos campos reales, no por un acceso simulado. No hay marketing web oculto
montado con display:none en Android.

La prueba física posterior motivó una composición **nativa** más compacta: Banu
junto al saludo, sin repetir el título de página de la web, y «Inicia sesión»
como encabezado del formulario. Mantiene campos y botón visibles con fuente del
sistema 1,15, sin reducirla ni cambiar ajustes del teléfono. Web conserva el panel
vertical/horizontal del mockup.

### Home

Saludo usa el alias real de la sesión. Hero y barra inferior invocan la creación
existente. Los accesos respetan sus capacidades (calendario, progreso, anuncios;
OE2/recordatorios conservan su habilitación existente) y no inventan permisos.
HomeAgenda consume getCalendarEvents ya existente, con rango civil Bogotá de
30 días, orden temporal y máximo dos resultados; presenta carga, vacío y error.
Solo se monta en escritorio cuando existe capacidad calendar y descarta resultados
al salir o cambiar perfil. No hace retry, nueva caché ni endpoints. Las fechas
del HTML no se usan. Identifica explícitamente los auxiliares ficticios.

### Chat y navegación

Se mantienen carga/apertura, sendMessage, caché por conversación/sesión, borrador,
4000 caracteres, respuestas tardías, comprobación manual, incertidumbre sin reenvío,
409 y aislamiento. Nuevo chat usa openNewConversation existente y conserva el
tratamiento especial de la operación incierta. Enlaces a fuentes siguen validando
document_version_id/artifact_url; el contexto lateral muestra las citas de la
última respuesta real y el toggle junto a cada mensaje conserva sus fuentes.

La barra nativa utiliza las rutas disponibles, ofrece menú desplazable y cierra
el menú con Back. Al aparecer el teclado se ocultan barra inferior y presentación
del chat para reservar espacio. La cabecera nativa usa toolbar compacta. El panel
anidado tiene ancho explícito, lista con flex:1/minHeight:0 y KeyboardAvoidingView
en modo padding, con keyboardVerticalOffset calculado mediante insets.top +
padding superior. No usa una altura de teclado fija en el producto. La entrada
se limita visualmente a 72 px con IME y desplaza internamente textos largos,
conservando su valor y límite de 4000. La advertencia completa se integra en el
footer nativo junto a Enviar, sin añadir otra fila debajo del teclado.
El shell web conserva el subárbol estable al redimensionar. El foco programático
se dirige al encabezado **visible** del core o al main de secundarias, con dos
requestAnimationFrame para esperar el cambio de vista. Los controles conservan
contorno de 3 px; solo el contorno de ese foco programático de título se omite.

## Validaciones y correcciones

| Prueba ejecutada sobre el cierre | Resultado real |
| --- | --- |
| `npm run typecheck` | PASS. |
| `npm run lint -- --no-cache` | PASS, cero errores/advertencias. |
| `npm test` | **65/65 PASS**, cero saltadas. |
| `npm run web:test` | **1/1 PASS**. |
| `npm run web:export` | PASS, 15 rutas; `entry-783798efadd2d1bcf0a74c25567256ea.js`. |
| `check-uix01.mjs before --uix04a` | PASS, **57** capturas nuevas del UIX-03 local; baseline conservado. |
| `check-uix01.mjs after --uix04a` | PASS, **62** capturas finales, errores runtime/overflow raíz e interno registrados: ninguno. |
| `compare-uix01.mjs --uix04a` | **57 pares** antes/después y **12 pares** mockup/app, con SHA-256; cinco estados extra solo después. |
| `capture-uix04a-reference.mjs` | 12 capturas offline; verifica SHA-256 de la referencia y bloquea HTTP/HTTPS. |
| `check-unified-web-browser.mts --web02 --skip-login-controls` | **BANUCHAT_WEB_02_BROWSER_VALIDATED**, repetido tras los ajustes finales del contenedor. |
| Exportación Android Hermes | PASS, **1690 módulos**, 30 assets; `entry-330a1c5bb5a1ceb345c5006e1b6df426.hbc`. |
| Recorrido físico YAL-L21 / Android 10 | Login, Home, teclado, borrador largo, respuesta real, tres fuentes, visor, menú/Back, historial y logout confirmados. |
| `node --check` helpers JS y `git diff --check` | PASS. |

La exportación Android usa `.expo/uix04a/android-export`, TEMP/TMP en
`.expo/uix04a/hermes-temp`, modo ccd_authenticated y canal adb_reverse únicamente
en el proceso. No cambia .env.local, proyectos nativos ni SDK. El test del proxy
se ejecutó después de exportar los archivos definitivos.

El evaluador visual comprueba login rechazado, borrador al navegar/redimensionar,
fuentes/visor sintético, texto largo/abstención, sugerencias sin envío, un único
POST interceptado de error con borrador conservado, menú/Escape, foco de 3 px,
guardas después de logout, imágenes cargadas con contain y cero animaciones
activas al reducir movimiento. Añade estados de agenda (carga/contenido/error) y
verifica que 4001 caracteres deshabilitan Enviar, 4000 siguen válidos y el borrador
anterior se restaura, sin enviar esos textos. Registra **cero peticiones de API
escapadas** al backend. No confunde sus fixtures con el recorrido auténtico.

Informe privado final WEB-02:
`%LOCALAPPDATA%/BanuChat/web-02/8c2915a9-aded-4a85-a4fa-6f4a6c4f2d30/report.json`.
Se comprobaron mensaje/documento reales, fuentes, historial, navegación/borrador,
operación pendiente al salir/volver, aislamiento de cuentas, 409 y POST incierto
sin reenvío, comprobación manual, confirmación de borrado de un chat propio nuevo,
logout/expiración, cambio de cuenta y recarga sin persistencia. Se omiten solo los
controles negativos de login ya acreditados; el login real continúa activo.
Limpieza final: dos sesiones revocadas, dos ya inactivas, ninguna sin confirmar;
perfil Edge desechable retirado. Los dos intentos fallidos anteriores también
cerraron su sesión (una revocación cada uno, ninguna incierta) y retiraron sus
perfiles. La otra ejecución completa previa también pasó. Los recorridos conservan
sus conversaciones documentales propias y eliminan solo su chat vacío de ensayo,
no conversaciones preexistentes.

Se acreditaron TypeScript, lint sin advertencias, 65/65 pruebas unitarias y prueba
web/proxy 1/1. La comparación inicial generó 57 capturas; la revisión independiente
detectó una sugerencia recortada internamente en móvil, aunque no hubiera overflow
raíz. Se corrigieron anchos/wrap y se añadió testID y comprobación interna. La
segunda iteración produjo 60 capturas sin errores (tres estados extra de agenda).
Se corrigieron también padding web anulado por los insets de SafeAreaView,
separación título/búho a 820 px, icono de nav residual azul y altura del login móvil.
Las iteraciones se conservan; el antes no fue sobrescrito.

Primer WEB-02 falló por asumir que width<1024 implica menú compacto. Se adaptó
esa comprobación a la presencia visible del control: conserva Escape/foco en
compacto y exige navegación visible en escritorio. Segundo intento detectó una
regresión real de foco al encontrar un encabezado de Home ya oculto. No se relajó
su aserción: se corrigió el selector/espera de vista. Una prueba focal interceptada
confirmó foco en Home, Progreso y Calendario a 1366/768/390. No se acreditan los
intentos fallidos como PASS. Los dos fallos ocurrieron antes del chat documental.

Los cálculos de color centralizados en `contrast.json` dan: tinta/canvas 13,86:1,
secundario/blanco 6,13:1, muted/blanco 5,35:1, blanco/magenta 6,82:1,
texto usuario/rosa 7,84:1 y texto hero/navy base 9,08:1. Esto comprueba esas parejas,
no una auditoría WCAG completa ni cada punto del gradiente. Las primitivas fijan
un mínimo de 48 px; el harness mide controles web visibles ≥44 px. No se acredita
la geometría accesible nativa completa (ver límites).

### Comprobación física y correcciones nativas

Al principio ADB no tenía dispositivo; al cierre apareció **YAL-L21, Android 10**,
1080 × 2340, densidad 480 y font_scale 1,15. Se reutilizó la development build
instalada, con BanuChat en primer plano y guardas antes de cada interacción.
No hubo instalación, reinstalación, borrado de datos ni cambio de configuración
de fuente/animación/lector. Se omitió la introducción existente y se usó la cuenta
ficticia asignada, sin imprimir ni capturar credenciales.

La primera revisión física detectó intro nativa demasiado alta y un contenedor
horizontal que se ensanchaba al entrar el ajuste height de KeyboardAvoidingView.
Se corrigieron ancho, toolbar, tamaño visual de entrada y offset de área segura;
la advertencia completa y Enviar permanecen sobre el IME. No se aceptaron las
capturas defectuosas como validación final. También se ajustó un helper temporal
que reconocía Home solo por un saludo visible; su falso negativo no era un rechazo
de credenciales: Home y las operaciones autenticadas posteriores confirmaron login.

Se crearon dos conversaciones propias de ensayo; hay **un turno de pregunta y
respuesta real confirmado**, con tres fuentes documentales. Se expandieron las
fuentes y se abrió una en el visor (nodo de texto observado de 251 caracteres).
Se comprobó regreso al chat, menú/Back sin salir del chat, reapertura desde historial
y logout sin aviso de revocación incierta. El borrador largo de prueba no se envió
y se limpió. Las conversaciones de ensayo se conservan; no se borró otra información.

En este teléfono, el envío medido `[780,915][930,1065]` queda íntegro por encima
del IME observado en y=1143, con anchura de 150 px y altura de 150 px (50 dp).
Es geometría **de este ensayo**, no una constante del producto. Se verificó una
pregunta multilínea y un borrador largo. Los handlers siguen sin reenvío automático.
No se inyectaron 409/timeout en el teléfono: esas ramas se comprobaron en WEB-02.

Se añadieron temporalmente los reverse USB 3004/8084, que no existían al inicio;
se retiraron al terminar, igual que el volcado UI propio. La app quedó sin sesión.
API, proxy, Metro y otros servicios existentes no se reiniciaron ni reconfiguraron.
Informe y capturas: `.expo/uix04a/android/report.json` y `android/index.html`.

El juez independiente revisó la segunda iteración web y seis capturas físicas:
cerró el recorte de sugerencias y no observó bloqueadores ni problemas visuales
mayores pendientes. Confirmó el búho completo, CTA, login compacto, compositor
multilínea acotado y visor legible. Solo inspeccionó imágenes/reportes: no operó
el dispositivo ni acredita rendimiento o lectores de pantalla.

## Evidencia local

Carpeta ignorada: `mobile/.expo/uix04a/`.

- `reference/`, `reference-render/`: HTML/recursos y 12 capturas offline.
- `baseline-source/`, `baseline-source-manifest.json`: base de código conservada.
- `before/`: 57 capturas nuevas del UIX-03 local, 1440/820/390/360 × 900.
- `after/`: capturas y reporte final; estados de agenda adicionales.
- `iterations/01`, `iterations/02`: iteraciones previas, sin alterar baseline.
- `comparison-index.html`, `comparison-manifest.json`: antes/después de la app.
- `mockup-comparison.html`, `mockup-comparison-manifest.json`: referencia/app.
- `extra-states.html`: agenda y límites de caracteres adicionales.
- `android/index.html`, `android/report.json`: recorrido físico y límites.
- `contrast.json`, `android-export/`: cálculos de color y paquete Hermes.

Las capturas visuales de la app usan API 100 % interceptada con fixtures
sintéticos. No consultan backend ni modifican datasets. El recorrido WEB-02
auténtico se registra por separado con cuentas ficticias existentes y evidencia
privada, sin credenciales en el repositorio.

## Archivos de esta fase

- `mobile/src/app/login.tsx`, `home.tsx`, `chat.tsx`.
- `mobile/src/components/banu-core.tsx`, `home-agenda.tsx` (nuevos).
- `mobile/src/components/app-button.tsx`, `chat-sources.tsx`, `web-frame.web.tsx`.
- `mobile/src/ui/tokens.ts`, `web-appearance.ts`.
- `mobile/scripts/check-uix01.mjs`, `compare-uix01.mjs`,
  `unified-web02-journey.mts`, `capture-uix04a-reference.mjs` (nuevo).
- `mobile/README.md`, este checkpoint.

animated.tsx, secondary-ui.tsx, BanuAvatar/PNG/test y checkpoint UIX-03 tenían
cambios de la fase anterior: no se reimplementan ni se presentan como nuevos de
UIX-04A. No se editaron archivos de backend o contratos para pasar pruebas.

## Pendientes y siguiente alcance propuesto

La prueba física acredita el recorrido descrito en development build, no
rendimiento de release, FPS, memoria, TalkBack ni todas las preferencias de
movimiento reducido del sistema nativo. Quedan revisión humana del diseño y
auditoría con lectores de pantalla; no se declara aval institucional o WCAG completo.
Los bounds UIAutomator inferiores aparecen recortados respecto a las imágenes:
el tap y la captura no acreditan toda la geometría accesible de la barra inferior.
No se presenta un baseline físico UIX-03: el teléfono no estaba disponible al
capturarlo. Las comparaciones nativas internas son iteraciones de UIX-04A.
Menores observados: Cerrar sesión puede requerir scroll en sidebar
tablet; Abrir documento puede ocupar dos líneas en la columna estrecha de fuentes.

Propuesta UIX-04B, **sin implementar**: tras revisión humana, adoptar esta identidad
en historial/progreso/calendario/noticias/OE2/visor, conservando sus datos, filtros,
procedencia y recuperación. La auditoría accesible y de rendimiento pendiente
debe registrarse aparte de este smoke físico. No autoriza ADMIN-01 ni cambios de backend.
