# CHECKPOINT UIX-03 — BanuChat

Fecha: 2026-11-01 (America/Bogota). Rama `main`; HEAD inicial
`9ffa237089f7f2be0c9d4361178992cd03e1c01f`, árbol limpio.
Estado: **UIX_03_IMPLEMENTED_WEB_VALIDATED_ANDROID_EXPORTED**.
Sin commit ni push. Se detiene UIX-03; no se inicia ADMIN-01 ni otra macrotarea.

## Base y preservación

Se leyeron AGENTS.md y los checkpoints UIX-01/UIX-02 y se inspeccionaron los
componentes directamente afectados. Se mantienen tokens, primitivas, tipografía
del sistema, layouts diferenciados, rutas y flujos de UIX-01/02. Se reutilizan las
skills locales ya revisadas, sin instalar ni actualizar ninguna. design-ux pide
una revisión independiente: el subagente auditó capturas y reportes, sin implementar.

Sin dependencias nuevas, upgrade de SDK/RN, generación android/ios ni instalación
de APK. Backend, auth, REST, SQL, RAG, Agent/MCP, N8N y corpus no se modifican. Los
cambios de login son exclusivamente visuales; se mantienen sus handlers, controles
y ramas exclusivamente web que evitan montar contenido oculto en Android.

## Fidelidad de Banu y recursos

Se incorporaron copias **byte a byte** de los tres recursos aportados por el
propietario. Se inspeccionaron los originales: PNG RGBA de **1254 × 1254**, con
esquinas transparentes reales. Los archivos de Downloads no se modificaron.

| Copia en `mobile/assets/images/banu/` | Original aportado | SHA-256 |
| --- | --- | --- |
| banu-color.png | Banuchat.png | `07bcc4dd2d7e49b1437f0f3b6defb830299d435a9b71930d931f2bde90134787` |
| banu-white.png | White owl logo with transparent background-4.png | `91fbb2e4b1d6bc3a2696edf1b64b8885c5bddb796b42a22ccfc055a002ef770b` |
| banu-black.png | Black owl logo with transparent background-3.png | `6d7d5d5aa6123e49e8d4b28dba3f8a7634c3c925421f3a6d9293db836dc51e43` |

`provenance.json` registra nombres, dimensiones y hashes. Una comprobación contra
los originales confirmó igualdad de bytes para los tres. El test nuevo verifica
hashes, dimensiones y formato PNG RGBA para detectar alteraciones o pérdida de
formato. No se generaron variantes por IA ni se vectorizó, simplificó o retocó
el dibujo, las orejas, alas, patas, bufanda o texto del logo.

`BanuAvatar` usa **expo-image ya instalado**, fuente local, contentFit=contain,
sin crop ni tint y sin transición interna. Permite downscaling de visualización,
sin alterar el archivo original. Las imágenes decorativas junto a un nombre o
título no duplican la lectura accesible; el componente admite label si la imagen
debe aportar significado independiente. El nombre Banu/BanuChat sigue en texto.

## Decisiones visuales y de movimiento

- **Marca:** el búho sustituye al rombo en la entrada `BrandMark` existente,
  también donde se reutiliza en bienvenida y onboarding. La versión a color es
  la presencia principal; la blanca aparece sobre índigo en login de escritorio
  y la negra sobre claro en la navegación web. Se conserva el azul/índigo de la UI;
  los colores cálidos y la bufanda proceden del dibujo original.
- **Login:** mascota a color en el panel de presentación de escritorio, marca
  compacta a color en la columna móvil/nativa, inputs con relieve interior leve.
  El formulario y su orden siguen disponibles, sin marketing oculto montado en
  Android ni cambios de sesión/validación.
- **Home:** Banu de 104 px acompaña el acceso principal. El CTA continúa visible
  en el primer viewport móvil. Accesos secundarios con relieve doble discreto;
  se mantiene la rejilla web y lista táctil nativa. El aumento de altura móvil
  frente a la base es una consecuencia deliberada de dar presencia a la mascota.
- **Chat:** búho a color de 48 px en encabezado, 40 px junto al autor de respuesta
  y 88 px en bienvenida. Fuentes, mensajes, abstención, límite de caracteres y
  recuperación conservados. La espera identifica a Banu y usa puntos discretos,
  solo mientras existe envío pendiente; no se vuelve a introducir estado online.
- **Vacío/ayuda:** ScreenState muestra a Banu en vacío; las pantallas de error
  siguen priorizando el mensaje y recuperación, sin decoración que trivialice
  el error. Las respuestas y el visor documental mantienen lectura plana.
- **Neumorfismo:** dos tokens `shadows.raised` y `shadows.inset` en el archivo
  existente. Sombras estáticas en superficies claras de controles, chips,
  accesos e inputs. Bordes, texto, selección y foco no dependen de la sombra.
  El avatar usa sombra suave: la primera revisión detectó un halo blanco excesivo
  sobre índigo y se retiró, sin modificar el PNG.
- **Animación:** se reutilizan entradas de opacidad de 180 ms de UIX-01, sin
  alargar delays ni mover texto durante la lectura. `usePressFeedback` consolida
  la escala breve de PressableScale y añade respuesta al contenido de AppButton:
  120 ms, ease-out, transform en Reanimated, sin render React por frame. Deshabilitar
  o pasar a loading restablece la escala. Puntos de typing combinan opacidad y
  escala mínima; se cancelan al desmontarse, reducir movimiento o pasar a segundo
  plano. No se anima el dibujo por partes ni hay bucles de mascota ociosos.
- **Web:** hover de fondo/borde de 120 ms en controles breves y secundarios;
  foco de 3 px conservado. La regla reduced-motion elimina transiciones y
  animaciones CSS; las animaciones compartidas mantienen la preferencia suscrita
  y ReduceMotion.System. No se animan sombras, alturas ni anchos.

## Pruebas realmente ejecutadas

Desde `mobile`, salvo la revisión Git:

| Comprobación | Resultado |
| --- | --- |
| `npm test` | **65/65 PASS**, cero fallos/saltados: 64 anteriores y test de fidelidad de recursos. |
| `npm run typecheck` | PASS. |
| `npm run lint -- --no-cache` | PASS, cero errores/advertencias. |
| `npm run web:test` | **1/1 PASS**, prueba del proxy existente en loopback. |
| `npm run web:export` | PASS, 15 rutas; bundle final `entry-032115406d2a4a24a8f3dab1d0fc7b02.js`. |
| `check-uix01.mjs before --brand` | PASS, **44 capturas nuevas** sobre HEAD inicial. Bundle base `entry-0407dc22d99ed2f25d23a17bef58a179.js`, igual a UIX-02. No se reutilizan PNG previos como evidencia nueva. |
| `check-uix01.mjs after --brand` | PASS, **44 capturas finales** a 1366/768/390 × 900, mismos fixtures. Sin overflow raíz/de burbujas, controles medidos ≥44 px; primitivas existentes ≥48. |
| `compare-uix01.mjs --brand` | PASS, 44 pares y manifiesto SHA-256. |
| `check-unified-web-browser.mts --web02 --skip-login-controls` | **BANUCHAT_WEB_02_BROWSER_VALIDATED** contra la API real. |
| Export Android Hermes con Expo instalado | PASS, **1688 módulos**, 30 assets, bundle `entry-4fc93504790613fdf96584b6e1e0020c.hbc`. Incluye los tres PNG y excluye el wrapper web. |
| `node --check` de los scripts JS modificados | PASS. |
| Igualdad binaria original/copia | PASS para los tres recursos. |
| `git diff --check` y alcance | PASS al cierre; solo Mobile y checkpoint UIX-03. |

La exportación Android usa `.expo/uix03-android`, TEMP/TMP en
`.expo/uix03-hermes-temp`, modo `ccd_authenticated` y API v2 loopback 3004 con
canal `adb_reverse` únicamente en el proceso. No toca `.env.local` ni requiere
Gradle. Esto acredita compilación/empaquetado, **no** UI ni rendimiento físico.

El evaluador visual intercepta **toda** la API con datos sintéticos: no lee cuentas,
no consulta backend y no escribe mensajes reales. Comprueba borrador al navegar/
redimensionar, sugerencia sin envío, fuentes/visor sintético, contenido largo,
abstención, bienvenida, generación, error con un único POST interceptado, menú,
Escape/foco, movimiento reducido y bloqueo tras logout. Comprueba además carga
de las imágenes de Banu visibles y object-fit=contain. Ese check incluye imágenes
decorativas aria-hidden, sin cambiar la semántica accesible del producto.

La primera iteración posterior agotó la espera al abrir una ruta protegida tras
logout mientras se estaba regenerando la exportación. No se cambió auth, router
ni esa aserción para resolverlo. Se terminó la exportación y se repitió con sus
archivos estables: el recorrido completo y WEB-02 real pasaron. No se acredita
el primer intento como PASS ni se atribuye una causa interna no demostrada.

WEB-02 real conserva filtros/fechas civiles/OE2/Antes-Ahora, navegación responsive,
Enter/Tab/Escape y foco visible, borrador y operación pendiente al salir/volver,
respuesta/documento reales, fuentes, historial, aislamiento de cuentas, confirmación
de borrado de chat propio nuevo, 409 y red incierta sin reenvío, logout, expiración
y recarga sin persistencia. Se omiten solo los controles negativos de login ya
acreditados; el login real y las guardas siguen activos.

Informe privado:
`%LOCALAPPDATA%/BanuChat/web-02/b8517da6-1f5c-4952-815d-8b7fcfdc7bd4/report.json`.
Limpieza: dos sesiones revocadas, dos ya inactivas, ninguna sin confirmar y perfil
descartable retirado. Como el recorrido previo, conserva su conversación propia
de ensayo y elimina solo su otro chat propio nuevo; no borra chats preexistentes.
Se reutilizaron proxy/API y servicios existentes, sin reiniciarlos ni reconfigurarlos.

## Comparaciones y revisión independiente

Evidencia regenerable ignorada: `mobile/.expo/uix03/`.

- `comparison-index.html`: galería de **44 pares** en escritorio, tablet y móvil.
- `comparison-manifest.json`: SHA-256 de ambos originales.
- `before/` y `after/`: PNG y report.json con medidas, checks, errores y conteo de POST.
- Login, Home, chat, fuentes, texto largo/abstención, bienvenida, generación/error,
  menú, progreso/filtros, vacíos y errores de auxiliares/OE2 y movimiento reducido.

El juez independiente verificó fidelidad/proporciones del búho, ausencia de recorte,
uso de variantes por fondo, eliminación del halo, jerarquía del CTA móvil,
conservación de superficies planas, bordes/foco/selección y legibilidad de avisos.
No observó bloqueadores ni problemas visuales mayores en las capturas finales.
Se acepta como detalle menor la mayor altura de la tarjeta principal móvil.

## Límites

No se ejecutó una nueva prueba física Android de UIX-03; la prueba física UIX-02
no se presenta como validación de esta identidad nueva. Pendientes: fluidez y
coste gráfico en dispositivo moderado, teclado/mascota real, preferencia reducida
del sistema, TalkBack y auditoría WCAG completa. El check de movimiento reducido
web cubre el estado observado sin animaciones activas; no demuestra cada gesto
ni todos los estados del sistema operativo. No se afirma 60 fps ni consumo medido.

Los originales suman aproximadamente 2,1 MB como archivos, sin optimizaciones
destructivas. Se usan recursos locales con downscaling/caché de expo-image y sin
peticiones a servidores de imágenes; no se acredita medición de memoria decodificada.
No cambia el icono instalado de Android ni se produce una nueva APK.

## Archivos modificados

- `mobile/assets/images/banu/banu-color.png`, `banu-white.png`, `banu-black.png`
  y `provenance.json` (nuevos).
- `mobile/src/components/banu-avatar.tsx` (nuevo), `app-button.tsx`,
  `secondary-ui.tsx`, `web-frame.web.tsx`.
- `mobile/src/ui/tokens.ts`, `animated.tsx`, `web-appearance.ts`.
- `mobile/src/app/login.tsx`, `home.tsx`, `chat.tsx`.
- `mobile/test/banu-assets.test.ts` (nuevo).
- `mobile/scripts/check-uix01.mjs`, `compare-uix01.mjs` (bandera --brand y salida separada).
- `mobile/README.md` y este checkpoint.

No se tocan skills, contratos, datos, infraestructura o servicios fuera de alcance.
