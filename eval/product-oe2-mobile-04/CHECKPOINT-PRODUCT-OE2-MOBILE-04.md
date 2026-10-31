# BanuChat — PRODUCT-OE2-MOBILE-04 — checkpoint único

**30 de octubre de 2026, Bogotá.** Estado acreditado:
**`BANUCHAT_OE2_MOBILE_INTEGRATION_ANDROID_VALIDATED`**.
Base: `d6e3cfb839e7b07f91dc2ebe3a79ffb6ca2767e4`; cambios sin commit ni push.
[Evidencia depurada](results/2026-10-30-summary.json).

## Funcionalidad entregada

Home autenticada incorpora **Publicaciones OE2**, con programación de grupos,
convocatorias y novedades ficticias. Está separada de documentos CCD, catálogo,
noticias habituales y chat. Presenta release publicada, identidad y versión de
origen, fechas pertinentes y estados. La programación conserva fechas civiles
03/11/2026–28/11/2026, sin desplazamiento horario; no crea cursos del catálogo,
cupos, docentes, inscripciones ni reglas de elegibilidad. Las novedades publicadas
sin vencimiento no aparecen como convocatorias abiertas.

La ampliación autorizada del contrato REST v2 es **5.1.0**, con dos GET:

- `/api/v2/demo/oe2/programming`: `query`, `mode`, `limit`.
- `/api/v2/demo/oe2/announcements`: `query`, `type=calls|news`, `temporal_status`, `limit`.

Mantienen Bearer y autorización de recursos existentes; filtros únicos validados,
cuerpo vacío, máximo 50 registros, no-store, métodos ajenos 405 y errores saneados.
Solo se registran en Unified. Responden con `fictional_auxiliary`, release, fecha de
publicación y origen verificable por identidad/versión/hashes, sin archivos internos,
paths, secretos ni snapshots crudos. Contrato completo:
[REST v2](../../../backend/api/api-contract-v2.md).

## Fuente opcional e integridad

Se comprobó el contenedor y volumen existentes, base `postgres`, marker de
aislamiento, rol lector y current ready. Esa topología solo acepta conexiones en
loopback del host Linux de Docker. El adaptador usa **Docker/psql local con consulta
fija**, rol `banuchat_oe2_pipeline_reader` y transacción REPEATABLE READ READ ONLY.
No abre otro puerto, crea puente, copia datos ni cambia credenciales/grants.

El backend carga únicamente la configuración privada opcional
`infra/local/unified/oe2-reader.json`. No hay credenciales ni conexión PostgreSQL
en Expo. Contenedor/volumen, marker, rol, hash del candidato y estado ready se
verifican; las filas SQL se contrastan con el candidato aprobado. El puntero y las
filas se leen en un snapshot consistente. La conexión Unified se libera antes de
esperar a esta dependencia opcional; una fuente ausente produce 503 en estas rutas
y no impide el arranque habitual.

Antes/después se comprobaron las **seis releases, 18 snapshots y todas las filas
de origen/proyección**, sin diferencias. Current OE2:
`8ed084d9-2d5e-4f90-8011-99912278b27c`. No hubo escrituras de datos OE2 ni nuevas
publicaciones, adquisición o scheduler. Tampoco se importó OE2 en Unified/CCD.
Las 20 tablas protegidas legibles en Unified conservaron sus huellas. La cobertura
excluye sesiones/historial de pruebas y acceso directo a chunks; no se elevaron
permisos. Login y los dos turnos de chat de demostración sí crearon las sesiones
e historiales propios autorizados.

## Ejecución REST real

La API habitual se recargó por su entrypoint normal para aplicar el código. Las
pruebas usaron cuentas ficticias existentes, no un servidor simulado.

| Comprobación | Resultado |
| --- | --- |
| Lectura de programación | 200; dos grupos, códigos/periodos/modalidades/fechas coincidentes con SQL |
| Convocatorias | 200; dos registros; cerradas según las fechas originales |
| Novedades | 200; dos registros; published y valid_until null |
| Filtros, vacío y límite | Datos correctos; vacío conserva release; limit=1 respetado |
| Anónimo / métodos / parámetros inválidos | 401 / 405 / 400 |
| Procedencia y lectura repetida | Mismos datos y hash de publicación antes/después |
| Fuente fixture detenida de manera controlada | Ambas rutas 503 saneado; progreso habitual 200 |
| Chat CCD durante esa caída | 201, respuesta con evidencia documental y dos mensajes persistidos |
| Restauración y reintento | Misma publicación recuperada, sin ejecutar pipeline |

La ejecución positiva final aprobó cuatro grupos de comprobaciones (135, 431,
840 y 1676 ms). La fase de indisponibilidad aprobó tres (153, 411 y 10760 ms),
incluido el chat CCD real. Son tiempos de esas comprobaciones, no benchmarks.

## Ejecución Android física

ADB Windows encontró exactamente un teléfono autorizado: **YAL-L21, Android 10**,
con development build existente. Se reutilizaron Expo SDK 57, Metro localhost 8084
y USB reverse 3004/8084. No se instaló APK ni se usó Expo Go 58.

Se acreditaron en la app, con 22 capturas y trazas privadas:

- Login, Home y entrada a Publicaciones OE2.
- Programación con fechas civiles, código, periodo, modalidad, estado y origen.
- Convocatorias cerradas y novedades publicadas sin vencimiento inventado.
- Búsqueda, estado vacío, limpieza de filtros y navegación.
- Cargando; fuente no disponible; botón Reintentar y recuperación real.
- Regreso a Home y chat multifuente habitual, separado de OE2.
- Expansión de cuatro citas, Historial y reapertura de la misma respuesta/fuentes.
- Logout, regreso al login y regresión de pulsaciones repetidas sobre controles
  seleccionados, sin carga permanente.

El mensaje físico, con tildes corregidas por el teclado Android, quedó persistido
y se contrastó mediante lectura autenticada. N8N y Agent comparten la operación
`73768beb-6517-46bc-8045-e466b8cd3831`; ejecutaron
`get_profile_progress` → `get_announcements`, dos llamadas, terminal `answered`,
3223 ms. Las cuatro citas usan la release auxiliar habitual
`af157a78-4c51-49c0-b8cc-509257d89f1e`, **no** la release OE2. El pin documental
permanece `10af4ffd-effb-41fc-bbfe-4dc48cb3398f` (CCD 1.4.0).
El workflow conversacional conserva definición, versiones y configuración; N8N
no se reinició. Los clones de scheduler OE2 siguen inactivos.

El estado de expiración 401, invalidación y aviso en login se comprobó con tests;
no se forzó vencimiento temporal en el teléfono. La desconexión de red se cubrió
en el adaptador, mientras la caída de la fuente y su reintento sí fueron físicos.

## Pruebas, correcciones y archivos

Pasaron `npm run typecheck` de API, `npm run typecheck:unified` y
`npm run typecheck` de Mobile. Pasaron **16 tests focales API** (REST/auth,
proyección y schemas) y **16 Mobile** (adaptador, fechas y sesión), además de REST
real, auditorías de lectura, recorrido físico y `git diff --check`. El preflight
final `--running --adb` terminó `DEPENDENCY_CHECKS_PASSED`.

Las pruebas detectaron y se corrigieron tres puntos de integración: lista móvil
de rutas que todavía rechazaba los GET nuevos; JSON de PostgreSQL distribuido en
varias líneas; selección repetida que podía dejar loading sin cambiar dependencias
del efecto. La regresión física cubrió los controles seleccionados. Se conserva
el primer smoke fallido del lector; no se declara PASS para ese intento. Una
aserción de auditoría se ajustó para admitir la autocorrección de tildes del teclado,
sin reenviar la pregunta. El aviso de sesión expirada persiste hasta login/logout
sin conservar tokens en el estado React.

Archivos nuevos/modificados:

- API: `src/application/oe2-demo.ts`, `src/operations/oe2-local-reader.ts`,
  `src/auth/resources.ts`, `src/authenticated-main.ts`, `src/authenticated-runtime.ts`,
  `src/http/api-v2-server.ts`, `test/oe2-demo.test.ts`,
  `test/auth-v2-contract.test.ts`, `scripts/evaluate-unified-oe2-mobile.mts`,
  `api-contract-v2.md`, `openapi-v2.yaml` y `README.md`.
- Mobile: `src/api/oe2-demo.ts`, `src/app/oe2.tsx`, `src/app/home.tsx`,
  `src/app/_layout.tsx`, `src/app/login.tsx`, `src/auth/auth-session.ts`,
  `test/oe2-demo.test.ts` y `README.md`.
- Procedimiento: `docs/operations/final-integrated-demonstration.md`.
- Evaluación: este checkpoint y `results/2026-10-30-summary.json`.

Las rutas API/Mobile anteriores llevan prefijos `backend/api/` y `mobile/`.
Configuración, logs, resultados crudos, historial, XML de UI y PNG permanecen en
`infra/local/product-oe2-mobile-04/`, ignorado por Git. El JSON público contiene
solo evidencia depurada y hashes de capturas, sin serial del teléfono o cuentas.

## Estado final y límites

API 3004, Unified PostgreSQL 55463, Ollama 11434, N8N 15679 y Metro 8084 quedan
en ejecución en loopback. Se inició el contenedor fixture existente y se deja
**en ejecución intencionalmente** para esta función opcional; conserva su volumen.
Se detuvo/restauró una vez durante la prueba de fallo. Los reverses USB quedan
disponibles para la demostración. El teléfono termina en login, con sesión cerrada.

No se cambiaron pipeline OE2, corpus/current CCD, modelos, schemas SQL, contratos
REST v1/MCP, Agent o workflow N8N. No se añadieron dependencias ni se repitieron
OE1, RAGAS, experimentos del agente o scheduler acelerado. La lectura Docker/psql
es específica del host preparado, con listas acotadas y sin paginación. No hay
fuente institucional, sincronización, aval CCD, ReAct LLM productivo, SUS o despliegue
universitario. El incremento termina aquí.
