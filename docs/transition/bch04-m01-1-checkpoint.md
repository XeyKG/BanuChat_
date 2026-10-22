# CHECKPOINT BANUCHAT — BCH-04/M01.1

Fecha: 22 de octubre de 2026, America/Bogota. Base comprobada: `93b173767cf51fc7fa71c53825c1371a652cea34`; árbol limpio al inicio, antes de añadir el paquete MCP. Continúa el alcance integral OE1–OE6. La autorización M01.1 permite adaptar servicios de lectura y añadir SELECT parametrizados; no modifica el contrato MCP `2.0.0-draft`.

## 1. Estado real y límite de aceptación

**Servidor MCP sintético implementado y ejecutado con cliente SDK y procesos stdio reales.** Las seis herramientas se invocan y sus entradas/salidas/errores se verifican contra el contrato. Las pruebas de datos usan SQL y embeddings dobles en memoria, separados del arranque productivo.

**La verificación real de tools contra PostgreSQL/Ollama sigue bloqueada por credenciales de lectura adecuadas.** La credencial local disponible se comprobó mediante una única consulta de metadatos: es superusuario, puede crear roles/bases, tiene bypass RLS y es propietaria del schema. No se usó para leer corpus, invocar tools ni ejecutar búsqueda vectorial. No se crearon roles, permisos, funciones, tablas o migraciones.

Por ello no se declara aceptación integral ni cumplimiento experimental completo de M01/OE3. Estado: **implementación y contrato/stdIO comprobados; integración real de lectura pendiente de requisito de seguridad**. No se atribuye un PASS a esa parte bloqueada ni se presenta MCP como un agente ReAct.

## 2. Archivos añadidos y modificados

### Añadidos

- `backend/api/src/application/mcp-synthetic-reads.ts`: superficies de lectura sintéticas para las seis tools; SELECT únicos con current y registros, recuperación mediante funciones aprobadas y errores internos de lectura.
- `backend/mcp-server/package.json`, `package-lock.json`, `tsconfig.json`: paquete independiente, versiones fijadas, scripts y TypeScript estricto.
- `backend/mcp-server/src/server.ts`: catálogo del contrato congelado, validación, dispatch, errores saneados y respuesta MCP.
- `backend/mcp-server/src/runtime.ts`: configuración explícita, guardas sintéticas y comprobación de privilegios efectivos de lectura.
- `backend/mcp-server/src/main.ts`: arranque local stdio moderno, cliente embedding local, pool y cierre saneado.
- `backend/mcp-server/test/fixtures.ts`, `stdio-fixture.ts`: SQL/embedding ficticios y arnés stdio de pruebas; no se usan como fallback del runtime.
- `backend/mcp-server/test/reads.test.ts`, `server.test.ts`: pruebas de lectura/seguridad y cliente-servidor.
- Este checkpoint: `docs/transition/bch04-m01-1-checkpoint.md`.

### Modificados

- `backend/api/src/application/calendar-events.ts`: exporta proyección, validación de entrada y normalización existentes.
- `backend/api/src/application/announcements.ts`: exporta proyección, validación temporal/defaults y normalización existentes.
- `backend/api/src/application/course-catalog.ts`: exporta proyección y normalizador existentes.
- `backend/api/src/application/document-lookup.ts`: exporta normalizador existente; mantiene coincidencia exacta y forma REST.
- `backend/api/src/application/document-query-retrieval.ts`: exporta validación de configuración embedding existente; mantiene el camino Document RAG.
- `backend/api/src/application/profile-progress.ts`: exporta proyecciones/validación y extrae normalización compartida; mantiene validación temprana de perfil antes de consultar cursos.
- `backend/mcp-server/README.md`: estado, arquitectura, arranque/configuración, pruebas y requisito de permisos.

No se modificaron paquetes/lockfiles API/RAG, Mobile, DDL, migraciones, funciones SQL, contratos REST/MCP, corpus, recetas ni código conversacional. Los auxiliares de ejecución/logs de esta tarea están en `tmp/`, ignorado por Git; no contienen credenciales publicadas.

## 3. Conciliación de las diferencias de M01

| Diferencia anterior | Implementación M01.1 | Preservación / evidencia |
| --- | --- | --- |
| Lookup documental exacto y sin `version_label` | Superficie nueva `findSyntheticDocuments`, filtro parcial literal por identidad/título y columna `v.version_label` real | El lookup exacto REST original permanece intacto. No se inventa null; una omisión de campo se rechaza |
| Cursos sin `query` | `getSyntheticCourses` combina nombre/descripción, estados y límite en SQL parametrizado | Filtro antes de LIMIT, sin comodines; defaults/forma del REST existente conservados |
| Retrieval API distinto del camino MCP | `searchSyntheticKnowledge` llama `current_retrieval_context()` y `search_chunks_cosine(...)` existentes, usando cliente/validador embedding compartidos | No se alteraron esas funciones ni Document RAG. Orden distancia→clave documental→ordinal conservado y verificado al adaptar resultados |
| Release cambia durante embedding | Se comprueba current/config en la sentencia de búsqueda; si no corresponden, se obtiene nuevo contexto y se genera otro embedding una sola vez | Segunda transición termina con `DEPENDENCY_UNAVAILABLE`; no se reutiliza el vector anterior ni se reintenta SQL arbitrariamente |
| Lecturas en sentencias separadas | Cada lectura estructurada usa CTE current y subconsulta de registros/agregados en una sentencia | Una instantánea READ COMMITTED; progreso incluye perfil y cursos en esa misma sentencia, sin confundir transacción con instantánea |
| Dominio en wrappers | Handlers delegan en aplicación; se comparten proyecciones, normalizadores e invariantes de calendario/anuncios/progreso | No hay SQL de dominio dentro del handler MCP ni cambios de schemas HTTP |

La búsqueda parcial usa `strpos(lower(...),lower(...))`, con collation explícita `C.utf8` y sin quitar acentos o normalizar texto. `%`, `_`, comillas o URLs dentro de la consulta son términos literales, no SQL, patrones ni recursos a consumir. El arranque exige UTF-8 y la collation ya existente en `pg_catalog`; no la crea si falta. **Su disponibilidad y la comparación de acentos en PostgreSQL real siguen sin acreditarse** al estar bloqueada la integración de lectura. Los tests comprueban parámetros/consulta y Unicode con dobles, no ejecución de collation real.

Para anuncios MCP se aplica conteo de puntos de código de Unicode a `query`, como en JSON Schema. Se reutilizan las reglas temporales/defaults del servicio sin modificar su validación de consulta REST existente. `reference_time` se captura una sola vez o se conserva si llega explícito.

## 4. SDK, integridad y transporte moderno

Se consultó el registro npm antes de instalar. La primera consulta dentro del sandbox falló por DNS `ENOTFOUND`; una consulta fuera del sandbox confirmó versión, motores, URL e integridad. Se descargaron los tarballs con `npm pack --ignore-scripts` y se calculó SHA-512 sobre sus bytes **antes** de la instalación:

| Paquete fijado | SRI verificado contra el registro |
| --- | --- |
| `@modelcontextprotocol/server@2.3.1` | `sha512-e59MfWuSssj6DoQ96JCTqdW1AXT5/XtnTl0WWd6MU1Ka434fFUGGosCLJbGNySDhHGvxQWoRWK137FXYFkYNWw==` |
| `@modelcontextprotocol/client@2.3.1` (solo pruebas) | `sha512-mIGZXpHsjnZ6lD+gD/WCMpR5k8yVQQ8nNFH1N0Srf7AvnwTUMYD6pvTY8ng2+He5FfV7YMZLmrjL7cLa/cc3dQ==` |

Instalación: `npm install --ignore-scripts --no-audit --no-fund`, versiones exactas y lockfile. Dependencias runtime adicionales: Ajv/Ajv-formats para schemas y `pg` para lectura; desarrollo: cliente MCP, TypeScript/tsx y tipos. No hay framework agéntico ni servicio externo nuevo. `npm ls --depth=0` confirmó la instalación. Node ejecutado: **v24.19.0**, compatible con Node >=20 declarado por el SDK y >=22 del paquete BanuChat.

El [SDK oficial](https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/protocol-versions.md) distingue la era moderna, sin handshake initialize. La implementación utiliza `serveStdio` con `legacy: 'reject'` y `Server` limitado a **`2026-07-28`**. Las pruebas observan `server/discover`, revisión/capacidades, era moderna y rechazo de revisión incompatible/initialize antiguo. El [transporte stdio oficial](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/basic/transports/stdio.mdx) no requiere puerto de escucha; stdout se reserva a JSON-RPC y stderr a logs mínimos.

Se usa el servidor de bajo nivel para mantener los schemas y reglas congeladas. Tool desconocida o argumentos inválidos por schema producen error JSON-RPC `-32602`; combinación semántica inválida produce `isError: true`, código `INVALID_ARGUMENT`. Fallos operacionales usan el schema propio y mensajes constantes, sin excepción/SQL/payload/ruta del host. No se adoptó silenciosamente la clasificación por defecto de los helpers de alto nivel.

En wire se emite `resultType: complete`; no se añade a los datos de las herramientas. El cliente SDK retira campos exclusivos del protocolo al presentar el resultado normalizado. Esto se comprobó separando pruebas de cliente y mensajes wire; no se simuló modernidad con un initialize legacy. Los [tipos oficiales](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/schema/2026-07-28/schema.ts) y [herramientas MCP](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2026-07-28/server/tools.mdx) son referencias de protocolo, sin editar el contrato BanuChat.

## 5. Arquitectura interna y herramientas ejecutables

```text
Cliente local -> stdio moderno -> catálogo congelado de seis tools
 -> validación Ajv input / contexto confiable de proceso
 -> aplicación: mcp-synthetic-reads + reglas compartidas
 -> SELECT parametrizado current/registros o funciones retrieval existentes
 -> cliente embedding local (solo búsqueda documental)
 -> validación output + invariantes/procedencia/límites
 -> structuredContent y JSON idéntico en un único bloque text
```

El arranque productivo requiere configuración `MCP_POSTGRES_*` explícita. No hereda automáticamente la credencial `POSTGRES_*` de propietario ni acepta URL remota. `MCP_PROFILE_KEY` procede del operador; los argumentos del modelo no lo pueden sustituir. No se interpreta `_meta` del modelo como selección de perfil.

| Orden | Herramienta | Ejecución comprobada por stdio | Datos reales |
| --- | --- | --- | --- |
| 1 | `search_knowledge` | Sí: contexto, embedding doble, función de búsqueda doble, hash UTF-8/locator y salida de evidencia | Pendiente de rol de lectura; no se invocó Ollama real |
| 2 | `find_documents` | Sí: metadata, `version_label`, guías `full_document` sin contenido/embedding | Pendiente PostgreSQL |
| 3 | `get_courses` | Sí: filtro/estado/límite y normalización | Pendiente PostgreSQL |
| 4 | `get_calendar_events` | Sí: fechas civiles Bogotá, validación y salida | Pendiente PostgreSQL |
| 5 | `get_announcements` | Sí: referencia temporal, estado y salida | Pendiente PostgreSQL |
| 6 | `get_profile_progress` | Sí: perfil confiable, cursos/fechas/porcentajes; ausencia de contexto diferenciada | Pendiente PostgreSQL |

Los resultados exitosos se validan contra `outputSchema`, límite efectivo e invariantes adicionales. `search_knowledge` calcula SHA-256 del contenido UTF-8 exacto, mantiene el localizador del chunk como localizador de fuente, orden/rank y alcance de páginas. Las salidas fallidas omiten `structuredContent`; conservan UUID de correlación y `retryable` según código. Búsqueda sin resultados conserva release y devuelve arrays vacíos, no hechos inventados.

`full_document` se descubre como metadata; no se fragmenta/vectoriza ni se descarga por MCP. No hay handlers de escritura, selección histórica, perfil arbitrario, conexión CCD/Sheets, publicación o persistencia de conversaciones. MCP no está conectado a REST/chat ni realiza selección autónoma de tools.

## 6. Pruebas realmente ejecutadas

| Ejecución | Resultado | Alcance y límites |
| --- | --- | --- |
| `backend/mcp-server`: `npm run typecheck` | Código 0 | TypeScript estricto, incluye superficies compartidas y tests |
| `backend/mcp-server`: `npm test` | **24/24 aprobadas**, cero fallos/omitidas | Procesos cliente-servidor reales; SQL/embeddings dobles |
| Arranque productivo sin credenciales explícitas | Código 1 esperado, stdout vacío y stderr exactamente `mcp_startup_rejected` | No se conecta a DB; confirma rechazo cerrado y canal de errores |
| `backend/api`: `npm run typecheck`, `npm run build` | Ambos código 0 desde el componente | Tipos/build del API y nuevos servicios; dist ignorado |
| Regresión API completa fuera del sandbox | **519/519 aprobadas**, cero fallos/omitidas | Incluye HTTP loopback real de fixtures y dobles SQL, no corpus DB ni UI Mobile |
| Auditoría de credencial existente | Consulta metadata real, read-only: superusuario/propietario y privilegios administrativos confirmados | Cero consultas de corpus, cero llamadas de tools/Ollama, cero escrituras. Bloquea la integración real |
| PostgreSQL/Ollama real vía MCP | **No ejecutada / bloqueada** | Falta identidad segura de lectura; no se provisionó unilateralmente |

Cobertura MCP: catálogo/orden exactos, outputs equivalentes JSON/texto, defaults, rechazo de argumentos extra/null/tipos/filtros duplicados/fechas imposibles, tools desconocidas, errores semánticos frente a protocolo, fallos saneados por tool, ausencia de perfil, revisión moderna, rechazo legacy y startup seguro. Las pruebas de lectura comprueban SQL único, puntero/release, filtro documental/version_label, cursos antes del límite, calendario Bogotá, anuncios/referencia/Unicode, progreso, hashes, retry completo y límite de dos contextos/embeddings, empates y rechazo de destinos/configuración CCD. Las pruebas de permisos usan dobles y comprueban el fallo cerrado; no certifican un rol real.

### Ensayos adversos conservados

- La primera corrida REST dentro del sandbox produjo fallos de `fetch` por conexiones `EACCES` a loopback y se interrumpió. Una reproducción focal con dos casos confirmó la restricción; no se presenta como suite aprobada. Se volvió a ejecutar fuera del sandbox con fixtures locales.
- La primera regresión completa fuera del sandbox quedó **518/519**: el refactor de progreso hacía una consulta adicional cuando faltaba perfil. Se corrigió la validación temprana compartida; la siguiente integral dio **519/519**. Log previo `tmp/m01-api-regression.log`, final `tmp/m01-api-regression-final.log`.
- La primera batería stdio quedó **7/8** porque un test esperaba `resultType` en el objeto ya normalizado por el cliente. Se corrigió el test para revisar el campo en wire y conservar la comprobación de la era moderna. Una integral posterior dio 23/23 antes de añadir el smoke de arranque; el smoke adicional pasó. La última integral incluye ambos grupos.
- Un intento de typecheck/build desde la raíz falló por no existir package raíz; las validaciones válidas se ejecutaron después desde `backend/api`. No se atribuye PASS a ese intento.

No se ejecutaron ingestas, `test:db`, infraestructura universitaria, tests Mobile, RAGAS, nuevas evaluaciones CCD, ajustes de modelo o reintentos de POST conversacional. No se reejecutaron suites de `backend/rag`, cuyo código no cambió.

## 7. Seguridad, integridad y archivos protegidos

Guardas productivas: solo loopback; rechaza nombre DB que contenga CCD, puerto CCD 55433 y modo `ccd_local`; perfil con clave estable de configuración; current sintético con dataset y `manifest.synthetic=true` en cada sentencia. La comprobación de permisos usa privilegios efectivos, no solo un flag de sesión: sin superusuario/administración/bypass, sin CREATE del schema, sin DML/TRUNCATE/REFERENCES/TRIGGER sobre tablas, sin USAGE/UPDATE de secuencias y sin EXECUTE de otras funciones SECURITY DEFINER. Las dos firmas permitidas se identifican por `regprocedure`, no solo por nombre. No se aceptan credenciales propietarias aunque la sesión esté en read-only.

La única consulta real de esta tarea se limitó a `pg_roles`/`pg_namespace` para verificar la credencial; la conexión llevaba `default_transaction_read_only=on`. Los SDK y fuentes públicas se consultaron solo para instalación/documentación. No se accedió a sitios, APIs o servidores UNAB/CCD ni a fuentes CCD externas.

Se comparó el inventario físico de 610 archivos capturado durante el preflight anterior, cuya implementación/datos se conservaron hasta la base actual. **Solo siete entradas cambiaron**, exactamente los seis helpers API compartidos y el README MCP de este alcance. Las **36 entradas de `data/synthetic` y 293 de `data/ccd` permanecieron idénticas**. Los archivos nuevos están identificados en §2. Además, el diff de Mobile, infra/SQL, contratos REST/MCP y `backend/api/src/chat` es vacío. No se consultaron filas/vectores para alegar un hash DB; la integridad acreditada es física/de código y ausencia de ejecución escritora, no una nueva auditoría PostgreSQL.

`git diff --check`, whitespace de archivos nuevos, enlaces locales y revisión final de alcance se comprobaron sin errores. No se modificó ningún original externo. No hubo borrado de datos, volúmenes, conversaciones, corpus o releases; sin commit ni push.

## 8. Pendientes para aceptar M01 y frontera M02/A01

1. Sala/operador debe proporcionar una identidad local de privilegios mínimos, con acceso exclusivamente a las superficies/tablas sintéticas y las dos funciones de lectura necesarias. Si exige crear rol, GRANT/REVOKE o cambiar permisos públicos heredados, requiere tarea autorizada separada. No entregar secretos por el chat ni reutilizar el propietario.
2. Con esa identidad, ejecutar arranque y MCP cliente-servidor real sobre dataset sintético existente: seis tools, búsqueda parcial/acento/collation, filtros previos al límite, fechas Bogotá, vacíos/perfil ausente, paridad de datos/procedencia y camino Ollama. Sin reingesta ni cambios de publicación/modelo. Confirmar también acceso mínimo a catálogos de permisos y collation existente; si falta, reportar sin crear DDL.
3. La concurrencia de publicación se probó mediante dobles; una validación de transición real necesitaría una autorización específica que permita disponer de ese escenario sin alterar las publicaciones protegidas. Esta tarea no las cambia para conseguir una prueba favorable.
4. Mantener resultados adversos y límites; decidir aceptación M01 con evidencia real pendiente. No declarar estabilidad, rendimiento, calidad generativa o autonomía a partir de tests de transporte.

M02 deberá diseñar y obtener autorización del delta de contrato y procedencia CCD cuando corresponda; no está iniciado. A01 deberá implementar el ciclo agéntico/selección de herramientas y tareas multietapa; no está iniciado. T11 conserva su estado semántico y U03/U04 sus controles, sin cambios.

**CHECKPOINT BANUCHAT — BCH-04/M01.1: implementación sintética stdio y conciliación entregadas; aceptación integral condicionada a prueba real con rol de lectura adecuado. Detenerse para revisión de Sala de Control. No iniciar M02/A01.**
