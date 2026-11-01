# CHECKPOINT WEB-03 — BanuChat

Fecha: 2026-11-01 (America/Bogota). Base inspeccionada: `26d71b8`, árbol limpio.
Estado final: **BANUCHAT_WEB_03_VISUAL_VALIDATED**.
Sin commit ni push. WEB-01 y WEB-02 se reutilizan; no se inicia otra macrotarea.

## Alcance visual

- `mobile/src/ui/web-appearance.ts`: estilos exclusivos de la envoltura web,
  con la paleta existente, fuente del sistema y sin dependencias nuevas.
- `mobile/src/components/web-frame.web.tsx`: iconos existentes, sección activa
  con indicador, borde del menú compacto y foco al cerrar un menú con Escape.
  Escape con los menús cerrados conserva el foco del usuario.
- Home, chat, historial, progreso, calendario, anuncios, OE2, Banu al día,
  `screen-header`, `chat-sources` y `oe2-change-card`: anclas `testID` de estilo.
  Los estilos compartidos y los manejadores funcionales permanecen intactos.
- Evaluador existente y `unified-web03-visual.mts`: fixtures sintéticos para
  capturas, medidas y verificaciones; WEB-02 añade la comprobación del foco visible.
- `mobile/README.md`, `docs/operations/web-local.md` y este checkpoint.

## Hallazgos y cambios observables

| Antes observado en Edge | Resultado revisado |
| --- | --- |
| Home: cinco accesos en una lista estrecha; el último quedaba fuera del primer viewport de escritorio. Marca repetida dentro de Home. | Rejilla de dos columnas desde 760 px, cinco accesos visibles a 1366 × 900; saludo y aviso primero, sin repetir la cabecera interior. |
| Títulos de 22 px y barras de filtros desplazadas respecto al contenido. | Títulos de 28 px en escritorio, 24 en móvil, cabeceras y controles con límites y márgenes comunes. |
| Progreso: el último curso ocupaba toda la fila por crecimiento flexible. | Dos columnas uniformes en escritorio; aserción de ancho por tarjeta de 440–480 px a 1366. Se corrigió el ancho heredado descubierto durante la revisión de la primera iteración. |
| Historial: columna de 560 px bajo cabecera más ancha; acción nueva a todo el ancho. | Contenido limitado a 960 px, dos columnas desde 760 y acción compacta con espacio interior. |
| Chat: respuesta sobre el mismo fondo y compositor redondeado con interlineado de 22 px. | Respuesta delimitada por tarjeta blanca, usuario en color de identidad, columna máxima de 744 px y compositor con interlineado de 24 px y campo de al menos 44 px. |
| Anuncios: lista única en escritorio. | Dos columnas acotadas, sin expandir párrafos a todo el viewport. |
| Advertencias dispersas en texto; metadatos OE2 pequeños. | Avisos conservados en superficie de advertencia y metadatos/fuentes de 13 px con corte de identificadores largos. Antes/Ahora usa dos columnas solo con espacio suficiente. |

La familia tipográfica base ya era común según las mediciones; no se acredita un
defecto de familias distintas. Se unificó explícitamente su herencia y se ajustó
la jerarquía. Tampoco había desbordamiento raíz ni controles medidos menores de
44 px en la base: esos resultados se **preservan**, no se presentan como defectos
corregidos. El calendario ya resolvía bien la agrupación por fecha; se conserva.

## Evidencia real y custodia

Edge instalado **150.0.4078.48**, headless, CDP loopback y perfiles descartables.
41 capturas por etapa: ocho pantallas principales, fuentes del chat, menús
compactos, bienvenida, texto largo/abstención, generación y error. Anchos 1366,
768 y 390; alto 900; escala 1. Las pantallas auxiliares usan REST local real.
Chat e historial muestran texto explícitamente sintético, interceptado solo en
la pestaña. Un POST controlado por etapa, **cero mensajes escritos en backend**.
No se capturan credenciales, conversaciones existentes ni documentos CCD.

Raíz privada fuera del repositorio y de OneDrive:
`%LOCALAPPDATA%/BanuChat/web-03/`.

- Base completa: `c4ba2447-eb9a-4929-a6d7-0c5756504b12`,
  `WEB_03_BASELINE_CAPTURED`.
- Después final: `a2241ce0-8e4a-4bf7-bcbe-d5f8b5e91edb`,
  `BANUCHAT_WEB_03_VISUAL_VALIDATED`.
- Dentro del después: `comparison-index.html`, 41 PNG en `comparisons/` y
  `comparison-manifest.json` con SHA-256 de originales y comparaciones.
- Cada recorrido guarda `report.json` y `visual-measurements.json`. En el después:
  41/41 sin desbordamiento raíz, controles visibles ≥44 px y una familia computada.
  El chat nuevo propio vacío fue eliminado; sesión revocada y perfil retirado.

Se mantienen informes de iteraciones: la primera base `b6b895c6-b167-494e-ade5-6e1659b2929c`
falló porque el evaluador esperaba «la respuesta» en vez de «una respuesta».
Se corrigió el evaluador y se repitió antes de modificar la app. La primera
iteración posterior `1b799531-4f55-41ee-9513-b099d393c9ba` superó sus aserciones,
pero la inspección visual detectó las tarjetas estrechas de Progreso; se corrigió
y añadió la aserción correspondiente. Esas tres aperturas iniciales dejan un
chat vacío de prueba cada una; no se borraron chats preexistentes para retirarlos.

Los ratios calculados para parejas opacas de los tokens son: tinta/superficie
18,54:1, secundario/fondo 7,47:1, blanco/acento 6,21:1,
secundario/advertencia 7,56:1, atenuado/superficie 5,33:1 y
acento fuerte/acento suave 7,10:1. Es una comprobación limitada de paleta,
no una auditoría de todos los píxeles, estados o criterios WCAG.

## Validación

Realmente ejecutado desde `mobile`:

- `npm run typecheck`: **PASS**.
- `npm test`: **63/63 PASS**, sin fallos ni saltados. Incluye caché de borradores,
  operaciones pendientes, limpieza de sesión, transportes y adaptadores nativos.
- Typecheck estricto explícito de los evaluadores `.mts`: **PASS**, también
  después de añadir la aserción de foco visible y del ancho de las tarjetas.
- `npm run web:test`: **1/1 PASS** en el host. El intento inicial en sandbox
  recibió `EACCES` al conectar su puerto efímero; se repitió con acceso loopback,
  sin cambiar el proxy ni el test para eludir el fallo.
- `npm run web:export`: **PASS**, 15 rutas. Bundle final
  `entry-a5df9e89a567cffa6d5971448cb0ca28.js`.
- `--web03-before` y `--web03-after`: **PASS**, 41 capturas por etapa. Inspección
  visual de escritorio/tablet/móvil, mensajes largos, fuentes, bienvenida,
  abstención, generación y error; Escape devuelve el foco al menú compacto.
- `--web02 --skip-login-controls`: **PASS**, recorrido funcional completo sobre
  la exportación final. Se omiten únicamente credencial inválida y fallo de login
  controlado ya acreditados en WEB-02; los logins reales siguen operando.
  Comprueba filtros/búsquedas/fechas y sus estados vacíos/carga/error, OE2 y
  Antes/Ahora, navegación en tres anchos, Enter/Tab/Escape y foco visible de 3 px.
  Borrador conservado al navegar/redimensionar, respuesta pendiente recuperada
  al salir/volver, fuentes y visor real, reapertura desde historial, 409 y fallo
  de red sin reenvío, comprobación manual del estado, cancelar/confirmar borrado,
  aislamiento entre dos cuentas, logout, expiración y recarga sin persistencia.
  Informe privado: `%LOCALAPPDATA%/BanuChat/web-02/d3d66e9a-e02c-4120-a483-b9cdcdac654f/report.json`,
  estado `BANUCHAT_WEB_02_BROWSER_VALIDATED`; dos sesiones revocadas, dos ya
  inactivas, ninguna sin confirmar; perfil retirado. No captura chat ni visor.
- Exportación Android Hermes: **PASS**, 1671 módulos, bundle
  `entry-c1b0bb09c364bf8e3c913db24f1a4789.hbc`. Se conserva Expo SDK 57,
  `ccd_authenticated`, API loopback 3004/v2 y canal `adb_reverse`, solo en el
  proceso de exportación, sin tocar `.env.local`. TEMP/TMP:
  `.expo/web03-hermes-temp`; salida ignorada `.expo/web03-android`.
  Comprobación binaria: contiene las anclas compartidas, excluye `banu-web-frame`
  y la hoja de rejilla web. Los dos ajustes finales afectaron solo CSS web;
  no se repite la exportación nativa porque su grafo no puede verse afectado.
- `git diff --check`: **PASS**; alcance revisado, sin archivos ajenos a WEB-03.

Se reutilizó la API existente **PID 22984 / 127.0.0.1:3004** sin reiniciarla.
El proxy creado para esta validación **PID 39632 / 127.0.0.1:8085** se cerró,
tras comprobar su identidad; la API sigue escuchando con el mismo PID.
Para abrir la versión resultante, desde `mobile`: `npm run web:serve` y
`http://127.0.0.1:8085/login`; la exportación final ya está disponible localmente.

El recorrido funcional conserva su conversación nueva con mensajes de ensayo,
como WEB-02, y elimina solo su otro chat nuevo vacío al probar la confirmación.
No elimina conversaciones preexistentes. No se ejecuta evaluación semántica
adicional, RAGAS, Docker, Gradle ni prueba física Android.

## Preservación y límites

No se modifican backend, contratos REST, RAG, corpus CCD/sintético, PostgreSQL,
Agent/MCP, N8N, releases OE2 ni autenticación/almacenamiento de tokens. Solo las
peticiones funcionales de autenticación/chat necesarias para la validación.
Los borradores y envíos pendientes siguen usando la caché WEB-02 sin cambios.
En Android las únicas diferencias compartidas son identificadores de regiones;
la hoja web y la navegación web no entran en su bundle.

No se acredita WCAG completo, lectores de pantalla, Safari/Firefox, teclado
virtual/dispositivo móvil físico, prueba humana con estudiantes ni ejecución
física Android. No hay biblioteca visual nueva, rediseño nativo, administración,
web push, despliegue remoto, APK o proyectos nativos nuevos.
